import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateMemberRole, type TeamRole } from "@/lib/team-store";
import { recordActivity } from "@/lib/activity-store";

export const dynamic = "force-dynamic";

const ROLES: TeamRole[] = ["owner", "admin", "member", "viewer"];

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const role = body.role as TeamRole;
  if (!email || !ROLES.includes(role)) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }

  const ok = await updateMemberRole(email, role);
  if (!ok) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await recordActivity({
    type: "team.role",
    actor: session.user?.name ?? session.user?.email ?? "Someone",
    summary: `Changed ${email}'s role to ${role}`,
    target: email,
  });

  return NextResponse.json({ ok: true });
}
