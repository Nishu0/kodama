import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { listActivity, type ActivityEvent } from "@/lib/activity-store";

export const dynamic = "force-dynamic";

const TYPE_BADGE: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  "team.invite": "secondary",
  "team.remove": "destructive",
  "team.role": "secondary",
  "connector.connect": "success",
  "connector.disconnect": "warning",
  "project.create": "success",
  "settings.update": "default",
  system: "default",
};

export default async function ActivityPage() {
  const events = await listActivity(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground">
          Audit log across the workspace — invites, connections, projects and settings.
        </p>
      </div>

      <Card className="overflow-hidden">
        {events.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No activity recorded yet.
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {events.map((event, i) => (
              <ActivityRow key={`${event.at}-${i}`} event={event} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ActivityRow({ event }: { event: ActivityEvent }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
      <div className="flex min-w-0 items-center gap-3">
        <Badge variant={TYPE_BADGE[event.type] ?? "secondary"} className="font-mono text-[10px]">
          {event.type}
        </Badge>
        <div className="min-w-0">
          <p className="truncate">
            <span className="font-medium">{event.actor}</span>{" "}
            <span className="text-muted-foreground">{event.summary}</span>
          </p>
        </div>
      </div>
      <time
        dateTime={new Date(event.at).toISOString()}
        className="flex-none text-xs text-muted-foreground"
        title={new Date(event.at).toLocaleString()}
      >
        {relativeTime(event.at)}
      </time>
    </li>
  );
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
