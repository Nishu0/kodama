import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyProjectSecret } from "@/lib/runtime-config";
import { getObservability } from "@/lib/observability";

export const dynamic = "force-dynamic";

function bearerOf(headerValue: string | null): string | null {
  if (!headerValue) return null;
  const match = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
  return match?.[1]?.trim() ?? null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Allow either: bearer auth with the project secret OR a signed-in
  // dashboard session. Mirrors the usage endpoint's pattern.
  const token = bearerOf(request.headers.get("authorization"));
  if (token) {
    if (!(await verifyProjectSecret(id, token))) {
      return NextResponse.json(
        { error: "invalid_credentials" },
        { status: 401 },
      );
    }
  } else {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "unauthenticated" },
        { status: 401 },
      );
    }
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId")?.trim() ?? "";
  const runsLimit = Number(url.searchParams.get("runsLimit") ?? 20);
  const toolsLimit = Number(url.searchParams.get("toolsLimit") ?? 50);

  const summary = await getObservability(userId, {
    runsLimit: Number.isFinite(runsLimit) ? runsLimit : 20,
    toolsLimit: Number.isFinite(toolsLimit) ? toolsLimit : 50,
  });

  return NextResponse.json(summary, {
    headers: { "Cache-Control": "no-store" },
  });
}
