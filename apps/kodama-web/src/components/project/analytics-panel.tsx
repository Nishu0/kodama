"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UsageSummary } from "@/lib/usage";
import { cn } from "@/lib/utils";

const RANGES: { key: UsageSummary["range"]; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "7 days" },
  { key: "month", label: "Month" },
  { key: "all", label: "All time" },
];

export function AnalyticsPanel({ projectId }: { projectId: string }) {
  const [range, setRange] = React.useState<UsageSummary["range"]>("week");
  const [data, setData] = React.useState<UsageSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(
        `/api/v1/projects/${encodeURIComponent(projectId)}/usage?range=${range}`,
        { cache: "no-store" },
      );
      if (!resp.ok) {
        setError(`request failed (${resp.status})`);
        return;
      }
      const json = (await resp.json()) as UsageSummary;
      setData(json);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId, range]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-md border border-border bg-muted p-0.5 text-xs">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={cn(
                "rounded px-2.5 py-1 font-medium transition",
                range === r.key
                  ? "bg-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {data ? <UsageBody summary={data} /> : null}
    </div>
  );
}

function UsageBody({ summary }: { summary: UsageSummary }) {
  const responsePct = clampPct(
    summary.freeTier.responsesUsed / summary.freeTier.responsesLimit,
  );
  const toolPct = clampPct(
    summary.freeTier.toolCallsUsed / summary.freeTier.toolCallsLimit,
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="AI responses"
          value={summary.totals.responses.toLocaleString()}
          hint={`${summary.range === "all" ? "all time" : `range: ${summary.range}`}`}
        />
        <StatCard
          label="Tool calls"
          value={summary.totals.toolCalls.toLocaleString()}
          hint={`${summary.totals.toolCallFailures} failed`}
        />
        <StatCard
          label="Plan"
          value={summary.freeTier.plan.toUpperCase()}
          hint={`Month started ${formatDate(summary.freeTier.monthStartIso)}`}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Free tier — this month</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              All beta projects are on the free plan. Caps reset on the 1st of
              every UTC month.
            </p>
          </div>
          {(responsePct >= 1 || toolPct >= 1) ? (
            <Badge variant="warning">Over included</Badge>
          ) : (responsePct >= 0.8 || toolPct >= 0.8) ? (
            <Badge variant="warning">Near limit</Badge>
          ) : (
            <Badge variant="success">Within free tier</Badge>
          )}
        </div>

        <UsageBar
          label="Responses"
          used={summary.freeTier.responsesUsed}
          limit={summary.freeTier.responsesLimit}
          pct={responsePct}
        />
        <UsageBar
          label="Tool calls"
          used={summary.freeTier.toolCallsUsed}
          limit={summary.freeTier.toolCallsLimit}
          pct={toolPct}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h3 className="text-sm font-semibold">Top tools</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              By call count in the selected range
            </p>
          </div>
        </div>
        {summary.perTool.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No tool calls in this range yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead className="bg-muted/40">
                <tr className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Tool</th>
                  <th className="px-5 py-2 font-medium text-right">Calls</th>
                  <th className="px-5 py-2 font-medium text-right">Failures</th>
                  <th className="px-5 py-2 font-medium text-right">Avg ms</th>
                </tr>
              </thead>
              <tbody>
                {summary.perTool.map((row) => (
                  <tr key={row.name} className="border-t border-border/60">
                    <td className="px-5 py-3">
                      <code className="font-mono text-xs">{row.name}</code>
                    </td>
                    <td className="px-5 py-3 text-right font-medium">
                      {row.count.toLocaleString()}
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground">
                      {row.failures}
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground">
                      {row.avgMs} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h3 className="text-sm font-semibold">Recent events</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Newest first · last 20 events captured in the ring buffer
          </p>
        </div>
        {summary.recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No events recorded yet.
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {summary.recent.map((event, index) => (
              <li
                key={`${event.ts}-${index}`}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {event.kind === "response" ? (
                    <Badge variant="default">response</Badge>
                  ) : event.ok ? (
                    <Badge variant="success">tool</Badge>
                  ) : (
                    <Badge variant="destructive">tool!</Badge>
                  )}
                  <span className="truncate font-mono text-xs">
                    {event.kind === "tool_call"
                      ? event.name
                      : event.platform ?? "unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {event.kind === "tool_call" ? (
                    <span>{event.durationMs} ms</span>
                  ) : null}
                  <time dateTime={new Date(event.ts).toISOString()}>
                    {new Date(event.ts).toLocaleString()}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function UsageBar({
  label,
  used,
  limit,
  pct,
}: {
  label: string;
  used: number;
  limit: number;
  pct: number;
}) {
  const widthPercent = Math.min(100, pct * 100);
  const color =
    pct >= 1
      ? "bg-destructive"
      : pct >= 0.8
        ? "bg-amber-500"
        : "bg-foreground";
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-muted-foreground">
          {used.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
    </div>
  );
}

function clampPct(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}
