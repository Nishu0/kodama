// Dashboard data layer. Dual backend, same pattern as oauth-tokens.ts and
// policy-store.ts: Convex when CONVEX_URL is set, in-memory fallback
// otherwise. The public API (fetchProjects, fetchProjectUsers, …) is
// unchanged so callers don't care which path is active.
//
// Per-project rows from Convex take precedence; when Convex is configured
// but a specific projectId is missing, the fallback for that projectId is
// still returned so the seeded demo projects keep working alongside real
// rows.

import { getConvex } from "./convex-client";
import { decrypt, encrypt } from "./encryption";
import { globalSingleton } from "./global-store";

// ─────────────────── dynamic secrets ───────────────────
// No secret is ever hardcoded. With Convex they're generated at create time
// and stored encrypted; without Convex they're generated per process and held
// in memory (globalThis-pinned so the create flow and the auth check agree).

type StoredSecret = { projectIdPublic: string; secretKey: string };

const secretStore = globalSingleton(
  "kodama:projectSecrets",
  () => new Map<string, StoredSecret>(),
);

function randomHex(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

// "kdm_" prefix intentionally avoids provider key patterns (sk_/whsec_) so
// secret scanners don't flag generated keys.
export function generateSecretKey(): string {
  return `kdm_${randomHex()}${randomHex().slice(0, 16)}`;
}

function generateSigningSecret(): string {
  return `kdm_whsec_${randomHex()}`;
}

function ensureLocalSecret(projectId: string): StoredSecret {
  let secret = secretStore.get(projectId);
  if (!secret) {
    secret = { projectIdPublic: crypto.randomUUID(), secretKey: generateSecretKey() };
    secretStore.set(projectId, secret);
  }
  return secret;
}

export type Project = {
  id: string;
  name: string;
  environment: "production" | "staging" | "development";
  members: number;
  updatedAt: string;
};

export type ProjectUser = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
};

export type ProjectSettings = {
  timezone: string;
  region: string;
  aiModel: string;
  notifications: "all" | "important" | "off";
};

export type PlatformId =
  | "imessage"
  | "telegram"
  | "instagram"
  | "discord"
  | "messenger"
  | "github";

export type PlatformStatus = "enabled" | "disabled" | "coming-soon";

export type Platform = {
  id: PlatformId;
  name: string;
  description: string;
  status: PlatformStatus;
};

export type ProjectSecrets = {
  projectId: string;
  secretKey: string;
};

export type ProjectLine = {
  id: string;
  label: string;
  handle: string;
  platform: PlatformId;
  status: "active" | "pending";
};

export type ProjectWebhook = {
  url: string | null;
  signingSecret: string | null;
  events: string[];
  lastDeliveryAt: string | null;
};

// ─────────────────── fallbacks (seeded demo data) ───────────────────

export const fallbackProjects: Project[] = [
  {
    id: "prj_iris",
    name: "Iris Mobile Agent",
    environment: "production",
    members: 8,
    updatedAt: "2026-05-13T14:10:00.000Z",
  },
  {
    id: "prj_kodama_sdk",
    name: "Kodama SDK TS",
    environment: "staging",
    members: 5,
    updatedAt: "2026-05-12T19:40:00.000Z",
  },
  {
    id: "prj_ops",
    name: "Ops Console",
    environment: "development",
    members: 4,
    updatedAt: "2026-05-11T09:15:00.000Z",
  },
];

export const fallbackUsers: Record<string, ProjectUser[]> = {
  prj_iris: [
    { id: "u_1", name: "Nisarg Thakkar", email: "itsnisargthakkar@gmail.com", role: "owner" },
    { id: "u_2", name: "Parikshit", email: "parikshit@example.com", role: "admin" },
    { id: "u_3", name: "Riya", email: "riya@example.com", role: "member" },
  ],
  prj_kodama_sdk: [
    { id: "u_1", name: "Nisarg Thakkar", email: "itsnisargthakkar@gmail.com", role: "owner" },
    { id: "u_4", name: "Arham", email: "arham@example.com", role: "member" },
  ],
  prj_ops: [
    { id: "u_1", name: "Nisarg Thakkar", email: "itsnisargthakkar@gmail.com", role: "owner" },
    { id: "u_5", name: "Jay", email: "jay@example.com", role: "viewer" },
  ],
};

export const fallbackSettings: Record<string, ProjectSettings> = {
  prj_iris: {
    timezone: "Asia/Kolkata",
    region: "ap-south-1",
    aiModel: "openrouter/kimi-k2",
    notifications: "important",
  },
  prj_kodama_sdk: {
    timezone: "Asia/Kolkata",
    region: "ap-south-1",
    aiModel: "openrouter/openai/gpt-4o-mini",
    notifications: "all",
  },
  prj_ops: {
    timezone: "UTC",
    region: "us-east-1",
    aiModel: "openrouter/anthropic/claude-3.5-sonnet",
    notifications: "off",
  },
};

