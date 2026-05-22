import { fetchProjectSecrets } from "./api";
import { listConnectorStates } from "./oauth-tokens";
import { getPolicyOverride } from "./policy-store";
import { getEnabledToolsOverride } from "./enabled-tools-store";
import { getProjectConnectorsOverride } from "./project-connectors-store";

// Connections are stored once at the workspace level, under this reserved
// scope id in the oauthTokens store. Projects then opt in per connector.
export const GLOBAL_SCOPE = "__global__";

// Connectors that are connected globally and toggled per project. iMessage is a
// platform binding rather than an OAuth/bot connection, so it isn't toggled here.
export const OAUTH_CONNECTORS: ConnectorId[] = [
  "gmail",
  "calendar",
  "telegram",
  "x",
];

export type GmailPolicy = {
  blockSenders: string[];
  allowSenders: string[];
  redactOtp: boolean;
  redactAuthCodes: boolean;
  redactFinance: boolean;
  redactPrivateAttachments: boolean;
  subjectDenyPatterns: string[];
};

export type TelegramPolicy = {
  blockChats: string[];
  allowChats: string[];
  redactPersonalDms: boolean;
};

export type XPolicy = {
  blockKeywords: string[];
  readDirectMessages: boolean;
};

export type PrivacyPolicy = {
  gmail: GmailPolicy;
  telegram: TelegramPolicy;
  x: XPolicy;
};

export type ConnectorId = "imessage" | "gmail" | "calendar" | "telegram" | "x";

export type ConnectorState = {
  status: "connected" | "disconnected" | "expired";
  connectedAt: string | null;
  scopes: string[];
};

export type RuntimeConfig = {
  projectId: string;
  policy: PrivacyPolicy;
  connectors: Record<ConnectorId, ConnectorState>;
  enabledTools: string[];
  updatedAt: string;
};

const defaultPolicy: PrivacyPolicy = {
  gmail: {
    blockSenders: [],
    allowSenders: [],
    redactOtp: true,
    redactAuthCodes: true,
    redactFinance: true,
    redactPrivateAttachments: true,
    subjectDenyPatterns: [],
  },
  telegram: {
    blockChats: [],
    allowChats: [],
    redactPersonalDms: true,
  },
  x: {
    blockKeywords: [],
    readDirectMessages: false,
  },
};

const disconnected: ConnectorState = {
  status: "disconnected",
  connectedAt: null,
  scopes: [],
};

const defaultConnectors: Record<ConnectorId, ConnectorState> = {
  imessage: { status: "connected", connectedAt: "2026-05-10T12:00:00.000Z", scopes: ["messages.read", "messages.send"] },
  gmail: disconnected,
  calendar: disconnected,
  telegram: disconnected,
  x: disconnected,
};

const defaultEnabledTools = [
  "snapshot",
  "log_journal",
  "add_task",
  "complete_task",
  "snooze_task",
  "drop_task",
  "remember_keyring",
  "schedule_reminder",
];

export const fallbackRuntimeConfigs: Record<string, RuntimeConfig> = {
  prj_iris: {
    projectId: "prj_iris",
    policy: {
      ...defaultPolicy,
      gmail: {
        ...defaultPolicy.gmail,
        blockSenders: ["@bank.com", "noreply@stripe.com"],
        subjectDenyPatterns: ["payslip", "salary"],
      },
    },
    connectors: {
      imessage: { status: "connected", connectedAt: "2026-05-10T12:00:00.000Z", scopes: ["messages.read", "messages.send"] },
      gmail: {
        status: "connected",
        connectedAt: "2026-05-12T09:24:00.000Z",
        scopes: [
          "gmail.readonly",
          "gmail.send",
          "gmail.labels",
          "contacts.readonly",
        ],
      },
      calendar: {
        status: "connected",
        connectedAt: "2026-05-12T09:24:00.000Z",
        scopes: ["calendar.events", "calendar.readonly"],
      },
      telegram: disconnected,
      x: { status: "connected", connectedAt: "2026-05-14T18:01:00.000Z", scopes: ["tweet.read", "users.read"] },
    },
    enabledTools: [...defaultEnabledTools, "x_watch_user", "x_unwatch_user", "x_list_watches", "x_digest_now"],
    updatedAt: "2026-05-15T19:38:51.000Z",
  },
  prj_kodama_sdk: {
    projectId: "prj_kodama_sdk",
    policy: defaultPolicy,
    connectors: defaultConnectors,
    enabledTools: defaultEnabledTools,
    updatedAt: "2026-05-13T10:00:00.000Z",
  },
  prj_ops: {
    projectId: "prj_ops",
    policy: defaultPolicy,
    connectors: defaultConnectors,
    enabledTools: defaultEnabledTools,
    updatedAt: "2026-05-11T09:15:00.000Z",
  },
};

