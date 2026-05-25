import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { inviteMember, type TeamRole } from "@/lib/team-store";
import { recordActivity } from "@/lib/activity-store";
import { sendEmail, appBaseUrl } from "@/lib/email";
import { inviteEmail } from "@/lib/email-templates";
import { getWorkspaceSettings } from "@/lib/workspace-settings";

export const dynamic = "force-dynamic";

const ROLES: TeamRole[] = ["owner", "admin", "member", "viewer"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { email?: string; name?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim() || undefined;
  const role = (body.role ?? "member") as TeamRole;

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "invalid_email", message: "a valid email is required" },
      { status: 400 },
    );
  }
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  const inviterName =
    session.user?.name ?? session.user?.email ?? "A teammate";
  const inviteToken =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}`;

  await inviteMember({
    email,
    name,
    role,
    inviteToken,
    invitedBy: inviterName,
  });

  const settings = await getWorkspaceSettings();
  const acceptUrl = `${appBaseUrl()}/signin?invite=${encodeURIComponent(inviteToken)}`;
  const tmpl = inviteEmail({
    workspaceName: settings.name,
    inviterName,
    role,
    acceptUrl,
  });
  const emailResult = await sendEmail({
    to: email,
    subject: tmpl.subject,
    html: tmpl.html,
    text: tmpl.text,
    replyTo: settings.supportEmail,
  });

  await recordActivity({
    type: "team.invite",
    actor: inviterName,
    summary: `Invited ${email} as ${role}`,
    target: email,
  });

  return NextResponse.json({ ok: true, email, role, emailResult });
}
