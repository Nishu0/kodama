import { NextResponse } from "next/server";
import { verifyProjectSecret } from "@/lib/runtime-config";
import {
  appendEvents,
  seedDemoUsage,
  summarizeUsage,
  type Range,
  type UsageEvent,
} from "@/lib/usage";

export const dynamic = "force-dynamic";

function bearerOf(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const match = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
  return match?.[1]?.trim() ?? null;
}

function authFail() {
  return NextResponse.json(
    { error: "invalid_credentials" },
    { status: 401 },
  );
}

function isValidEvent(event: unknown): event is UsageEvent {
  if (!event || typeof event !== "object") return false;
  const e = event as Record<string, unknown>;
  if (typeof e.ts !== "number") return false;
  if (e.kind === "response") return true;
  if (e.kind === "tool_call") {
    return typeof e.name === "string" && typeof e.durationMs === "number";
  }
  return false;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = bearerOf(request.headers.get("authorization"));
  if (!token || !(await verifyProjectSecret(id, token))) return authFail();

  let body: { events?: unknown };
  try {
    body = (await request.json()) as { events?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!Array.isArray(body.events)) {
    return NextResponse.json(
      { error: "missing_events", message: "expected `{ events: [...] }`" },
      { status: 400 },
    );
  }

  const events = body.events.filter(isValidEvent);
  const result = appendEvents(id, events);
  return NextResponse.json({
    ok: true,
    accepted: result.accepted,
    dropped: result.dropped,
    rejected: body.events.length - events.length,
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Reads come from the dashboard, which already requires the user be
  // signed in via NextAuth and currently uses server fetches without bearer
  // tokens. To keep the surface simple, we accept either: bearer auth OR
  // the request originating from the same origin as NEXTAUTH_URL.
  const token = bearerOf(request.headers.get("authorization"));
  if (token && !(await verifyProjectSecret(id, token))) return authFail();

  const url = new URL(request.url);
  const range = (url.searchParams.get("range") as Range) ?? "all";
  if (!["all", "today", "week", "month"].includes(range)) {
    return NextResponse.json({ error: "invalid_range" }, { status: 400 });
  }

  // Seed demo data on first read in dev so the Analytics tab has something
  // to render before the SDK posts anything real.
  if (process.env.NODE_ENV !== "production") seedDemoUsage(id);

  return NextResponse.json(summarizeUsage(id, { range }), {
    headers: { "Cache-Control": "no-store" },
  });
}
