"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ObservabilitySummary } from "@/lib/observability";

export function ObservabilityPanel({ projectId }: { projectId: string }) {
  const [userId, setUserId] = React.useState("");
  const [pending, setPending] = React.useState("");
  const [data, setData] = React.useState<ObservabilitySummary | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(
        `/api/v1/projects/${encodeURIComponent(projectId)}/observability?userId=${encodeURIComponent(userId)}`,
        { cache: "no-store" },
      );
      if (!resp.ok) {
        setError(`request failed (${resp.status})`);
        return;
      }
      setData((await resp.json()) as ObservabilitySummary);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId, userId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Light auto-refresh on the active-services pane.
  React.useEffect(() => {
    if (!userId) return;
    const timer = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(timer);
  }, [load, userId]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground">
        <p>
          Observability mirrors the daemon&apos;s internal agent activity —
          scoped by the operator&apos;s Kodama user handle, not by project.
          Type the handle you want to inspect (typically your iMessage
          number or your daemon owner id).
        </p>
      </div>

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setUserId(pending.trim());
        }}
      >
        <Input
          value={pending}
          onChange={(event) => setPending(event.target.value)}
          placeholder="Operator user handle, e.g. +14155550143"
          className="flex-1 font-mono text-xs"
        />
        <Button size="sm" type="submit">
          Load
        </Button>
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={load}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </form>

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {!data ? null : !data.hasBackend ? (
        <NoBackend />
      ) : !data.userId ? (
        <NoUser />
      ) : (
        <Body summary={data} />
      )}
    </div>
  );
}

function NoBackend() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">No Convex deployment connected.</p>
      <p className="mt-1.5">
        Observability data lives in the daemon&apos;s Convex tables
        (<code className="font-mono">agentRuns</code>,{" "}
        <code className="font-mono">toolCalls</code>,{" "}
        <code className="font-mono">serviceUsage</code>,{" "}
        <code className="font-mono">spendLedger</code>). Set{" "}
        <code className="font-mono">CONVEX_URL</code> in{" "}
        <code className="font-mono">.env.local</code> to point at the same
        deployment.
      </p>
    </div>
  );
}

function NoUser() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">Enter an operator user handle.</p>
      <p className="mt-1.5">
        The daemon scopes activity by the Kodama user id (the iMessage
        handle of whoever owns this agent). Type that id above to load
        their recent runs, tool calls, and spend.
      </p>
    </div>
  );
}

