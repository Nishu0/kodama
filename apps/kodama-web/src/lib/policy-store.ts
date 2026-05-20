// Per-project privacy-policy override store. Dual backend, same pattern as
// oauth-tokens.ts: Convex when CONVEX_URL is set, in-memory Map otherwise.
//
// Empty / null override = use the defaults from fallbackRuntimeConfigs.

import type { PrivacyPolicy } from "./runtime-config";
import { getConvex } from "./convex-client";
import { globalSingleton } from "./global-store";

const memoryStore = globalSingleton(
  "kodama:policyStore",
  () => new Map<string, PrivacyPolicy>(),
);

type ConvexRow = PrivacyPolicy & {
  projectId: string;
  updatedAt: number;
  updatedBy?: string;
};

export async function getPolicyOverride(
  projectId: string,
): Promise<PrivacyPolicy | null> {
  const client = getConvex();
  if (!client) {
    return memoryStore.get(projectId) ?? null;
  }
  const row = (await client.query(
    "runtimePolicies:get" as never,
    { projectId } as never,
  )) as ConvexRow | null;
  if (!row) return null;
  return { gmail: row.gmail, telegram: row.telegram, x: row.x };
}

export async function savePolicyOverride(
  projectId: string,
  policy: PrivacyPolicy,
  updatedBy?: string,
): Promise<void> {
  const client = getConvex();
  if (!client) {
    memoryStore.set(projectId, policy);
    return;
  }
  await client.mutation("runtimePolicies:upsert" as never, {
    projectId,
    gmail: policy.gmail,
    telegram: policy.telegram,
    x: policy.x,
    updatedBy
  } as never);
}

export async function clearPolicyOverride(projectId: string): Promise<boolean> {
  const client = getConvex();
  if (!client) {
    return memoryStore.delete(projectId);
  }
  return (await client.mutation("runtimePolicies:clear" as never, {
    projectId
  } as never)) as boolean;
}
