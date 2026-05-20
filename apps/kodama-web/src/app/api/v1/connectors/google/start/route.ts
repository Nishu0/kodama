import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { signState } from "@/lib/oauth-state";

export const dynamic = "force-dynamic";

const ALWAYS_ON_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

const CONNECTOR_SCOPES: Record<string, string[]> = {
  gmail: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.labels",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/contacts.readonly",
  ],
  calendar: [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
  ],
};

function redirectBase(): string {
  return (
    process.env.KODAMA_OAUTH_REDIRECT_BASE ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { error: "unauthenticated", message: "sign in to connect integrations" },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const connector = url.searchParams.get("connector");
  const returnTo = url.searchParams.get("returnTo") ?? "/dashboard";

  if (!projectId || !connector) {
    return NextResponse.json(
      { error: "missing_params", message: "projectId and connector are required" },
      { status: 400 },
    );
  }
  const extraScopes = CONNECTOR_SCOPES[connector];
  if (!extraScopes) {
    return NextResponse.json(
      { error: "unsupported_connector", connector },
      { status: 400 },
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      {
        error: "google_not_configured",
        message:
          "GOOGLE_CLIENT_ID is not set. Add it to .env.local and authorize the redirect URI in the Google Cloud console.",
      },
      { status: 500 },
    );
  }

  const state = signState({ projectId, connector, returnTo });
  const scopes = [...new Set([...ALWAYS_ON_SCOPES, ...extraScopes])].join(" ");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${redirectBase()}/api/v1/connectors/google/callback`,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    { status: 302 },
  );
}
