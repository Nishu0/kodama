// Backing store + aggregation for the metering events posted by the SDK.
// See `math_toolcall.md` at the repo root for the spec. Storage is an
// in-memory ring buffer per project; swap for a Convex `usageEvents` table
// when persistence is required.

import { globalSingleton } from "./global-store";

export type ResponseEvent = {
  kind: "response";
  ts: number;
  platform?: string;
};

export type ToolCallEvent = {
  kind: "tool_call";
  ts: number;
  name: string;
  durationMs: number;
  ok: boolean;
};

export type UsageEvent = ResponseEvent | ToolCallEvent;

// Free tier — numbers mirrored from math_toolcall.md.
export const FREE_TIER = {
  plan: "free" as const,
  responsesLimit: 1_000,
  toolCallsLimit: 5_000,
};

const RING_LIMIT = 10_000;
const buckets = globalSingleton(
  "kodama:usageBuckets",
  () => new Map<string, UsageEvent[]>(),
);

function bucket(projectId: string): UsageEvent[] {
  let arr = buckets.get(projectId);
  if (!arr) {
    arr = [];
    buckets.set(projectId, arr);
  }
  return arr;
}

export function appendEvents(
  projectId: string,
  events: UsageEvent[],
): { accepted: number; dropped: number } {
  const store = bucket(projectId);
  const accepted = events.length;
  let dropped = 0;
  for (const event of events) {
    store.push(event);
    if (store.length > RING_LIMIT) {
      store.shift();
      dropped += 1;
    }
  }
  return { accepted, dropped };
}

export function clearProjectUsage(projectId: string): void {
  buckets.delete(projectId);
}

export type Range = "all" | "today" | "week" | "month";

