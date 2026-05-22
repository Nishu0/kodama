// SDK-facing token vending endpoint. The SDK provider calls this on demand
// to get a fresh Google access token without ever seeing the refresh token.
// Refresh logic stays server-side in `getValidAccessToken`.

import { NextResponse } from "next/server";
import { getToken } from "@/lib/oauth-tokens";
import { getValidAccessToken } from "@/lib/oauth-refresh";
import {
  GLOBAL_SCOPE,
  isConnectorEnabledForProject,
  verifyProjectSecret,
} from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

function bearerOf(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const match = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
  return match?.[1]?.trim() ?? null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json(
      { error: "missing_project_id" },
      { status: 400 },
    );
  }

  const token = bearerOf(request.headers.get("authorization"));
  if (!token) {
    return NextResponse.json(
      {
        error: "missing_authorization",
        message: "Authorization: Bearer <projectSecret> required",
      },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="kodama"' } },
    );
  }
  if (!(await verifyProjectSecret(projectId, token))) {
    return NextResponse.json(
      { error: "invalid_credentials" },
      { status: 401 },
    );
  }

  // Gmail must be enabled for this project (the per-project toggle) before we
  // hand back the workspace-level token.
  if (!(await isConnectorEnabledForProject(projectId, "gmail"))) {
    return NextResponse.json(
      {
        error: "not_enabled",
        message: "gmail is not enabled for this project; toggle it on in the project Integrations tab",
      },
      { status: 403 },
    );
  }

  // Connections live globally — read the token from the reserved workspace scope.
  const stored = await getToken(GLOBAL_SCOPE, "gmail");
  if (!stored) {
    return NextResponse.json(
      { error: "not_connected", message: "gmail is not connected in this workspace" },
      { status: 404 },
    );
  }

  const accessToken = await getValidAccessToken(GLOBAL_SCOPE, "gmail");
  if (!accessToken) {
    return NextResponse.json(
      {
        error: "refresh_failed",
        message:
          "stored gmail token is expired and could not be refreshed; ask the user to reconnect",
      },
      { status: 410 },
    );
  }

  return NextResponse.json(
    {
      accessToken,
      // Refreshed expiry — clients can use this to back off the next refetch.
      expiresAt: stored.expiresAt,
      scopes: stored.scopes,
      profile: stored.profile,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
