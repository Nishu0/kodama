import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { clearToken } from "@/lib/oauth-tokens";
import { GLOBAL_SCOPE, type ConnectorId } from "@/lib/runtime-config";
import { recordActivity } from "@/lib/activity-store";

export const dynamic = "force-dynamic";

const ALLOWED: ConnectorId[] = ["gmail", "calendar", "telegram", "x", "imessage"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ connector: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { connector } = await params;
  if (!ALLOWED.includes(connector as ConnectorId)) {
    return NextResponse.json(
      { error: "unsupported_connector", connector },
      { status: 400 },
    );
  }

  let body: { projectId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const projectId = body.projectId?.trim();
  if (!projectId) {
    return NextResponse.json(
      { error: "missing_project_id" },
      { status: 400 },
    );
  }

  const removed = await clearToken(projectId, connector as ConnectorId);

  if (removed && projectId === GLOBAL_SCOPE) {
    await recordActivity({
      type: "connector.disconnect",
      actor: session.user?.name ?? session.user?.email ?? "Someone",
      summary: `Disconnected ${connector} from the workspace`,
      target: connector,
    });
  }

  return NextResponse.json({ ok: true, removed });
}
