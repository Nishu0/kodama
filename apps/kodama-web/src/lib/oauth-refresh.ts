// Lazy access-token refresh. Call `getValidAccessToken` whenever you're about
// to use a Google token — it'll exchange the refresh token if the access
// token is within 60 s of expiry, persist the new tokens, and return the
// fresh access token. Non-Google connectors (telegram bot, etc.) skip the
// refresh path because their tokens don't expire.

import type { ConnectorId } from "./runtime-config";
import { getToken, saveToken, type StoredToken } from "./oauth-tokens";

const SKEW_MS = 60_000;
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CONNECTORS = new Set<ConnectorId>(["gmail", "calendar"]);

type GoogleRefreshResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

export async function getValidAccessToken(
  projectId: string,
  connector: ConnectorId,
): Promise<string | null> {
  const token = await getToken(projectId, connector);
  if (!token) return null;

  if (!GOOGLE_CONNECTORS.has(connector)) return token.accessToken;

  const willExpireSoon =
    token.expiresAt != null && token.expiresAt - SKEW_MS < Date.now();
  if (!willExpireSoon) return token.accessToken;
  if (!token.refreshToken) return null; // can't refresh

  try {
    const refreshed = await refreshGoogleToken(token.refreshToken);
    const next: StoredToken = {
      ...token,
      accessToken: refreshed.access_token,
      // Google may rotate the refresh token; keep the new one if provided.
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      expiresAt: refreshed.expires_in
        ? Date.now() + refreshed.expires_in * 1000
        : null,
      scopes: refreshed.scope ? refreshed.scope.split(" ") : token.scopes,
    };
    await saveToken(next);
    return next.accessToken;
  } catch {
    return null;
  }
}

async function refreshGoogleToken(
  refreshToken: string,
): Promise<GoogleRefreshResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("google client credentials missing");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    let body: string | undefined;
    try {
      body = await response.text();
    } catch {
      // ignore
    }
    throw new Error(
      `google refresh failed (${response.status})${body ? `: ${body}` : ""}`,
    );
  }

  return (await response.json()) as GoogleRefreshResponse;
}
