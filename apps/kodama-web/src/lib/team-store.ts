// Workspace team store. Dual backend — Convex `team` functions when
// CONVEX_URL is set, in-memory Map (seeded with demo members) otherwise.

import { getConvex } from "./convex-client";
import { globalSingleton } from "./global-store";

export type TeamRole = "owner" | "admin" | "member" | "viewer";
export type TeamStatus = "invited" | "active";

export type TeamMember = {
  email: string;
  name?: string;
  role: TeamRole;
  status: TeamStatus;
  invitedBy?: string;
  invitedAt: number;
  joinedAt?: number;
  inviteToken?: string;
};

type ConvexRow = TeamMember & { _id: string };

// Seeded demo members so the page renders without a Convex deployment.
const DAY = 24 * 60 * 60 * 1000;
const seed: TeamMember[] = [
  {
    email: "itsnisargthakkar@gmail.com",
    name: "Nisarg Thakkar",
    role: "owner",
    status: "active",
    invitedAt: Date.now() - 30 * DAY,
    joinedAt: Date.now() - 30 * DAY,
  },
  {
    email: "riya@kodama.dev",
    name: "Riya",
    role: "admin",
    status: "active",
    invitedAt: Date.now() - 12 * DAY,
    joinedAt: Date.now() - 11 * DAY,
  },
  {
    email: "arham@kodama.dev",
    name: "Arham",
    role: "member",
    status: "invited",
    invitedBy: "Riya",
    invitedAt: Date.now() - 2 * DAY,
  },
];

const _team = globalSingleton("kodama:teamStore", () => ({
  store: new Map<string, TeamMember>(),
  seeded: false,
}));
const memoryStore = _team.store;
function ensureSeed() {
  if (_team.seeded) return;
  for (const m of seed) memoryStore.set(m.email, m);
  _team.seeded = true;
}

export async function listTeam(): Promise<TeamMember[]> {
  const client = getConvex();
  if (!client) {
    ensureSeed();
    return [...memoryStore.values()].sort((a, b) => b.invitedAt - a.invitedAt);
  }
  const rows = (await client.query("team:list" as never, {} as never)) as ConvexRow[];
  return rows
    .map((r) => ({
      email: r.email,
      name: r.name,
      role: r.role,
      status: r.status,
      invitedBy: r.invitedBy,
      invitedAt: r.invitedAt,
      joinedAt: r.joinedAt,
    }))
    .sort((a, b) => b.invitedAt - a.invitedAt);
}

export async function inviteMember(args: {
  email: string;
  name?: string;
  role: TeamRole;
  inviteToken?: string;
  invitedBy?: string;
}): Promise<void> {
  const client = getConvex();
  if (!client) {
    ensureSeed();
    const existing = memoryStore.get(args.email);
    memoryStore.set(args.email, {
      email: args.email,
      name: args.name ?? existing?.name,
      role: args.role,
      status: existing?.status === "active" ? "active" : "invited",
      invitedBy: args.invitedBy,
      invitedAt: Date.now(),
      joinedAt: existing?.joinedAt,
      inviteToken: args.inviteToken,
    });
    return;
  }
  await client.mutation("team:invite" as never, {
    email: args.email,
    name: args.name,
    role: args.role,
    inviteToken: args.inviteToken,
    invitedBy: args.invitedBy,
  } as never);
}

export async function updateMemberRole(
  email: string,
  role: TeamRole,
): Promise<boolean> {
  const client = getConvex();
  if (!client) {
    ensureSeed();
    const existing = memoryStore.get(email);
    if (!existing) return false;
    memoryStore.set(email, { ...existing, role });
    return true;
  }
  return (await client.mutation("team:updateRole" as never, {
    email,
    role,
  } as never)) as boolean;
}

export async function removeMember(email: string): Promise<boolean> {
  const client = getConvex();
  if (!client) {
    ensureSeed();
    return memoryStore.delete(email);
  }
  return (await client.mutation("team:remove" as never, { email } as never)) as boolean;
}
