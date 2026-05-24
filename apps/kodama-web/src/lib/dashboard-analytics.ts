// Workspace-wide analytics aggregation for the dashboard Analytics page.
// Pulls together what the rest of the app already tracks per project —
// metering usage, connector connections, and project metadata — into one
// global view. Read-only; safe to call from a server component.

import { fetchProjects, type Project } from "./api";
import {
  getGlobalConnectorStates,
  getProjectEnabledConnectors,
  OAUTH_CONNECTORS,
  type ConnectorId,
  type ConnectorState,
} from "./runtime-config";
import {
  seedDemoUsage,
  summarizeWorkspaceUsage,
  type Range,
  type WorkspaceUsageSummary,
} from "./usage";

const CONNECTOR_LABELS: Record<ConnectorId, string> = {
  imessage: "iMessage",
  gmail: "Gmail",
  calendar: "Google Calendar",
  telegram: "Telegram",
  x: "X",
};

export type IntegrationStat = {
  id: ConnectorId;
  label: string;
  connected: boolean;
  state: ConnectorState;
  enabledProjects: number;
};

export type DashboardAnalytics = {
  range: Range;
  projects: {
    total: number;
    byEnvironment: Array<{ environment: Project["environment"]; count: number }>;
    list: Array<{ id: string; name: string; environment: Project["environment"]; enabled: number }>;
  };
  integrations: {
    connected: number;
    available: number;
    totalEnablements: number;
    items: IntegrationStat[];
  };
  usage: WorkspaceUsageSummary;
};

export async function getDashboardAnalytics(
  options: { range?: Range; now?: number } = {},
): Promise<DashboardAnalytics> {
  const range = options.range ?? "week";
  const projects = await fetchProjects();

  // Seed demo metering in dev so the page renders something meaningful before
  // the SDK has reported anything (mirrors the /usage route behaviour).
  if (process.env.NODE_ENV !== "production") {
    for (const project of projects) seedDemoUsage(project.id, options.now);
  }

  const [globalStates, enabledByProject] = await Promise.all([
    getGlobalConnectorStates(),
    Promise.all(
      projects.map(async (project) => ({
        project,
        enabled: await getProjectEnabledConnectors(project.id),
      })),
    ),
  ]);

  const usage = summarizeWorkspaceUsage(
    projects.map((p) => p.id),
    { range, now: options.now },
  );

  // Projects breakdown.
  const envCounts = new Map<Project["environment"], number>();
  for (const p of projects) {
    envCounts.set(p.environment, (envCounts.get(p.environment) ?? 0) + 1);
  }
  const enabledCountByProject = new Map<string, number>();
  for (const row of enabledByProject) {
    enabledCountByProject.set(row.project.id, row.enabled.length);
  }

  // Integration stats.
  const items: IntegrationStat[] = OAUTH_CONNECTORS.map((id) => {
    const state = globalStates[id] ?? {
      status: "disconnected" as const,
      connectedAt: null,
      scopes: [],
    };
    const enabledProjects = enabledByProject.filter((row) =>
      row.enabled.includes(id),
    ).length;
    return {
      id,
      label: CONNECTOR_LABELS[id],
      connected: state.status === "connected",
      state,
      enabledProjects,
    };
  });

  const connected = items.filter((i) => i.connected).length;
  const totalEnablements = items.reduce((sum, i) => sum + i.enabledProjects, 0);

  return {
    range,
    projects: {
      total: projects.length,
      byEnvironment: [...envCounts.entries()].map(([environment, count]) => ({
        environment,
        count,
      })),
      list: projects.map((p) => ({
        id: p.id,
        name: p.name,
        environment: p.environment,
        enabled: enabledCountByProject.get(p.id) ?? 0,
      })),
    },
    integrations: {
      connected,
      available: items.length,
      totalEnablements,
      items,
    },
    usage,
  };
}
