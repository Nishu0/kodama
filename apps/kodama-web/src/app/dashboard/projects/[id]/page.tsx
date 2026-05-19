import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectTabs } from "@/components/project/project-tabs";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  fetchProjectPlatforms,
  fetchProjectSecrets,
  fetchProjectUsers,
  fetchProjectWebhook,
  fetchProjects,
} from "@/lib/api";
import {
  getGlobalConnectorStates,
  getProjectEnabledConnectors,
  getRuntimeConfig,
} from "@/lib/runtime-config";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [projects, users, platforms, secrets, webhook] =
    await Promise.all([
      fetchProjects(),
      fetchProjectUsers(id),
      fetchProjectPlatforms(id),
      fetchProjectSecrets(id),
      fetchProjectWebhook(id),
    ]);

  const [runtimeConfig, globalConnectors, enabledConnectors] = await Promise.all([
    getRuntimeConfig(id),
    getGlobalConnectorStates(),
    getProjectEnabledConnectors(id),
  ]);

  const project = projects.find((item) => item.id === id);
  if (!project) {
    notFound();
  }

  const enabledPlatforms = platforms.filter((p) => p.status === "enabled");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/dashboard/projects"
            className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground transition hover:text-foreground"
          >
            ← All projects
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <Badge
              variant={
                project.environment === "production"
                  ? "success"
                  : project.environment === "staging"
                    ? "warning"
                    : "secondary"
              }
            >
              {project.environment}
            </Badge>
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {secrets.projectId}
          </p>
        </div>
        <Link href="#invite" className={buttonStyles({ size: "sm" })}>
          Invite member
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Members
          </p>
          <p className="mt-2 text-2xl font-semibold">{project.members}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Active platforms
          </p>
          <p className="mt-2 text-2xl font-semibold">
            {enabledPlatforms.length}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              of {platforms.length}
            </span>
          </p>
        </Card>
      </div>

      <ProjectTabs
        projectId={id}
        platforms={platforms}
        users={users}
        webhook={webhook}
        secrets={secrets}
        connectors={
          runtimeConfig?.connectors ?? {
            imessage: { status: "connected", connectedAt: null, scopes: [] },
            gmail: { status: "disconnected", connectedAt: null, scopes: [] },
            calendar: { status: "disconnected", connectedAt: null, scopes: [] },
            telegram: { status: "disconnected", connectedAt: null, scopes: [] },
            x: { status: "disconnected", connectedAt: null, scopes: [] },
          }
        }
        globalConnectors={globalConnectors}
        enabledConnectors={enabledConnectors}
        policy={
          runtimeConfig?.policy ?? {
            gmail: {
              blockSenders: [],
              allowSenders: [],
              redactOtp: true,
              redactAuthCodes: true,
              redactFinance: true,
              redactPrivateAttachments: true,
              subjectDenyPatterns: [],
            },
            telegram: { blockChats: [], allowChats: [], redactPersonalDms: true },
            x: { blockKeywords: [], readDirectMessages: false },
          }
        }
        enabledTools={runtimeConfig?.enabledTools ?? []}
      />
    </div>
  );
}
