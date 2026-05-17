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

export class KodamaConfigError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "KodamaConfigError";
  }
}

function resolveBaseUrl(baseUrl?: string): string {
  if (baseUrl) return baseUrl.replace(/\/$/, "");
  const fromEnv =
    typeof process !== "undefined" && process.env
      ? process.env.KODAMA_API_URL
      : undefined;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://api.kodama.dev";
}

export async function fetchRuntimeConfig(args: {
  projectId: string;
  projectSecret: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
}): Promise<RuntimeConfig> {
  const fetcher = args.fetcher ?? globalThis.fetch;
  if (!fetcher) {
    throw new KodamaConfigError(
      "no fetch implementation available; pass `fetcher` explicitly when running outside the browser/node 18+",
    );
  }

  const url = `${resolveBaseUrl(args.baseUrl)}/api/v1/projects/${encodeURIComponent(args.projectId)}/runtime`;

  let response: Response;
  try {
    response = await fetcher(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${args.projectSecret}`,
        Accept: "application/json",
      },
    });
  } catch (cause) {
    throw new KodamaConfigError(
      `unable to reach kodama runtime config endpoint at ${url}: ${(cause as Error).message}`,
    );
  }

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => undefined);
    }
    throw new KodamaConfigError(
      `kodama runtime config request failed (${response.status})`,
      response.status,
      body,
    );
  }

  return (await response.json()) as RuntimeConfig;
}
