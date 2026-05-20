// Per-project enabled-tools override store. Dual backend — same pattern
// as policy-store.ts and oauth-tokens.ts.
//
// Empty / null override = use defaults from fallbackRuntimeConfigs[id].enabledTools.

import { getConvex } from "./convex-client";
import { globalSingleton } from "./global-store";

const memoryStore = globalSingleton(
  "kodama:enabledToolsStore",
  () => new Map<string, string[]>(),
);

type ConvexRow = {
  projectId: string;
  tools: string[];
  updatedAt: number;
  updatedBy?: string;
};

export async function getEnabledToolsOverride(
  projectId: string,
): Promise<string[] | null> {
  const client = getConvex();
  if (!client) {
    return memoryStore.get(projectId) ?? null;
  }
  const row = (await client.query(
    "enabledTools:get" as never,
    { projectId } as never,
  )) as ConvexRow | null;
  if (!row) return null;
  return row.tools;
}

export async function saveEnabledToolsOverride(
  projectId: string,
  tools: string[],
  updatedBy?: string,
): Promise<void> {
  const client = getConvex();
  if (!client) {
    memoryStore.set(projectId, tools);
    return;
  }
  await client.mutation("enabledTools:upsert" as never, {
    projectId,
    tools,
    updatedBy
  } as never);
}

export async function clearEnabledToolsOverride(
  projectId: string,
): Promise<boolean> {
  const client = getConvex();
  if (!client) {
    return memoryStore.delete(projectId);
  }
  return (await client.mutation("enabledTools:clear" as never, {
    projectId
  } as never)) as boolean;
}
