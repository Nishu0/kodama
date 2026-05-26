import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  saveWorkspaceSettings,
  type Notifications,
} from "@/lib/workspace-settings";
import { recordActivity } from "@/lib/activity-store";

export const dynamic = "force-dynamic";

const NOTIFS: Notifications[] = ["all", "important", "off"];

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: {
    name?: string;
    model?: string;
    notifications?: string;
    supportEmail?: string;
    openRouterKey?: string;
    clearOpenRouterKey?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = body.name?.trim();
  const model = body.model?.trim();
  const notifications = body.notifications as Notifications;
  const supportEmail = body.supportEmail?.trim() || undefined;
  const openRouterKey = body.openRouterKey?.trim() || undefined;

  if (!name) {
    return NextResponse.json(
      { error: "invalid_name", message: "workspace name is required" },
      { status: 400 },
    );
  }
  // Free-form OpenRouter model slug (e.g. "anthropic/claude-3.5-sonnet").
  if (!model || model.length < 3) {
    return NextResponse.json(
      { error: "invalid_model", message: "an OpenRouter model slug is required" },
      { status: 400 },
    );
  }
  if (!NOTIFS.includes(notifications)) {
    return NextResponse.json({ error: "invalid_notifications" }, { status: 400 });
  }
  if (openRouterKey && openRouterKey.length < 8) {
    return NextResponse.json(
      { error: "invalid_key", message: "that doesn't look like a valid OpenRouter key" },
      { status: 400 },
    );
  }

  const editor = session.user?.email ?? session.user?.name ?? undefined;
  await saveWorkspaceSettings(
    {
      name,
      openRouterModel: model,
      notifications,
      supportEmail,
      openRouterKey,
      clearOpenRouterKey: body.clearOpenRouterKey === true,
    },
    editor,
  );

  await recordActivity({
    type: "settings.update",
    actor: session.user?.name ?? session.user?.email ?? "Someone",
    summary: "Updated workspace settings",
  });

  return NextResponse.json({ ok: true });
}
