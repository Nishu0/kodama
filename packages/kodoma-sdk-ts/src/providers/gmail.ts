// Gmail provider. Polls the user's mailbox at a configurable cadence, applies
// the per-project privacy policy (passed in via runtime config), and emits
// each surviving email as a custom-content ProviderMessage.
//
// Access tokens come from the dashboard's `/api/v1/connectors/gmail/token`
// endpoint — the SDK never sees refresh tokens.
//
// Send is intentionally unimplemented for v1. Receive is the value driver;
// outbound mail is a follow-up that needs threading + RFC822 building.

import { definePlatform } from "../definePlatform";
import type {
  ConnectorState,
  GmailPolicy,
  PrivacyPolicy
} from "../config";
import type { ProviderMessage } from "../types";
import {
  judgeEmail,
  redactEmail,
  type EmailShape,
  type PolicyVerdict
} from "./gmail-policy";

export interface GmailProviderConfig {
  pollIntervalMs: number;
  /**
   * Gmail search query for the initial scan. Defaults to "is:unread newer_than:1d".
   * Subsequent polls always use `historyId` deltas.
   */
  initialQuery: string;
  /** Cap on emails fetched per poll. */
  maxPerPoll: number;
}

export interface GmailEmailContent {
  type: "custom";
  raw: {
    kind: "email";
    id: string;
    threadId: string;
    from: string;
    to: string[];
    subject: string;
    snippet: string;
    body: string;
    hasAttachments: boolean;
    labels: string[];
    receivedAt: string;
    verdict: PolicyVerdict;
  };
}

interface GmailClient {
  projectId: string;
  projectSecret: string;
  baseUrl: string;
  fetcher: typeof fetch;
  policy: GmailPolicy;
  connector: ConnectorState | null;
  config: GmailProviderConfig;
  stopped: boolean;
  lastHistoryId: string | null;
  seen: Set<string>;
  cachedToken: { value: string; expiresAt: number } | null;
}

const DEFAULT_BASE_URL = "https://api.kodama.dev";
const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

function resolveBaseUrl(baseUrl?: string): string {
  if (baseUrl) return baseUrl.replace(/\/$/, "");
  const fromEnv =
    typeof process !== "undefined" && process.env
      ? process.env.KODAMA_API_URL
      : undefined;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return DEFAULT_BASE_URL;
}

function defaultGmailPolicy(): GmailPolicy {
  return {
    blockSenders: [],
    allowSenders: [],
    redactOtp: true,
    redactAuthCodes: true,
    redactFinance: true,
    redactPrivateAttachments: true,
    subjectDenyPatterns: []
  };
}

async function fetchAccessToken(client: GmailClient): Promise<string | null> {
  if (
    client.cachedToken &&
    client.cachedToken.expiresAt - 60_000 > Date.now()
  ) {
    return client.cachedToken.value;
  }
  const url = `${client.baseUrl}/api/v1/connectors/gmail/token?projectId=${encodeURIComponent(client.projectId)}`;
  const resp = await client.fetcher(url, {
    headers: { Authorization: `Bearer ${client.projectSecret}` }
  });
  if (!resp.ok) {
    return null;
  }
  const body = (await resp.json()) as { accessToken: string; expiresAt?: number };
  if (!body.accessToken) return null;
  client.cachedToken = {
    value: body.accessToken,
    expiresAt: body.expiresAt ?? Date.now() + 30 * 60_000
  };
  return body.accessToken;
}