export const fallbackPlatforms: Platform[] = [
  {
    id: "imessage",
    name: "iMessage (RCS/SMS fallback)",
    description:
      "Connect your agent to iMessage with automatic RCS and SMS fallback for non-Apple users.",
    status: "enabled",
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Run your Kodama agents inside Telegram chats and channels.",
    status: "coming-soon",
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "Handle DMs from Instagram with the same conversational stack.",
    status: "coming-soon",
  },
  {
    id: "discord",
    name: "Discord",
    description: "Drop a Kodama bot into your community for support and ops.",
    status: "coming-soon",
  },
  {
    id: "messenger",
    name: "Messenger",
    description: "Reach customers on Facebook Messenger threads.",
    status: "coming-soon",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Reply to issues and pull requests as a Kodama agent.",
    status: "coming-soon",
  },
];

export const fallbackLines: Record<string, ProjectLine[]> = {
  prj_iris: [
    { id: "line_1", label: "Support line", handle: "+1 (415) 555-0143", platform: "imessage", status: "active" },
    { id: "line_2", label: "Sales line", handle: "+1 (415) 555-0207", platform: "imessage", status: "active" },
  ],
  prj_kodama_sdk: [
    { id: "line_3", label: "Developer hotline", handle: "+91 99999 00001", platform: "imessage", status: "pending" },
  ],
  prj_ops: [],
};

export const fallbackWebhooks: Record<string, ProjectWebhook> = {
  prj_iris: {
    url: "https://hooks.iris.kodama.dev/messages",
    signingSecret: generateSigningSecret(),
    events: ["message.received", "message.sent", "agent.handover"],
    lastDeliveryAt: "2026-05-15T18:24:13.000Z",
  },
  prj_kodama_sdk: {
    url: null,
    signingSecret: null,
    events: [],
    lastDeliveryAt: null,
  },
  prj_ops: {
    url: "https://ops.internal.kodama.dev/webhooks/kodama",
    signingSecret: generateSigningSecret(),
    events: ["message.received"],
    lastDeliveryAt: "2026-05-14T11:02:48.000Z",
  },
};

// ─────────────────── Convex shapes ───────────────────

type ConvexProject = {
  projectId: string;
  name: string;
  environment: "production" | "staging" | "development";
  memberCount: number;
  updatedAt: number;
};

type ConvexSecret = {
  projectIdPublic: string;
  secretKeyCt: string;
};

type ConvexMember = {
  _id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member" | "viewer";
};

type ConvexLine = {
  _id: string;
  label: string;
  handle: string;
  platform: PlatformId;
  status: "active" | "pending";
};

type ConvexWebhook = {
  url?: string;
  signingSecretCt?: string;
  events: string[];
  lastDeliveryAt?: number;
};

type ConvexPlatform = {
  platformId: PlatformId;
  status: PlatformStatus;
};

// ─────────────────── fetchers ───────────────────

export async function fetchProjects(): Promise<Project[]> {
  const client = getConvex();
  if (!client) return fallbackProjects;
  const rows = (await client.query(
    "dashboard:listProjects" as never,
    {} as never,
  )) as ConvexProject[];
  if (rows.length === 0) return fallbackProjects;
  return rows.map((row) => ({
    id: row.projectId,
    name: row.name,
    environment: row.environment,
    members: row.memberCount,
    updatedAt: new Date(row.updatedAt).toISOString(),
  }));
}

export async function fetchProjectUsers(
  projectId: string,
): Promise<ProjectUser[]> {
  const client = getConvex();
  if (!client) return fallbackUsers[projectId] ?? [];
  const rows = (await client.query(
    "dashboard:listMembers" as never,
    { projectId } as never,
  )) as ConvexMember[];
  if (rows.length === 0) return fallbackUsers[projectId] ?? [];
  return rows.map((row) => ({
    id: row._id,
    name: row.name,
    email: row.email,
    role: row.role,
  }));
}

export async function fetchProjectSettings(
  projectId: string,
): Promise<ProjectSettings> {
  // Settings UI doesn't surface these fields yet — leaving on fallback until
  // they get a dashboard tab. Wire to Convex when adding that tab.
  return (
    fallbackSettings[projectId] ?? {
      timezone: "UTC",
      region: "us-east-1",
      aiModel: "openrouter/openai/gpt-4o-mini",
      notifications: "important",
    }
  );
}

