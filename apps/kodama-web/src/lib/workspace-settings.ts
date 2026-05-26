// Workspace settings singleton. Dual backend — Convex `workspaceSettings`
// functions when CONVEX_URL is set, in-memory otherwise.
//
// The OpenRouter API key is user-provided (each workspace pastes their own) and
// is stored encrypted at rest in Convex. It is NEVER returned to the client —
// the public view only exposes whether a key is set and a masked hint.

import { getConvex } from "./convex-client";
import { decrypt, encrypt } from "./encryption";
import { globalSingleton } from "./global-store";
import {
  DEFAULT_OPENROUTER_MODEL,
  type Notifications,
  type WorkspaceSettings,
} from "./workspace-settings-shared";

// Re-export the client-safe surface so existing server-side imports of
// `@/lib/workspace-settings` keep working.
export type { Notifications, WorkspaceSettings };
export { OPENROUTER_MODEL_PRESETS } from "./workspace-settings-shared";

const DEFAULTS: WorkspaceSettings = {
  name: "Kodama",
  openRouterModel: DEFAULT_OPENROUTER_MODEL,
  notifications: "important",
  supportEmail: "itsnisargthakkar@gmail.com",
  openRouterKeySet: false,
};

type MemoryRow = {
  name: string;
  openRouterModel: string;
  notifications: Notifications;
  supportEmail?: string;
  openRouterKey?: string; // plaintext in the in-memory fallback only
  updatedAt?: number;
  updatedBy?: string;
};

type ConvexRow = {
  _id: string;
  name: string;
  openRouterModel: string;
  notifications: Notifications;
  supportEmail?: string;
  openRouterKeyCt?: string;
  updatedAt?: number;
  updatedBy?: string;
};

const _ws = globalSingleton("kodama:workspaceSettings", () => ({
  row: null as MemoryRow | null,
}));

function maskKey(key: string): string {
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

export type SaveSettingsInput = {
  name: string;
  openRouterModel: string;
  notifications: Notifications;
  supportEmail?: string;
  openRouterKey?: string; // set/replace when non-empty
  clearOpenRouterKey?: boolean;
};

export async function getWorkspaceSettings(): Promise<WorkspaceSettings> {
  const client = getConvex();
  if (!client) {
    const row = _ws.row;
    if (!row) return DEFAULTS;
    return {
      name: row.name,
      openRouterModel: row.openRouterModel,
      notifications: row.notifications,
      supportEmail: row.supportEmail,
      openRouterKeySet: Boolean(row.openRouterKey),
      openRouterKeyHint: row.openRouterKey ? maskKey(row.openRouterKey) : undefined,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
  }
  const row = (await client.query(
    "workspaceSettings:get" as never,
    { key: "default" } as never,
  )) as ConvexRow | null;
  if (!row) return DEFAULTS;
  let hint: string | undefined;
  if (row.openRouterKeyCt) {
    try {
      hint = maskKey(decrypt(row.openRouterKeyCt));
    } catch {
      hint = "••••";
    }
  }
  return {
    name: row.name,
    openRouterModel: row.openRouterModel,
    notifications: row.notifications,
    supportEmail: row.supportEmail,
    openRouterKeySet: Boolean(row.openRouterKeyCt),
    openRouterKeyHint: hint,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export async function saveWorkspaceSettings(
  input: SaveSettingsInput,
  updatedBy?: string,
): Promise<void> {
  const client = getConvex();
  const newKey = input.openRouterKey?.trim();

  if (!client) {
    const prev = _ws.row;
    let key = prev?.openRouterKey;
    if (input.clearOpenRouterKey) key = undefined;
    else if (newKey) key = newKey;
    _ws.row = {
      name: input.name,
      openRouterModel: input.openRouterModel,
      notifications: input.notifications,
      supportEmail: input.supportEmail,
      openRouterKey: key,
      updatedAt: Date.now(),
      updatedBy,
    };
    return;
  }

  await client.mutation("workspaceSettings:upsert" as never, {
    key: "default",
    name: input.name,
    openRouterModel: input.openRouterModel,
    notifications: input.notifications,
    supportEmail: input.supportEmail,
    openRouterKeyCt: newKey ? encrypt(newKey) : undefined,
    clearKey: input.clearOpenRouterKey ?? false,
    updatedBy,
  } as never);
}
