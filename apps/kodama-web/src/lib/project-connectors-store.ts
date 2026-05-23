// Per-project connector enablement store. Dual backend — same pattern as
// enabled-tools-store.ts and policy-store.ts.
//
// Stores the set of connector ids a project is allowed to use. The connections
// themselves are global (see oauth-tokens.ts under GLOBAL_SCOPE); this only
// records the per-project on/off toggle.
//
// null override = fall back to the project's default enabled set (see
// getProjectEnabledConnectors in runtime-config.ts).

import { getConvex } from "./convex-client";
import { globalSingleton } from "./global-store";

const memoryStore = globalSingleton(
  "kodama:projectConnectorsStore",
  () => new Map<string, string[]>(),
);

type ConvexRow = {
  projectId: string;
  connectors: string[];
  updatedAt: number;
  updatedBy?: string;
};

export async function getProjectConnectorsOverride(
  projectId: string,
): Promise<string[] | null> {
  const client = getConvex();
  if (!client) {
    return memoryStore.get(projectId) ?? null;
  }
  const row = (await client.query(
    "projectConnectors:get" as never,
    { projectId } as never,
  )) as ConvexRow | null;
  if (!row) return null;
  return row.connectors;
}

export async function saveProjectConnectorsOverride(
  projectId: string,
  connectors: string[],
  updatedBy?: string,
): Promise<void> {
  const client = getConvex();
  if (!client) {
    memoryStore.set(projectId, connectors);
    return;
  }
  await client.mutation("projectConnectors:upsert" as never, {
    projectId,
    connectors,
    updatedBy,
  } as never);
}

export async function clearProjectConnectorsOverride(
  projectId: string,
): Promise<boolean> {
  const client = getConvex();
  if (!client) {
    return memoryStore.delete(projectId);
  }
  return (await client.mutation("projectConnectors:clear" as never, {
    projectId,
  } as never)) as boolean;
}
