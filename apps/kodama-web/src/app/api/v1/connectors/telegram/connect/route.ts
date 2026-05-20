import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { saveToken } from "@/lib/oauth-tokens";
import { GLOBAL_SCOPE } from "@/lib/runtime-config";
import { recordActivity } from "@/lib/activity-store";

export const dynamic = "force-dynamic";

type GetMeResponse = {
  ok: boolean;
  result?: {
    id: number;
    is_bot: boolean;
    first_name?: string;
    username?: string;
  };
  description?: string;
};

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { projectId?: string; botToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const projectId = body.projectId?.trim();
  const botToken = body.botToken?.trim();
  if (!projectId || !botToken) {
    return NextResponse.json(
      { error: "missing_params", message: "projectId and botToken are required" },
      { status: 400 },
    );
  }

  // Validate against Telegram. A real bot token returns ok: true + bot info.
  const resp = await fetch(`https://api.telegram.org/bot${botToken}/getMe`, {
    cache: "no-store",
  });

  let payload: GetMeResponse;
  try {
    payload = (await resp.json()) as GetMeResponse;
  } catch {
    return NextResponse.json(
      { error: "telegram_unreachable" },
      { status: 502 },
    );
  }

  if (!payload.ok || !payload.result || !payload.result.is_bot) {
    return NextResponse.json(
      {
        error: "invalid_token",
        message: payload.description ?? "telegram rejected the bot token",
      },
      { status: 400 },
    );
  }

  await saveToken({
    projectId,
    connector: "telegram",
    accessToken: botToken,
    refreshToken: null,
    expiresAt: null,
    scopes: ["bot.read", "bot.send"],
    connectedAt: new Date().toISOString(),
    profile: {
      id: String(payload.result.id),
      label: payload.result.username
        ? `@${payload.result.username}`
        : payload.result.first_name ?? null,
    },
    extra: { kind: "bot" },
  });

  if (projectId === GLOBAL_SCOPE) {
    await recordActivity({
      type: "connector.connect",
      actor: session.user?.name ?? session.user?.email ?? "Someone",
      summary: `Connected Telegram bot ${payload.result.username ? `@${payload.result.username}` : ""} to the workspace`.trim(),
      target: "telegram",
    });
  }

  return NextResponse.json({
    ok: true,
    bot: {
      id: payload.result.id,
      username: payload.result.username,
      name: payload.result.first_name,
    },
  });
}
