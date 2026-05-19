// OAuth token store. Dual backend:
//   • Convex `oauthTokens` table when CONVEX_URL is set — encrypted at rest
//     via AES-256-GCM (see lib/encryption.ts).
//   • In-memory `Map` otherwise — same shape, lost on restart.
//
// All functions are async. Callers must `await`.

import type { ConnectorId, ConnectorState } from "./runtime-config";
import { getConvex } from "./convex-client";
import { decrypt, encrypt } from "./encryption";
import { globalSingleton } from "./global-store";

export type StoredToken = {
  projectId: string;
  connector: ConnectorId;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  scopes: string[];
  connectedAt: string;
  profile: {
    id: string;
    label: string | null;
  } | null;
  extra: Record<string, unknown>;
};

type Key = `${string}::${ConnectorId}`;

// In-memory fallback when Convex isn't configured. Pinned to globalThis so a
// token saved by the OAuth callback route is visible to the page that reads it
// (separate bundles otherwise get separate Maps). Process-lifetime only.
const memoryStore = globalSingleton(
  "kodama:oauthTokens",
  () => new Map<Key, StoredToken>(),
);

function keyOf(projectId: string, connector: ConnectorId): Key {
  return `${projectId}::${connector}`;
}

type ConvexRow = {
  projectId: string;
  connector: ConnectorId;
  accessTokenCt: string;
  refreshTokenCt?: string;
  expiresAt?: number;
  scopes: string[];
  status: "connected" | "expired" | "disconnected";
  profile?: { id: string; label?: string };
  extra?: Record<string, unknown>;
  connectedAt: string;
  updatedAt: number;
};

function rowToToken(row: ConvexRow): StoredToken {
  return {
    projectId: row.projectId,
    connector: row.connector,
    accessToken: decrypt(row.accessTokenCt),
    refreshToken: row.refreshTokenCt ? decrypt(row.refreshTokenCt) : null,
    expiresAt: row.expiresAt ?? null,
    scopes: row.scopes,
    connectedAt: row.connectedAt,
    profile: row.profile
      ? { id: row.profile.id, label: row.profile.label ?? null }
      : null,
    extra: row.extra ?? {},
  };
}

export async function saveToken(token: StoredToken): Promise<void> {
  const client = getConvex();
  if (!client) {
    memoryStore.set(keyOf(token.projectId, token.connector), token);
    return;
  }
  await client.mutation("oauthTokens:upsert" as never, {
    projectId: token.projectId,
    connector: token.connector,
    accessTokenCt: encrypt(token.accessToken),
    refreshTokenCt: token.refreshToken ? encrypt(token.refreshToken) : undefined,
    expiresAt: token.expiresAt ?? undefined,
    scopes: token.scopes,
    status: "connected",
    profile: token.profile
      ? { id: token.profile.id, label: token.profile.label ?? undefined }
      : undefined,
    extra: token.extra,
    connectedAt: token.connectedAt,
  } as never);
}

export async function getToken(
  projectId: string,
  connector: ConnectorId,
): Promise<StoredToken | null> {
  const client = getConvex();
  if (!client) {
    return memoryStore.get(keyOf(projectId, connector)) ?? null;
  }
  const row = (await client.query(
    "oauthTokens:getByProjectConnector" as never,
    { projectId, connector } as never,
  )) as ConvexRow | null;
  if (!row) return null;
  return rowToToken(row);
}

export async function clearToken(
  projectId: string,
  connector: ConnectorId,
): Promise<boolean> {
  const client = getConvex();
  if (!client) {
    return memoryStore.delete(keyOf(projectId, connector));
  }
  return (await client.mutation("oauthTokens:remove" as never, {
    projectId,
    connector,
  } as never)) as boolean;
}

export async function listConnectorStates(
  projectId: string,
): Promise<Partial<Record<ConnectorId, ConnectorState>>> {
  const out: Partial<Record<ConnectorId, ConnectorState>> = {};
  const client = getConvex();
  if (!client) {
    for (const [, token] of memoryStore) {
      if (token.projectId !== projectId) continue;
      const expired =
        token.expiresAt != null &&
        token.expiresAt < Date.now() &&
        !token.refreshToken;
      out[token.connector] = {
        status: expired ? "expired" : "connected",
        connectedAt: token.connectedAt,
        scopes: token.scopes,
      };
    }
    return out;
  }
  const rows = (await client.query(
    "oauthTokens:listByProject" as never,
    { projectId } as never,
  )) as ConvexRow[];
  for (const row of rows) {
    const expired =
      row.expiresAt != null &&
      row.expiresAt < Date.now() &&
      !row.refreshTokenCt;
    out[row.connector] = {
      status: expired ? "expired" : row.status,
      connectedAt: row.connectedAt,
      scopes: row.scopes,
    };
  }
  return out;
}
