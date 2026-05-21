// Read-only wrapper around the daemon's observability tables in Convex:
//   agentRuns, toolCalls, serviceUsage, spendLedger.
//
// These tables are scoped by the operator's Kodama userId (the iMessage
// handle), not by project id — they describe daemon activity. The
// dashboard's Observability panel exposes them through this lib.
//
// When CONVEX_URL is unset (local dev without Convex), every helper
// returns empty arrays and the UI degrades to its no-data state.

import { getConvex } from "./convex-client";

const DAY_MS = 24 * 60 * 60 * 1000;

export type AgentRun = {
  _id: string;
  userId: string;
  agentName: string;
  status: "running" | "success" | "error" | "aborted";
  model?: string;
  startedAt: number;
  finishedAt?: number;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
    totalDurationMs: number;
  };
  resultText?: string;
  error?: string;
};

export type ToolCall = {
  _id: string;
  runId: string;
  userId: string;
  agentName?: string;
  toolName: string;
  service?: string;
  status: "success" | "error";
  durationMs?: number;
  error?: string;
  at: number;
};

export type ServiceCall = {
  _id: string;
  userId: string;
  runId?: string;
  agentName: string;
  service: string;
  toolName?: string;
  status: "active" | "finished" | "error";
  startedAt: number;
  finishedAt?: number;
  durationMs?: number;
  error?: string;
};

export type SpendRow = {
  _id: string;
  runId: string;
  userId?: string;
  agentName: string;
  model?: string;
  inputTokens: number;
  outputTokens: number;
  usd: number;
  at: number;
};

export type ObservabilitySummary = {
  userId: string;
  hasBackend: boolean;
  totals: {
    runs24h: number;
    runsErrored24h: number;
    activeServices: number;
    toolCalls24h: number;
    toolCallFailures24h: number;
    spendUsd7d: number;
  };
  activeServices: ServiceCall[];
  recentRuns: AgentRun[];
  recentToolCalls: ToolCall[];
  spendByAgent: Array<{ agentName: string; usd: number; runs: number }>;
};

function empty(userId: string, hasBackend: boolean): ObservabilitySummary {
  return {
    userId,
    hasBackend,
    totals: {
      runs24h: 0,
      runsErrored24h: 0,
      activeServices: 0,
      toolCalls24h: 0,
      toolCallFailures24h: 0,
      spendUsd7d: 0,
    },
    activeServices: [],
    recentRuns: [],
    recentToolCalls: [],
    spendByAgent: [],
  };
}

export async function getObservability(
  userId: string,
  options: { runsLimit?: number; toolsLimit?: number; now?: number } = {},
): Promise<ObservabilitySummary> {
  const client = getConvex();
  if (!client) return empty(userId, false);
  if (!userId) return empty(userId, true);

  const now = options.now ?? Date.now();
  const runsLimit = options.runsLimit ?? 20;
  const toolsLimit = options.toolsLimit ?? 50;

  const [runs, tools, active, recentService, spend] = await Promise.all([
    client.query("agentRuns:listForUser" as never, {
      userId,
      limit: 100,
    } as never) as Promise<AgentRun[]>,
    client.query("toolCallsLog:recentForUser" as never, {
      userId,
      limit: 200,
    } as never) as Promise<ToolCall[]>,
    client.query("serviceUsage:listActive" as never, {
      userId,
      limit: 50,
    } as never) as Promise<ServiceCall[]>,
    client.query("serviceUsage:listRecent" as never, {
      userId,
      limit: 50,
    } as never) as Promise<ServiceCall[]>,
    client.query("spendLedger:listForUser" as never, {
      userId,
      limit: 500,
    } as never) as Promise<SpendRow[]>,
  ]);

  const oneDayAgo = now - DAY_MS;
  const sevenDaysAgo = now - 7 * DAY_MS;

  const runs24h = runs.filter((r) => r.startedAt >= oneDayAgo);
  const runsErrored24h = runs24h.filter((r) => r.status === "error").length;
  const tools24h = tools.filter((t) => t.at >= oneDayAgo);
  const toolFailures24h = tools24h.filter((t) => t.status === "error").length;
  const spend7d = spend.filter((s) => s.at >= sevenDaysAgo);
  const spendUsd7d = spend7d.reduce((acc, row) => acc + row.usd, 0);

  const perAgent = new Map<string, { usd: number; runs: number }>();
  for (const row of spend7d) {
    const slot = perAgent.get(row.agentName) ?? { usd: 0, runs: 0 };
    slot.usd += row.usd;
    perAgent.set(row.agentName, slot);
  }
  for (const run of runs24h) {
    const slot = perAgent.get(run.agentName) ?? { usd: 0, runs: 0 };
    slot.runs += 1;
    perAgent.set(run.agentName, slot);
  }
  const spendByAgent = [...perAgent.entries()]
    .map(([agentName, value]) => ({ agentName, usd: value.usd, runs: value.runs }))
    .sort((a, b) => b.usd - a.usd);

  return {
    userId,
    hasBackend: true,
    totals: {
      runs24h: runs24h.length,
      runsErrored24h,
      activeServices: active.length,
      toolCalls24h: tools24h.length,
      toolCallFailures24h: toolFailures24h,
      spendUsd7d,
    },
    activeServices: active,
    recentRuns: runs.slice(0, runsLimit),
    recentToolCalls: tools.slice(0, toolsLimit),
    spendByAgent,
  };
  void recentService; // present in case the UI wants timeline view later
}
