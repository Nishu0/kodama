// Workspace activity feed. Dual backend — Convex `activity` functions when
// CONVEX_URL is set, in-memory ring otherwise (seeded with demo events).
//
// recordActivity is best-effort: it never throws, so wiring it into a flow
// (invite, connector connect, project create) can't break that flow.

import { getConvex } from "./convex-client";
import { globalSingleton } from "./global-store";

export type ActivityType =
  | "team.invite"
  | "team.remove"
  | "team.role"
  | "connector.connect"
  | "connector.disconnect"
  | "project.create"
  | "settings.update"
  | "system";

export type ActivityEvent = {
  type: ActivityType | string;
  actor: string;
  summary: string;
  target?: string;
  at: number;
};

const RING = 500;
const _activity = globalSingleton("kodama:activityStore", () => ({
  store: [] as ActivityEvent[],
  seeded: false,
}));
const memoryStore = _activity.store;

const DAY = 24 * 60 * 60 * 1000;
function ensureSeed() {
  if (_activity.seeded) return;
  _activity.seeded = true;
  const now = Date.now();
  memoryStore.push(
    { type: "system", actor: "System", summary: "Workspace created", at: now - 30 * DAY },
    { type: "project.create", actor: "Nisarg", summary: "Created project Iris", target: "prj_iris", at: now - 14 * DAY },
    { type: "connector.connect", actor: "Nisarg", summary: "Connected Gmail to the workspace", target: "gmail", at: now - 13 * DAY },
    { type: "team.invite", actor: "Riya", summary: "Invited arham@kodama.dev as member", target: "arham@kodama.dev", at: now - 2 * DAY },
  );
}

export async function recordActivity(event: Omit<ActivityEvent, "at"> & { at?: number }): Promise<void> {
  const at = event.at ?? Date.now();
  try {
    const client = getConvex();
    if (!client) {
      ensureSeed();
      memoryStore.push({ ...event, at });
      if (memoryStore.length > RING) memoryStore.shift();
      return;
    }
    await client.mutation("activity:record" as never, {
      type: event.type,
      actor: event.actor,
      summary: event.summary,
      target: event.target,
      at,
    } as never);
  } catch (cause) {
    console.warn("[activity] failed to record", (cause as Error).message);
  }
}

export async function listActivity(limit = 50): Promise<ActivityEvent[]> {
  const client = getConvex();
  if (!client) {
    ensureSeed();
    return [...memoryStore].sort((a, b) => b.at - a.at).slice(0, limit);
  }
  const rows = (await client.query("activity:list" as never, { limit } as never)) as ActivityEvent[];
  return rows;
}