function Body({ summary }: { summary: ObservabilitySummary }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          label="Agent runs · 24h"
          value={summary.totals.runs24h.toLocaleString()}
          hint={`${summary.totals.runsErrored24h} errored`}
        />
        <StatCard
          label="Active services"
          value={summary.totals.activeServices.toString()}
          hint="In-flight right now"
          tone={summary.totals.activeServices > 0 ? "live" : undefined}
        />
        <StatCard
          label="Tool calls · 24h"
          value={summary.totals.toolCalls24h.toLocaleString()}
          hint={`${summary.totals.toolCallFailures24h} failed`}
        />
        <StatCard
          label="Spend · 7d"
          value={`$${summary.totals.spendUsd7d.toFixed(2)}`}
          hint="Sum across all agents"
        />
      </div>

      <Card title="Live services" subtitle="status=active rows in the daemon's serviceUsage feed">
        {summary.activeServices.length === 0 ? (
          <Empty>No services in flight right now.</Empty>
        ) : (
          <ul className="divide-y divide-border/60">
            {summary.activeServices.map((row) => (
              <li
                key={row._id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="relative inline-flex h-2 w-2 flex-none">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="truncate font-mono text-xs text-muted-foreground">
                    {row.agentName} →
                  </span>
                  <span className="truncate font-medium">{row.service}</span>
                  {row.toolName ? (
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {row.toolName}
                    </Badge>
                  ) : null}
                </div>
                <time
                  dateTime={new Date(row.startedAt).toISOString()}
                  className="text-xs text-muted-foreground"
                >
                  started {formatTime(row.startedAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Recent agent runs"
        subtitle={`Last ${summary.recentRuns.length} runs across all sub-agents`}
      >
        {summary.recentRuns.length === 0 ? (
          <Empty>No runs recorded for this user.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left text-sm">
              <thead className="bg-muted/40">
                <tr className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Agent</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium">Model</th>
                  <th className="px-5 py-2 font-medium text-right">Tokens</th>
                  <th className="px-5 py-2 font-medium text-right">Cost</th>
                  <th className="px-5 py-2 font-medium text-right">Started</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentRuns.map((run) => (
                  <tr key={run._id} className="border-t border-border/60">
                    <td className="px-5 py-3">
                      <code className="font-mono text-xs">{run.agentName}</code>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      <span className="font-mono text-xs">{run.model ?? "—"}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground">
                      {run.usage
                        ? `${(run.usage.inputTokens + run.usage.outputTokens).toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-medium">
                      {run.usage ? `$${run.usage.cost.toFixed(4)}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-muted-foreground">
                      {formatTime(run.startedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Recent tool calls"
        subtitle={`Last ${summary.recentToolCalls.length} tool invocations`}
      >
        {summary.recentToolCalls.length === 0 ? (
          <Empty>No tool calls recorded for this user.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="bg-muted/40">
                <tr className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Tool</th>
                  <th className="px-5 py-2 font-medium">Service</th>
                  <th className="px-5 py-2 font-medium">Agent</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                  <th className="px-5 py-2 font-medium text-right">Duration</th>
                  <th className="px-5 py-2 font-medium text-right">At</th>
                </tr>
              </thead>
              <tbody>
                {summary.recentToolCalls.map((tool) => (
                  <tr key={tool._id} className="border-t border-border/60">
                    <td className="px-5 py-3">
                      <code className="font-mono text-xs">{tool.toolName}</code>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      <span className="font-mono text-xs">{tool.service ?? "—"}</span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {tool.agentName ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      {tool.status === "success" ? (
                        <Badge variant="success">success</Badge>
                      ) : (
                        <Badge variant="destructive">error</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-muted-foreground">
                      {tool.durationMs ? `${tool.durationMs} ms` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-muted-foreground">
                      {formatTime(tool.at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Spend by agent · 7d"
        subtitle="USD billed across all sub-agents in the last week"
      >
        {summary.spendByAgent.length === 0 ? (
          <Empty>No spend recorded.</Empty>
        ) : (
          <SpendList items={summary.spendByAgent} />
        )}
      </Card>
    </div>
  );
}

function SpendList({
  items,
}: {
  items: Array<{ agentName: string; usd: number; runs: number }>;
}) {
  const max = Math.max(...items.map((item) => item.usd), 0.0001);
  return (
    <ul className="divide-y divide-border/60">
      {items.map((item) => (
        <li key={item.agentName} className="px-5 py-3">
          <div className="flex items-center justify-between text-sm">
            <code className="font-mono text-xs">{item.agentName}</code>
            <span className="font-medium">${item.usd.toFixed(4)}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground/80"
              style={{ width: `${Math.min(100, (item.usd / max) * 100)}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {item.runs.toLocaleString()} run{item.runs === 1 ? "" : "s"}
          </div>
        </li>
      ))}
    </ul>
  );
}

function StatusBadge({ status }: { status: "running" | "success" | "error" | "aborted" }) {
  if (status === "running") return <Badge variant="warning">running</Badge>;
  if (status === "success") return <Badge variant="success">success</Badge>;
  if (status === "error") return <Badge variant="destructive">error</Badge>;
  return <Badge variant="secondary">aborted</Badge>;
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "live";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        {tone === "live" ? (
          <span className="relative inline-flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-8 text-center text-sm text-muted-foreground">{children}</div>
  );
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 60 * 60_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 24 * 60 * 60_000) return `${Math.round(diff / (60 * 60_000))}h ago`;
  return new Date(ts).toLocaleString();
}

