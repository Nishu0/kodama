import { fetchProjects } from "@/lib/api";
import {
  getGlobalConnectorStates,
  getProjectEnabledConnectors,
} from "@/lib/runtime-config";
import { IntegrationsBrowser } from "@/components/integrations/integrations-browser";
import type {
  CatalogEntry,
  GlobalIntegration,
} from "@/components/integrations/types";

const CATALOG: CatalogEntry[] = [
  {
    id: "gmail",
    name: "Gmail",
    description:
      "Read, summarize, and send mail through a personal Gmail. Subject to each project's privacy policy — OTPs, financial mail, and private attachments are redacted by default.",
    category: "Email",
    method: "OAuth · Google",
    provider: "google",
  },
  {
    id: "calendar",
    name: "Google Calendar",
    description:
      "Let the agent answer 'what's on my day' and create events on request. Honors busy/private event visibility.",
    category: "Calendar",
    method: "OAuth · Google",
    provider: "google",
  },
  {
    id: "telegram",
    name: "Telegram",
    description:
      "Connect a Telegram bot so your Kodama projects can read and reply to messages addressed to it. Personal-account (MTProto) access is on the roadmap.",
    category: "Messaging",
    method: "Bot token",
    provider: "telegram",
  },
];

export default async function IntegrationsPage() {
  const [projects, globalStates] = await Promise.all([
    fetchProjects(),
    getGlobalConnectorStates(),
  ]);

  // For each project, which connectors it has enabled — so we can show where a
  // global connection is actually in use.
  const enabledByProject = await Promise.all(
    projects.map(async (project) => ({
      project,
      enabled: await getProjectEnabledConnectors(project.id),
    })),
  );

  const integrations: GlobalIntegration[] = CATALOG.map((entry) => {
    const enabledProjects = enabledByProject
      .filter((row) => row.enabled.includes(entry.id))
      .map((row) => ({ id: row.project.id, name: row.project.name }));
    return {
      ...entry,
      state: globalStates[entry.id] ?? {
        status: "disconnected",
        connectedAt: null,
        scopes: [],
      },
      enabledProjects,
      totalProjects: projects.length,
    };
  });

  const connectedCount = integrations.filter(
    (i) => i.state.status === "connected",
  ).length;
  const disconnectedCount = integrations.length - connectedCount;
  const totalEnablements = integrations.reduce(
    (sum, i) => sum + i.enabledProjects.length,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Connect a personal account <span className="font-medium text-foreground">once</span> here,
            then toggle it on for individual projects from each project&apos;s
            Integrations tab. Every read is gated by the project&apos;s privacy policy.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Available integrations"
          value={integrations.length}
          hint="In the catalogue"
        />
        <SummaryCard
          label="Connected"
          value={connectedCount}
          hint="Workspace connections"
          accent
        />
        <SummaryCard
          label="Disconnected"
          value={disconnectedCount}
          hint="Available to connect"
        />
        <SummaryCard
          label="In use"
          value={totalEnablements}
          hint={`Across ${projects.length} project${projects.length === 1 ? "" : "s"}`}
        />
      </div>

      <IntegrationsBrowser items={integrations} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={
          accent
            ? "mt-3 text-3xl font-semibold tracking-tight text-emerald-600 tabular-nums dark:text-emerald-400"
            : "mt-3 text-3xl font-semibold tracking-tight tabular-nums"
        }
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