async function gmailGet<T>(
  client: GmailClient,
  path: string,
  accessToken: string
): Promise<T | null> {
  const resp = await client.fetcher(`${GMAIL_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!resp.ok) {
    if (resp.status === 401) {
      // Force a refresh next time around.
      client.cachedToken = null;
    }
    return null;
  }
  return (await resp.json()) as T;
}

type GmailHeader = { name: string; value: string };
type GmailPart = {
  partId?: string;
  mimeType?: string;
  filename?: string;
  body?: { data?: string; size?: number };
  parts?: GmailPart[];
  headers?: GmailHeader[];
};
type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailPart & { headers?: GmailHeader[] };
};
type GmailListResponse = {
  messages?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  historyId?: string;
};
type GmailHistoryResponse = {
  history?: Array<{ messagesAdded?: Array<{ message: { id: string; threadId: string } }> }>;
  historyId?: string;
  nextPageToken?: string;
};

function headerValue(headers: GmailHeader[] | undefined, name: string): string {
  if (!headers) return "";
  const found = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return found?.value ?? "";
}

function decodeBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  try {
    if (typeof atob === "function") {
      return atob(padded + pad);
    }
    return Buffer.from(padded + pad, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function collectBody(part: GmailPart | undefined): {
  body: string;
  hasAttachments: boolean;
} {
  let text = "";
  let hasAttachments = false;
  const walk = (node: GmailPart | undefined) => {
    if (!node) return;
    if (node.filename && node.filename.length > 0) {
      hasAttachments = true;
    }
    if (node.mimeType === "text/plain" && node.body?.data) {
      text += decodeBase64Url(node.body.data) + "\n";
    } else if (
      node.mimeType === "text/html" &&
      node.body?.data &&
      text.length === 0
    ) {
      // Fall back to HTML body when no plain-text part is available, stripped of tags.
      const html = decodeBase64Url(node.body.data);
      text += html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() + "\n";
    }
    for (const child of node.parts ?? []) walk(child);
  };
  walk(part);
  return { body: text.trim(), hasAttachments };
}

function toEmailShape(msg: GmailMessage): EmailShape {
  const headers = msg.payload?.headers ?? [];
  const { body, hasAttachments } = collectBody(msg.payload);
  return {
    id: msg.id,
    from: headerValue(headers, "From"),
    subject: headerValue(headers, "Subject"),
    snippet: msg.snippet ?? "",
    body,
    hasAttachments,
    labels: msg.labelIds ?? []
  };
}

async function fetchNewMessageIds(
  client: GmailClient,
  accessToken: string
): Promise<{ ids: string[]; historyId: string | null }> {
  if (client.lastHistoryId) {
    const history = await gmailGet<GmailHistoryResponse>(
      client,
      `/history?startHistoryId=${encodeURIComponent(client.lastHistoryId)}`,
      accessToken
    );
    if (!history) return { ids: [], historyId: client.lastHistoryId };
    const added = (history.history ?? []).flatMap(
      (h) => h.messagesAdded?.map((m) => m.message.id) ?? []
    );
    const newHistoryId = history.historyId ?? client.lastHistoryId;
    return { ids: added, historyId: newHistoryId };
  }

  const q = encodeURIComponent(client.config.initialQuery);
  const list = await gmailGet<GmailListResponse>(
    client,
    `/messages?q=${q}&maxResults=${client.config.maxPerPoll}`,
    accessToken
  );
  if (!list) return { ids: [], historyId: null };
  const ids = (list.messages ?? []).map((m) => m.id);
  return { ids, historyId: list.historyId ?? null };
}

async function* pollMessages(
  client: GmailClient
): AsyncGenerator<ProviderMessage<{ raw: GmailMessage; verdict: PolicyVerdict }>> {
  while (!client.stopped) {
    if (!client.connector || client.connector.status !== "connected") {
      await sleep(client.config.pollIntervalMs, client);
      continue;
    }
    const accessToken = await fetchAccessToken(client);
    if (!accessToken) {
      await sleep(client.config.pollIntervalMs, client);
      continue;
    }

    const { ids, historyId } = await fetchNewMessageIds(client, accessToken);
    if (historyId) client.lastHistoryId = historyId;

    for (const id of ids) {
      if (client.stopped) return;
      if (client.seen.has(id)) continue;
      client.seen.add(id);

      const msg = await gmailGet<GmailMessage>(
        client,
        `/messages/${encodeURIComponent(id)}?format=full`,
        accessToken
      );
      if (!msg) continue;

      const email = toEmailShape(msg);
      const verdict = judgeEmail(email, client.policy);
      if (verdict.action === "skip") continue;
      const safe = redactEmail(email, verdict);

      const to = (msg.payload?.headers ?? [])
        .filter((h) => h.name.toLowerCase() === "to")
        .flatMap((h) => h.value.split(",").map((s) => s.trim()));

      const content: GmailEmailContent = {
        type: "custom",
        raw: {
          kind: "email",
          id: msg.id,
          threadId: msg.threadId,
          from: safe.from,
          to,
          subject: safe.subject,
          snippet: safe.snippet,
          body: safe.body ?? "",
          hasAttachments: safe.hasAttachments,
          labels: safe.labels,
          receivedAt: msg.internalDate
            ? new Date(Number(msg.internalDate)).toISOString()
            : new Date().toISOString(),
          verdict
        }
      };

      yield {
        id: msg.id,
        sender: { id: safe.from },
        space: { id: msg.threadId },
        content: content as never,
        timestamp: msg.internalDate
          ? new Date(Number(msg.internalDate))
          : new Date(),
        extra: { raw: msg, verdict }
      };
    }

    await sleep(client.config.pollIntervalMs, client);
  }
}

async function sleep(ms: number, client: GmailClient): Promise<void> {
  // Wake up early if the provider is stopping so destroyClient is responsive.
  const step = Math.min(ms, 500);
  let remaining = ms;
  while (remaining > 0) {
    if (client.stopped) return;
    await new Promise((resolve) => setTimeout(resolve, step));
    remaining -= step;
  }
}

export const gmail = definePlatform<"gmail", GmailProviderConfig, GmailClient, {
  raw: GmailMessage;
  verdict: PolicyVerdict;
}>("gmail", {
  configDefault: {
    pollIntervalMs: 60_000,
    initialQuery: "is:unread newer_than:1d",
    maxPerPoll: 25
  },
  lifecycle: {
    async createClient({ config, projectId, projectSecret, policy, connectors }) {
      if (!projectId || !projectSecret) {
        throw new Error(
          "gmail provider requires projectId + projectSecret. Without project credentials there's no way to fetch a Google access token."
        );
      }
      const gmailPolicy = (policy as PrivacyPolicy | undefined)?.gmail ?? defaultGmailPolicy();
      const connector = connectors?.gmail ?? null;
      if (connector && connector.status !== "connected") {
        console.warn(
          `[kodoma-ts] gmail connector status is "${connector.status}" — provider will keep polling but emit nothing until reconnected.`
        );
      }
      return {
        projectId,
        projectSecret,
        baseUrl: resolveBaseUrl(),
        fetcher: globalThis.fetch,
        policy: gmailPolicy,
        connector,
        config,
        stopped: false,
        lastHistoryId: null,
        seen: new Set<string>(),
        cachedToken: null
      };
    },
    async destroyClient({ client }) {
      client.stopped = true;
    }
  },
  events: {
    messages({ client }) {
      return pollMessages(client);
    }
  },
  actions: {
    async send() {
      throw new Error(
        "gmail.send is not yet implemented in kodoma-ts; reach for the Gmail HTTP API directly for now."
      );
    }
  }
});
