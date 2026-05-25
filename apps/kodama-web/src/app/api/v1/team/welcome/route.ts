import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listTeam } from "@/lib/team-store";
import { sendEmail, appBaseUrl } from "@/lib/email";
import { onboardingEmail } from "@/lib/email-templates";
import { getWorkspaceSettings } from "@/lib/workspace-settings";

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

  const member = (await listTeam()).find((m) => m.email === email);
  if (!member) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const settings = await getWorkspaceSettings();
  const tmpl = onboardingEmail({
    workspaceName: settings.name,
    memberName: member.name,
    dashboardUrl: `${appBaseUrl()}/dashboard`,
  });
  const emailResult = await sendEmail({
    to: email,
    subject: tmpl.subject,
    html: tmpl.html,
    text: tmpl.text,
    replyTo: settings.supportEmail,
  });

  return NextResponse.json({ ok: true, emailResult });
}