// Workspace-level connection states (the "connect once" layer). Reflects ONLY
// real tokens stored under GLOBAL_SCOPE — so connecting writes a token and
// disconnecting clears it, and the UI stays in sync. iMessage is a platform
// binding (not an OAuth/bot connection) so it stays connected by default.
export async function getGlobalConnectorStates(): Promise<
  Record<ConnectorId, ConnectorState>
> {
  const live = await listConnectorStates(GLOBAL_SCOPE);
  return { ...defaultConnectors, ...live };
}

// The set of connectors a project is allowed to use. A stored override (from
// the project Integrations toggles) wins; otherwise default to whatever the
// project's fallback base had connected, which preserves the demo projects.
export async function getProjectEnabledConnectors(
  projectId: string,
): Promise<ConnectorId[]> {
  const override = await getProjectConnectorsOverride(projectId);
  if (override) {
    return override.filter((id): id is ConnectorId =>
      OAUTH_CONNECTORS.includes(id as ConnectorId),
    );
  }
  const base = fallbackRuntimeConfigs[projectId];
  if (!base) return [];
  return OAUTH_CONNECTORS.filter(
    (id) => base.connectors[id]?.status === "connected",
  );
}

export async function isConnectorEnabledForProject(
  projectId: string,
  connector: ConnectorId,
): Promise<boolean> {
  const enabled = await getProjectEnabledConnectors(projectId);
  return enabled.includes(connector);
}

export async function getRuntimeConfig(
  projectId: string,
): Promise<RuntimeConfig | null> {
  const base = fallbackRuntimeConfigs[projectId];
  if (!base) return null;
  // Two-layer connector resolution: a connector reaches the SDK only when it
  // is connected globally (the connect-once layer) AND enabled for this
  // project (the per-project toggle). Policy + enabledTools overrides layer on
  // top of fallback as before. The SDK sees one merged config.
  const [globalStates, enabledConnectors, policyOverride, toolsOverride] =
    await Promise.all([
      getGlobalConnectorStates(),
      getProjectEnabledConnectors(projectId),
      getPolicyOverride(projectId),
      getEnabledToolsOverride(projectId),
    ]);

  const connectors: Record<ConnectorId, ConnectorState> = {
    ...base.connectors,
    // iMessage is a platform binding, not a toggled connection — keep base.
    imessage: globalStates.imessage ?? base.connectors.imessage,
  };
  const enabledSet = new Set(enabledConnectors);
  for (const id of OAUTH_CONNECTORS) {
    const global = globalStates[id];
    const live = global?.status === "connected" && enabledSet.has(id);
    connectors[id] = live
      ? { status: "connected", connectedAt: global.connectedAt, scopes: global.scopes }
      : disconnected;
  }

  return {
    ...base,
    policy: policyOverride ?? base.policy,
    connectors,
    enabledTools: toolsOverride ?? base.enabledTools,
  };
}

export async function verifyProjectSecret(
  projectId: string,
  secret: string,
): Promise<boolean> {
  // Secrets are dynamic: Convex when configured, else generated per process
  // (see fetchProjectSecrets). Used by every SDK-facing route to gate access.
  const stored = await fetchProjectSecrets(projectId);
  return constantTimeEqual(stored.secretKey, secret);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
