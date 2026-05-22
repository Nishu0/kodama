import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getRuntimeConfig,
  verifyProjectSecret,
  OAUTH_CONNECTORS,
  type ConnectorId,
  type PrivacyPolicy,
} from "@/lib/runtime-config";
import { savePolicyOverride } from "@/lib/policy-store";
import { saveEnabledToolsOverride } from "@/lib/enabled-tools-store";
import { saveProjectConnectorsOverride } from "@/lib/project-connectors-store";
import { ALL_TOOL_NAMES } from "@/lib/tools-catalog";

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
  const token = bearerOf(request.headers.get("authorization"));

  if (!token) {
    return NextResponse.json(
      { error: "missing_authorization", message: "Authorization: Bearer <projectSecret> required" },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="kodama"' } },
    );
  }

  if (!(await verifyProjectSecret(id, token))) {
    return NextResponse.json(
      { error: "invalid_credentials", message: "project id and secret do not match" },
      { status: 401 },
    );
  }

  const config = await getRuntimeConfig(id);
  if (!config) {
    return NextResponse.json(
      { error: "project_not_found", message: `no runtime config for project ${id}` },
      { status: 404 },
    );
  }

  return NextResponse.json(config, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  });
}

type PatchBody = {
  policy?: Partial<PrivacyPolicy>;
  enabledTools?: string[];
  connectors?: string[];
};

function validateConnectors(input: unknown): ConnectorId[] | { error: string } {
  if (!Array.isArray(input)) return { error: "connectors must be array" };
  const out: ConnectorId[] = [];
  for (const item of input) {
    if (typeof item !== "string") return { error: "connectors items must be strings" };
    if (!OAUTH_CONNECTORS.includes(item as ConnectorId)) {
      return { error: `unknown or non-toggleable connector: ${item}` };
    }
    if (!out.includes(item as ConnectorId)) out.push(item as ConnectorId);
  }
  return out;
}

function validateEnabledTools(input: unknown): string[] | { error: string } {
  if (!Array.isArray(input)) return { error: "enabledTools must be array" };
  const out: string[] = [];
  for (const item of input) {
    if (typeof item !== "string") return { error: "enabledTools items must be strings" };
    if (!ALL_TOOL_NAMES.includes(item)) {
      return { error: `unknown tool: ${item}` };
    }
    if (!out.includes(item)) out.push(item);
  }
  return out;
}

function validatePolicy(input: unknown): PrivacyPolicy | { error: string } {
  if (!input || typeof input !== "object") return { error: "policy must be object" };
  const obj = input as Record<string, unknown>;

  const requireSection = (name: keyof PrivacyPolicy): unknown => {
    const value = obj[name as string];
    if (!value || typeof value !== "object") {
      throw new Error(`missing or invalid section: ${String(name)}`);
    }
    return value;
  };

  try {
    const gmail = requireSection("gmail") as Record<string, unknown>;
    const telegram = requireSection("telegram") as Record<string, unknown>;
    const x = requireSection("x") as Record<string, unknown>;

    const stringArray = (value: unknown, field: string): string[] => {
      if (!Array.isArray(value)) throw new Error(`${field} must be array`);
      return value.map((item) => {
        if (typeof item !== "string") throw new Error(`${field} items must be strings`);
        return item;
      });
    };
    const boolean = (value: unknown, field: string): boolean => {
      if (typeof value !== "boolean") throw new Error(`${field} must be boolean`);
      return value;
    };

    return {
      gmail: {
        blockSenders: stringArray(gmail.blockSenders, "gmail.blockSenders"),
        allowSenders: stringArray(gmail.allowSenders, "gmail.allowSenders"),
        redactOtp: boolean(gmail.redactOtp, "gmail.redactOtp"),
        redactAuthCodes: boolean(gmail.redactAuthCodes, "gmail.redactAuthCodes"),
        redactFinance: boolean(gmail.redactFinance, "gmail.redactFinance"),
        redactPrivateAttachments: boolean(
          gmail.redactPrivateAttachments,
          "gmail.redactPrivateAttachments",
        ),
        subjectDenyPatterns: stringArray(
          gmail.subjectDenyPatterns,
          "gmail.subjectDenyPatterns",
        ),
      },
      telegram: {
        blockChats: stringArray(telegram.blockChats, "telegram.blockChats"),
        allowChats: stringArray(telegram.allowChats, "telegram.allowChats"),
        redactPersonalDms: boolean(telegram.redactPersonalDms, "telegram.redactPersonalDms"),
      },
      x: {
        blockKeywords: stringArray(x.blockKeywords, "x.blockKeywords"),
        readDirectMessages: boolean(x.readDirectMessages, "x.readDirectMessages"),
      },
    };
  } catch (cause) {
    return { error: (cause as Error).message };
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Dashboard-facing mutation. Uses NextAuth session rather than the
  // SDK-side bearer token so we can attribute changes to a specific user.
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { id } = await params;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.policy && !body.enabledTools && !body.connectors) {
    return NextResponse.json(
      {
        error: "nothing_to_update",
        message: "expected at least one of `policy`, `enabledTools` or `connectors`",
      },
      { status: 400 },
    );
  }

  const editor =
    session.user?.email ?? session.user?.name ?? undefined;

  if (body.policy) {
    const validated = validatePolicy(body.policy);
    if ("error" in validated) {
      return NextResponse.json(
        { error: "invalid_policy", message: validated.error },
        { status: 400 },
      );
    }
    await savePolicyOverride(id, validated, editor);
  }

  if (body.enabledTools) {
    const validatedTools = validateEnabledTools(body.enabledTools);
    if ("error" in validatedTools) {
      return NextResponse.json(
        { error: "invalid_enabled_tools", message: validatedTools.error },
        { status: 400 },
      );
    }
    await saveEnabledToolsOverride(id, validatedTools, editor);
  }

  if (body.connectors) {
    const validatedConnectors = validateConnectors(body.connectors);
    if ("error" in validatedConnectors) {
      return NextResponse.json(
        { error: "invalid_connectors", message: validatedConnectors.error },
        { status: 400 },
      );
    }
    await saveProjectConnectorsOverride(id, validatedConnectors, editor);
  }

  const config = await getRuntimeConfig(id);
  if (!config) {
    return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  }

  return NextResponse.json(config, {
    headers: { "Cache-Control": "no-store" },
  });
}
