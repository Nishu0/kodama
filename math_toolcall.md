# Metering & pricing math

The numbers that the Kodama dashboard shows in the Analytics tab — and the
ones we'll eventually invoice on — all come from this document. Code in the
SDK and the web app references this file as the source of truth.

Last revised: 2026-05-16

---

## Why this file exists

We need to know, per project, how much the agent is actually doing. Two
things matter:

1. **AI-generated responses** — every time Kodama sends a message back to a
   user. This is the load-bearing "value delivered" metric.
2. **MCP tool calls** — every time the agent invokes a tool (Gmail read, X
   search, schedule reminder, etc). Tool calls are usually how the agent
   reaches into paid third-party services and is also a strong fairness
   signal for billing.

Token counts (input/output) are also worth tracking but are recorded
opaquely inside `spendLedger` via the existing `SpendTracker`. The metering
flow described here is the **public** counter the dashboard surfaces.

---

## Event shapes

The SDK emits two event kinds. Each event is a small JSON object posted in
batches to the dashboard.

### `response`

A message produced by the SDK and delivered to a Space (i.e. an
AI-generated reply or a `app.send` call from the agent loop).

```ts
type ResponseEvent = {
  kind: "response";
  ts: number;          // unix milliseconds
  platform?: string;   // "iMessage", "terminal", "telegram", …
};
```

Every successful invocation of `space.send`, `message.reply`, or
`app.send` increments this counter exactly once per outbound message item.

### `tool_call`

An MCP tool invocation, recorded via `meter.tool(name, fn)` or
`meter.recordToolCall(...)` from user code.

```ts
type ToolCallEvent = {
  kind: "tool_call";
  ts: number;
  name: string;        // tool identifier, e.g. "x_watch_user"
  durationMs: number;
  ok: boolean;         // false if the wrapped function threw
};
```

Failures still count. We measure attempted invocations, not just
successes, because most third-party APIs charge on the request.

---

## Aggregation rules

The dashboard `GET /api/v1/projects/:id/usage` returns:

```ts
type UsageSummary = {
  projectId: string;
  range: "all" | "today" | "week" | "month";
  totals: {
    responses: number;
    toolCalls: number;
    toolCallFailures: number;
  };
  perTool: Array<{ name: string; count: number; failures: number; avgMs: number }>;
  recent: Array<ResponseEvent | ToolCallEvent>; // last 20 events
  freeTier: {
    plan: "free";
    monthStartIso: string;
    responsesUsed: number;
    responsesLimit: number;
    toolCallsUsed: number;
    toolCallsLimit: number;
  };
};
```

- `range = "month"` uses the project's calendar month in UTC.
- `responsesUsed` and `toolCallsUsed` count from the first millisecond of
  the current UTC month.
- `avgMs` is a simple mean over the included tool-call durations.
- `recent` is the tail of the in-memory ring buffer, newest first.

---

## Free tier

Every project starts on the **free plan**:

| Metric         | Limit                                |
|----------------|--------------------------------------|
| Responses      | **1,000 per project per UTC month**  |
| Tool calls     | **5,000 per project per UTC month**  |

Behaviour at the limit (current implementation):

- The SDK **does not block** when over the limit. It still emits events.
- The web endpoint **does not reject** writes when over the limit.
- The dashboard surfaces a warning banner once you cross 80% of either
  limit and a hard-overage badge after 100%.

The product decision is to keep beta usage uninterrupted; pricing tiers
will turn the soft cap into a hard cap later, but the math below already
accounts for that switch.

---

## Pricing math (proposed, not enforced yet)

Three knobs we expect to ship with v1 billing:

| Plan    | Monthly fee | Included responses | Included tool calls | Overage (per response) | Overage (per tool call) |
|---------|------------:|-------------------:|--------------------:|-----------------------:|------------------------:|
| Free    |       $0    |              1,000 |               5,000 |                  n/a   |                    n/a  |
| Solo    |       $9    |             10,000 |              50,000 |               $0.0010  |                $0.0002  |
| Team    |      $29    |             50,000 |             250,000 |               $0.0008  |                $0.00018 |
| Pro     |      $99    |            250,000 |           1,500,000 |               $0.0006  |                $0.00015 |

Cost-of-goods reasoning behind the unit costs:

- A "response" represents one outbound LLM-generated message. Average
  cost of producing one with Claude Sonnet at the current OpenRouter
  pricing — ~$0.003 per response at typical Kodama prompt sizes (≈600
  input tokens, ≈300 output tokens). Charging $0.001 leaves margin for
  smaller models and bulk negotiation.
- A "tool call" represents one MCP invocation. Direct cost is dominated
  by the third-party API behind the tool (X API, Gmail quota, Twitter
  API tier). Charging $0.0002 covers a typical call and leaves headroom
  for cheap tools that we run for free internally.

These numbers live here, not in code, on purpose: we'll change them more
often than the events themselves.

---

## Storage

Current implementation (May 2026):

- Events live in an in-memory ring buffer per project on the dashboard
  process (`apps/kodama-web/src/lib/usage.ts`). The buffer holds the
  last **10,000** events per project; older ones are dropped.
- Restarts wipe usage history. This is acceptable for the beta — the
  spec is what's load-bearing, the storage is swap-able.

Planned: replace with a Convex `usageEvents` table partitioned by
`(projectId, monthBucket)` and a derived `usageRollups` table for the
month-level aggregates. The dashboard endpoint shape will not change.

---

## Implementation index

| Concern             | File                                                              |
|---------------------|-------------------------------------------------------------------|
| Event shapes        | `packages/kodoma-sdk-ts/src/metering.ts`                          |
| SDK Meter           | `packages/kodoma-sdk-ts/src/metering.ts`                          |
| Auto-instrumented send/reply | `packages/kodoma-sdk-ts/src/runtime.ts`                  |
| Web ingest          | `apps/kodama-web/src/app/api/v1/projects/[id]/usage/route.ts`     |
| Web aggregation     | `apps/kodama-web/src/lib/usage.ts`                                |
| Dashboard view      | `apps/kodama-web/src/components/project/analytics-panel.tsx`      |
| Free-tier constants | `apps/kodama-web/src/lib/usage.ts` and `metering.ts` (mirror)      |

If any of those drift from this spec, update both the file and the spec in
the same change. The numbers and event shapes here are referenced by code
comments and PRs.
