import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { removeMember } from "@/lib/team-store";
import { recordActivity } from "@/lib/activity-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "missing_email" }, { status: 400 });
  }

  const removed = await removeMember(email);

  if (removed) {
    await recordActivity({
      type: "team.remove",
      actor: session.user?.name ?? session.user?.email ?? "Someone",
      summary: `Removed ${email} from the workspace`,
      target: email,
    });
  }

  return NextResponse.json({ ok: true, removed });
}