function startOfRange(now: number, range: Range): number {
  if (range === "all") return 0;
  const date = new Date(now);
  if (range === "today") {
    date.setUTCHours(0, 0, 0, 0);
    return date.getTime();
  }
  if (range === "week") {
    return now - 7 * 24 * 60 * 60 * 1000;
  }
  // month — first millisecond of current UTC month
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

export type UsageSummary = {
  projectId: string;
  range: Range;
  totals: {
    responses: number;
    toolCalls: number;
    toolCallFailures: number;
  };
  perTool: Array<{
    name: string;
    count: number;
    failures: number;
    avgMs: number;
  }>;
  recent: UsageEvent[];
  freeTier: {
    plan: "free";
    monthStartIso: string;
    responsesUsed: number;
    responsesLimit: number;
    toolCallsUsed: number;
    toolCallsLimit: number;
  };
};

export function summarizeUsage(
  projectId: string,
  options: { range?: Range; now?: number } = {},
): UsageSummary {
  const range = options.range ?? "all";
  const now = options.now ?? Date.now();
  const store = bucket(projectId);
  const since = startOfRange(now, range);
  const monthStart = startOfRange(now, "month");

  let responses = 0;
  let toolCalls = 0;
  let toolFailures = 0;
  let responsesMonth = 0;
  let toolCallsMonth = 0;
  const perTool = new Map<
    string,
    { count: number; failures: number; totalMs: number }
  >();

  for (const event of store) {
    if (event.ts >= monthStart) {
      if (event.kind === "response") responsesMonth += 1;
      else toolCallsMonth += 1;
    }
    if (event.ts < since) continue;
    if (event.kind === "response") {
      responses += 1;
    } else {
      toolCalls += 1;
      if (!event.ok) toolFailures += 1;
      const stat = perTool.get(event.name) ?? {
        count: 0,
        failures: 0,
        totalMs: 0,
      };
      stat.count += 1;
      if (!event.ok) stat.failures += 1;
      stat.totalMs += event.durationMs;
      perTool.set(event.name, stat);
    }
  }

  const recent = store.slice(-20).reverse();

  return {
    projectId,
    range,
    totals: {
      responses,
      toolCalls,
      toolCallFailures: toolFailures,
    },
    perTool: [...perTool.entries()]
      .map(([name, stat]) => ({
        name,
        count: stat.count,
        failures: stat.failures,
        avgMs: stat.count > 0 ? Math.round(stat.totalMs / stat.count) : 0,
      }))
      .sort((a, b) => b.count - a.count),
    recent,
    freeTier: {
      plan: "free",
      monthStartIso: new Date(monthStart).toISOString(),
      responsesUsed: responsesMonth,
      responsesLimit: FREE_TIER.responsesLimit,
      toolCallsUsed: toolCallsMonth,
      toolCallsLimit: FREE_TIER.toolCallsLimit,
    },
  };
}

// ─── Workspace-wide aggregation (dashboard Analytics page) ────────────────

export type WorkspaceUsageSummary = {
  range: Range;
  projects: number;
  totals: {
    responses: number;
    toolCalls: number;
    toolCallFailures: number;
  };
  perTool: Array<{ name: string; count: number; failures: number; avgMs: number }>;
  daily: Array<{ label: string; responses: number; toolCalls: number }>;
  freeTier: {
    monthStartIso: string;
    responsesUsed: number;
    responsesLimit: number;
    toolCallsUsed: number;
    toolCallsLimit: number;
  };
};

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Aggregate usage across every project into a single workspace view, plus a
// 7-day daily series for the trend chart.
export function summarizeWorkspaceUsage(
  projectIds: string[],
  options: { range?: Range; now?: number } = {},
): WorkspaceUsageSummary {
  const range = options.range ?? "week";
  const now = options.now ?? Date.now();
  const since = startOfRange(now, range);
  const monthStart = startOfRange(now, "month");

  let responses = 0;
  let toolCalls = 0;
  let toolFailures = 0;
  let responsesMonth = 0;
  let toolCallsMonth = 0;
  const perTool = new Map<string, { count: number; failures: number; totalMs: number }>();

  // 7-day daily buckets (oldest → newest), keyed by start-of-UTC-day.
  const days: Array<{ start: number; label: string; responses: number; toolCalls: number }> = [];
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i -= 1) {
    const start = todayStart.getTime() - i * 24 * 60 * 60 * 1000;
    days.push({ start, label: WEEKDAY[new Date(start).getUTCDay()]!, responses: 0, toolCalls: 0 });
  }
  const dayIndex = (ts: number): number => {
    for (let i = days.length - 1; i >= 0; i -= 1) {
      if (ts >= days[i]!.start) return i;
    }
    return -1;
  };

  for (const projectId of projectIds) {
    for (const event of bucket(projectId)) {
      if (event.ts >= monthStart) {
        if (event.kind === "response") responsesMonth += 1;
        else toolCallsMonth += 1;
      }
      const di = dayIndex(event.ts);
      if (di >= 0) {
        if (event.kind === "response") days[di]!.responses += 1;
        else days[di]!.toolCalls += 1;
      }
      if (event.ts < since) continue;
      if (event.kind === "response") {
        responses += 1;
      } else {
        toolCalls += 1;
        if (!event.ok) toolFailures += 1;
        const stat = perTool.get(event.name) ?? { count: 0, failures: 0, totalMs: 0 };
        stat.count += 1;
        if (!event.ok) stat.failures += 1;
        stat.totalMs += event.durationMs;
        perTool.set(event.name, stat);
      }
    }
  }

  return {
    range,
    projects: projectIds.length,
    totals: { responses, toolCalls, toolCallFailures: toolFailures },
    perTool: [...perTool.entries()]
      .map(([name, stat]) => ({
        name,
        count: stat.count,
        failures: stat.failures,
        avgMs: stat.count > 0 ? Math.round(stat.totalMs / stat.count) : 0,
      }))
      .sort((a, b) => b.count - a.count),
    daily: days.map((d) => ({ label: d.label, responses: d.responses, toolCalls: d.toolCalls })),
    freeTier: {
      monthStartIso: new Date(monthStart).toISOString(),
      responsesUsed: responsesMonth,
      responsesLimit: FREE_TIER.responsesLimit,
      toolCallsUsed: toolCallsMonth,
      toolCallsLimit: FREE_TIER.toolCallsLimit,
    },
  };
}

// Allow the dashboard to seed usage during local dev so the Analytics tab
// renders something meaningful before the SDK has reported anything.
export function seedDemoUsage(projectId: string, now: number = Date.now()): void {
  if (bucket(projectId).length > 0) return;
  const events: UsageEvent[] = [];
  for (let i = 0; i < 240; i += 1) {
    const ts = now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000);
    events.push({ kind: "response", ts, platform: "iMessage" });
  }
  const tools = [
    "snapshot",
    "log_journal",
    "add_task",
    "schedule_reminder",
    "x_watch_user",
    "x_digest_now",
  ];
  for (let i = 0; i < 420; i += 1) {
    const ts = now - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000);
    const name = tools[i % tools.length]!;
    events.push({
      kind: "tool_call",
      ts,
      name,
      durationMs: 80 + Math.floor(Math.random() * 480),
      ok: Math.random() > 0.05,
    });
  }
  events.sort((a, b) => a.ts - b.ts);
  appendEvents(projectId, events);
}