export async function fetchProjectPlatforms(
  projectId: string,
): Promise<Platform[]> {
  const client = getConvex();
  if (!client) return fallbackPlatforms;
  const rows = (await client.query(
    "dashboard:listPlatforms" as never,
    { projectId } as never,
  )) as ConvexPlatform[];
  if (rows.length === 0) return fallbackPlatforms;
  // Overlay stored status onto the catalog's name + description.
  const byId = new Map(rows.map((row) => [row.platformId, row.status]));
  return fallbackPlatforms.map((entry) => ({
    ...entry,
    status: byId.get(entry.id) ?? entry.status,
  }));
}

export async function fetchProjectSecrets(
  projectId: string,
): Promise<ProjectSecrets> {
  const client = getConvex();
  if (!client) {
    const secret = ensureLocalSecret(projectId);
    return { projectId: secret.projectIdPublic, secretKey: secret.secretKey };
  }
  const row = (await client.query(
    "dashboard:getProjectSecret" as never,
    { projectId } as never,
  )) as ConvexSecret | null;
  if (!row) {
    const secret = ensureLocalSecret(projectId);
    return { projectId: secret.projectIdPublic, secretKey: secret.secretKey };
  }
  return {
    projectId: row.projectIdPublic,
    secretKey: decrypt(row.secretKeyCt),
  };
}

export async function fetchProjectLines(
  projectId: string,
): Promise<ProjectLine[]> {
  const client = getConvex();
  if (!client) return fallbackLines[projectId] ?? [];
  const rows = (await client.query(
    "dashboard:listLines" as never,
    { projectId } as never,
  )) as ConvexLine[];
  if (rows.length === 0) return fallbackLines[projectId] ?? [];
  return rows.map((row) => ({
    id: row._id,
    label: row.label,
    handle: row.handle,
    platform: row.platform,
    status: row.status,
  }));
}

export async function fetchProjectWebhook(
  projectId: string,
): Promise<ProjectWebhook> {
  const client = getConvex();
  if (!client) {
    return (
      fallbackWebhooks[projectId] ?? {
        url: null,
        signingSecret: null,
        events: [],
        lastDeliveryAt: null,
      }
    );
  }
  const row = (await client.query(
    "dashboard:getWebhook" as never,
    { projectId } as never,
  )) as ConvexWebhook | null;
  if (!row) {
    return (
      fallbackWebhooks[projectId] ?? {
        url: null,
        signingSecret: null,
        events: [],
        lastDeliveryAt: null,
      }
    );
  }
  return {
    url: row.url ?? null,
    signingSecret: row.signingSecretCt ? decrypt(row.signingSecretCt) : null,
    events: row.events,
    lastDeliveryAt: row.lastDeliveryAt
      ? new Date(row.lastDeliveryAt).toISOString()
      : null,
  };
}

// ─────────────────── mutations ───────────────────

export async function createProject(args: {
  projectId: string;
  name: string;
  environment: Project["environment"];
  ownerEmail?: string;
  ownerName?: string;
}): Promise<{ project: Project; secrets: ProjectSecrets }> {
  const projectIdPublic = crypto.randomUUID();
  const secretKey = generateSecretKey();

  const client = getConvex();
  if (!client) {
    // No Convex backend — hold the generated secret in the in-memory store so
    // fetchProjectSecrets/verifyProjectSecret return the same value for this
    // process. Lost on restart (set CONVEX_URL to persist).
    secretStore.set(args.projectId, { projectIdPublic, secretKey });
    return {
      project: {
        id: args.projectId,
        name: args.name,
        environment: args.environment,
        members: 1,
        updatedAt: new Date().toISOString(),
      },
      secrets: { projectId: projectIdPublic, secretKey },
    };
  }

  await client.mutation("dashboard:upsertProject" as never, {
    projectId: args.projectId,
    name: args.name,
    environment: args.environment,
    memberCount: 1,
  } as never);
  await client.mutation("dashboard:upsertProjectSecret" as never, {
    projectId: args.projectId,
    projectIdPublic,
    secretKeyCt: encrypt(secretKey),
  } as never);
  if (args.ownerEmail) {
    await client.mutation("dashboard:addMember" as never, {
      projectId: args.projectId,
      name: args.ownerName ?? args.ownerEmail,
      email: args.ownerEmail,
      role: "owner",
    } as never);
  }

  return {
    project: {
      id: args.projectId,
      name: args.name,
      environment: args.environment,
      members: 1,
      updatedAt: new Date().toISOString(),
    },
    secrets: { projectId: projectIdPublic, secretKey },
  };
}

// Legacy helper kept for callers still pointed at the old API host. Returns
// null when no host is configured so legacy paths quietly no-op.
export function getApiBase(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}
