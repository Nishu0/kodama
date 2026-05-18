import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createProject } from "@/lib/api";
import { recordActivity } from "@/lib/activity-store";

export const dynamic = "force-dynamic";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_\s-]/g, "")
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: {
    name?: string;
    environment?: "production" | "staging" | "development";
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = body.name?.trim();
  const environment = body.environment ?? "development";
  if (!name || name.length < 3) {
    return NextResponse.json(
      { error: "invalid_name", message: "name must be at least 3 characters" },
      { status: 400 },
    );
  }
  if (!["production", "staging", "development"].includes(environment)) {
    return NextResponse.json(
      { error: "invalid_environment" },
      { status: 400 },
    );
  }

  const slug = slugify(name) || "untitled";
  const suffix = Math.random().toString(36).slice(2, 8);
  const projectId = `prj_${slug}_${suffix}`.slice(0, 40);

  const { project, secrets } = await createProject({
    projectId,
    name,
    environment,
    ownerEmail: session.user?.email ?? undefined,
    ownerName: session.user?.name ?? undefined,
  });

  await recordActivity({
    type: "project.create",
    actor: session.user?.name ?? session.user?.email ?? "Someone",
    summary: `Created project ${name} (${environment})`,
    target: projectId,
  });

  return NextResponse.json({ project, secrets });
}
