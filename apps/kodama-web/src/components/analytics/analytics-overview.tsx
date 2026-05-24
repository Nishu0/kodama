import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import type { DashboardAnalytics } from "@/lib/dashboard-analytics";
import type { Range } from "@/lib/usage";
import { cn } from "@/lib/utils";

const RANGES: Array<{ key: Range; label: string }> = [
  { key: "today", label: "Today" },
  { key: "week", label: "7 days" },
  { key: "month", label: "Month" },
  { key: "all", label: "All time" },
];

const envBadge: Record<string, "success" | "warning" | "secondary"> = {
  production: "success",
  staging: "warning",
  development: "secondary",
};

export function AnalyticsOverview({ data }: { data: DashboardAnalytics }) {
  const { usage, integrations, projects } = data;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Everything across your Kodama workspace — usage, connections, and projects.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-muted p-0.5 text-xs">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/dashboard/analytics?range=${r.key}`}
              className={cn(
                "rounded px-2.5 py-1 font-medium transition",
                usage.range === r.key
                  ? "bg-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Projects"
          value={String(projects.total)}
          hint={projects.byEnvironment
            .map((e) => `${e.count} ${e.environment}`)
            .join(" · ")}
        />
        <StatCard
          label="Connections"
          value={`${integrations.connected} / ${integrations.available}`}
          hint={`${integrations.totalEnablements} project enablements`}
        />
        <StatCard
          label="AI responses"
          value={usage.totals.responses.toLocaleString()}
          hint={rangeHint(usage.range)}
        />
        <StatCard
          label="Tool calls"
          value={usage.totals.toolCalls.toLocaleString()}
          hint={`${usage.totals.toolCallFailures} failed`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Activity · last 7 days</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Responses and tool calls per day across all projects
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Legend className="bg-foreground" label="Responses" />
              <Legend className="bg-emerald-500" label="Tool calls" />
            </div>
          </div>
          <DailyChart daily={usage.daily} />
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold">Free tier — this month</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Aggregated across projects · resets monthly (UTC)
          </p>
          <UsageBar
            label="Responses"
            used={usage.freeTier.responsesUsed}
            limit={usage.freeTier.responsesLimit}
          />
          <UsageBar
            label="Tool calls"
            used={usage.freeTier.toolCallsUsed}
            limit={usage.freeTier.toolCallsLimit}
          />
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold">Integrations</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Workspace connections and how many projects use each
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {integrations.items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-background p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{item.label}</span>
                {item.connected ? (
                  <Badge variant="success" className="font-medium">
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">Off</Badge>
                )}
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums">
                {item.enabledProjects}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  / {projects.total} projects
                </span>
              </p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-border p-5">
            <h3 className="text-sm font-semibold">Top tools</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              By call count in the selected range
            </p>
          </div>
          {usage.perTool.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No tool calls in this range yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-collapse text-left text-sm">
                <thead className="bg-muted/40">
                  <tr className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                    <th className="px-5 py-2 font-medium">Tool</th>
                    <th className="px-5 py-2 font-medium text-right">Calls</th>
                    <th className="px-5 py-2 font-medium text-right">Failures</th>
                    <th className="px-5 py-2 font-medium text-right">Avg ms</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.perTool.slice(0, 8).map((row) => (
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
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-border p-5">
            <h3 className="text-sm font-semibold">Projects</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Environment and enabled connections per project
            </p>
          </div>
          {projects.list.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No projects yet.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {projects.list.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/dashboard/projects/${p.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 transition hover:bg-muted/50"
                  >
                    <span className="min-w-0 truncate text-sm font-medium">{p.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {p.enabled} connector{p.enabled === 1 ? "" : "s"}
                      </span>
                      <Badge variant={envBadge[p.environment] ?? "secondary"}>
                        {p.environment}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block h-2 w-2 rounded-sm", className)} />
      {label}
    </span>
  );
}

const CHART_HEIGHT = 150; // px reserved for the bars

function DailyChart({
  daily,
}: {
  daily: DashboardAnalytics["usage"]["daily"];
}) {
  const max = Math.max(1, ...daily.map((d) => Math.max(d.responses, d.toolCalls)));
  const hasData = daily.some((d) => d.responses > 0 || d.toolCalls > 0);

  if (!hasData) {
    return (
      <div
        className="mt-6 flex items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground"
        style={{ height: CHART_HEIGHT }}
      >
        No activity recorded in the last 7 days yet.
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Bars — explicit px heights so they resolve against a definite parent. */}
      <div
        className="flex items-end justify-between gap-3"
        style={{ height: CHART_HEIGHT }}
      >
        {daily.map((d, i) => (
          <div
            key={i}
            className="flex flex-1 items-end justify-center gap-1"
            style={{ height: CHART_HEIGHT }}
          >
            <Bar
              value={d.responses}
              max={max}
              className="bg-foreground"
              title={`${d.responses} responses`}
            />
            <Bar
              value={d.toolCalls}
              max={max}
              className="bg-emerald-500"
              title={`${d.toolCalls} tool calls`}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between gap-3">
        {daily.map((d, i) => (
          <span
            key={i}
            className="flex-1 text-center text-[11px] text-muted-foreground"
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Bar({
  value,
  max,
  className,
  title,
}: {
  value: number;
  max: number;
  className: string;
  title: string;
}) {
  const height = value <= 0 ? 0 : Math.max(3, Math.round((value / max) * CHART_HEIGHT));
  return (
    <div
      title={title}
      className={cn("w-3 rounded-t-sm transition-all", className)}
      style={{ height }}
    />
  );
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const pct = limit > 0 ? used / limit : 0;
  const widthPercent = Math.min(100, pct * 100);
  const color =
    pct >= 1 ? "bg-destructive" : pct >= 0.8 ? "bg-amber-500" : "bg-foreground";
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

function rangeHint(range: Range): string {
  return range === "all" ? "all time" : `range: ${range}`;
}
