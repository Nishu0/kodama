import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyState } from "@/lib/oauth-state";
import { saveToken } from "@/lib/oauth-tokens";
import { GLOBAL_SCOPE, type ConnectorId } from "@/lib/runtime-config";
import { recordActivity } from "@/lib/activity-store";

export const dynamic = "force-dynamic";

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

type UserInfo = { sub: string; email?: string; name?: string };

function redirectBase(): string {
  return (
    process.env.KODAMA_OAUTH_REDIRECT_BASE ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function failureUrl(returnTo: string, reason: string): string {
  const url = new URL(returnTo, redirectBase());
  url.searchParams.set("connector_error", reason);
  return url.toString();
}

function successUrl(returnTo: string, connector: string): string {
  const url = new URL(returnTo, redirectBase());
  url.searchParams.set("connector_connected", connector);
  return url.toString();
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.redirect(`${redirectBase()}/signin`);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  if (!stateRaw) {
    return NextResponse.json(
      { error: "missing_state" },
      { status: 400 },
    );
  }

  let state;
  try {
    state = verifyState(stateRaw);
  } catch {
    return NextResponse.json(
      { error: "invalid_state" },
      { status: 400 },
    );
  }

  if (errorParam) {
    return NextResponse.redirect(failureUrl(state.returnTo, errorParam));
  }
  if (!code) {
    return NextResponse.redirect(failureUrl(state.returnTo, "missing_code"));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(failureUrl(state.returnTo, "not_configured"));
  }

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${redirectBase()}/api/v1/connectors/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResp.ok) {
    return NextResponse.redirect(
      failureUrl(state.returnTo, `token_exchange_${tokenResp.status}`),
    );
  }
  const tokens = (await tokenResp.json()) as TokenResponse;

  // Look up the connected Google identity so we can label the connection.
  let profile: { id: string; label: string | null } | null = null;
  try {
    const userResp = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    if (userResp.ok) {
      const info = (await userResp.json()) as UserInfo;
      profile = { id: info.sub, label: info.email ?? info.name ?? null };
    }
  } catch {
    // best-effort
  }

  const grantedScopes = tokens.scope
    ? tokens.scope.split(" ")
    : [];

  await saveToken({
    projectId: state.projectId,
    connector: state.connector as ConnectorId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt: tokens.expires_in
      ? Date.now() + tokens.expires_in * 1000
      : null,
    scopes: grantedScopes,
    connectedAt: new Date().toISOString(),
    profile,
    extra: tokens.token_type ? { token_type: tokens.token_type } : {},
  });

  if (state.projectId === GLOBAL_SCOPE) {
    await recordActivity({
      type: "connector.connect",
      actor: session.user?.name ?? session.user?.email ?? "Someone",
      summary: `Connected ${state.connector} to the workspace`,
      target: state.connector,
    });
  }

  return NextResponse.redirect(successUrl(state.returnTo, state.connector));
}
