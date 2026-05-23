"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ConnectorId, ConnectorState } from "@/lib/runtime-config";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { ArrowUpRightIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

type IntegrationDef = {
  id: ConnectorId;
  name: string;
  description: string;
  icon: React.ReactNode;
  scopeLabels: Record<string, string>;
  provider: "google" | "telegram" | "other";
};

const SUPPORTED: IntegrationDef[] = [
  {
    id: "gmail",
    name: "Gmail",
    description:
      "Read, summarize, and send mail through your personal Gmail. Subject to your privacy policy — financial mail, OTPs and attachments are redacted by default.",
    provider: "google",
    scopeLabels: {
      "https://www.googleapis.com/auth/gmail.readonly": "Read and search your mail",
      "https://www.googleapis.com/auth/gmail.send": "Send mail on your behalf",
      "https://www.googleapis.com/auth/gmail.labels": "See and edit email labels",
      "https://www.googleapis.com/auth/gmail.compose": "Manage drafts",
      "https://www.googleapis.com/auth/contacts.readonly": "See and download your contacts",
      "gmail.readonly": "Read and search your mail",
      "gmail.send": "Send mail on your behalf",
      "gmail.labels": "See and edit email labels",
      "gmail.compose": "Manage drafts",
      "contacts.readonly": "See and download your contacts",
    },
    icon: <GmailIcon />,
  },
  {
    id: "calendar",
    name: "Google Calendar",
    description:
      "Read your schedule so the agent can answer 'what's on my day' and create events when you ask. Honors busy/private event visibility.",
    provider: "google",
    scopeLabels: {
      "https://www.googleapis.com/auth/calendar.readonly": "See and download your calendars",
      "https://www.googleapis.com/auth/calendar.events": "View and edit events",
      "calendar.readonly": "See and download your calendars",
      "calendar.events": "View and edit events",
    },
    icon: <CalendarIcon />,
  },
  {
    id: "telegram",
    name: "Telegram",
    description:
      "Let this project read and reply to messages addressed to your connected Telegram bot. Personal-account (MTProto) access is on the roadmap.",
    provider: "telegram",
    scopeLabels: {
      "bot.read": "Read messages sent to the bot",
      "bot.send": "Send messages from the bot",
    },
    icon: <TelegramRoundIcon />,
  },
];

export function IntegrationsPanel({
  projectId,
  global,
  enabled,
}: {
  projectId: string;
  global: Record<ConnectorId, ConnectorState>;
  enabled: ConnectorId[];
}) {
  const router = useRouter();
  const [enabledSet, setEnabledSet] = React.useState<Set<ConnectorId>>(
    () => new Set(enabled),
  );
  const [pending, setPending] = React.useState<ConnectorId | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Re-sync local state when the server payload changes (e.g. after a global
  // connect/disconnect elsewhere + router.refresh()). Adjusting state during
  // render is the React-recommended alternative to a setState-in-effect.
  const [prevEnabled, setPrevEnabled] = React.useState(enabled);
  if (prevEnabled !== enabled) {
    setPrevEnabled(enabled);
    setEnabledSet(new Set(enabled));
  }

  const persist = React.useCallback(
    async (next: Set<ConnectorId>) => {
      setError(null);
      const resp = await fetch(
        `/api/v1/projects/${encodeURIComponent(projectId)}/runtime`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ connectors: [...next] }),
        },
      );
      if (!resp.ok) {
        const json = (await resp.json().catch(() => ({}))) as { message?: string };
        throw new Error(json.message ?? `request failed (${resp.status})`);
      }
    },
    [projectId],
  );

  const toggle = async (id: ConnectorId) => {
    if (global[id]?.status !== "connected") return; // can't enable a disconnected integration
    const next = new Set(enabledSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    // Optimistic update, roll back on failure.
    const previous = enabledSet;
    setEnabledSet(next);
    setPending(id);
    try {
      await persist(next);
      router.refresh();
    } catch (cause) {
      setEnabledSet(previous);
      setError((cause as Error).message);
    } finally {
      setPending(null);
    }
  };

  const connectedCount = SUPPORTED.filter(
    (d) => global[d.id]?.status === "connected",
  ).length;

  return (
    <div className="space-y-4">
      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Connections are managed once at the workspace level. Here you choose
          which of them <span className="font-medium text-foreground">this project</span> is
          allowed to use — gated by the project&apos;s privacy policy. Turning a
          connection off here stops the agent from using it for this project only.
        </p>
        <Link
          href="/dashboard/integrations"
          className={cn(buttonStyles({ size: "sm", variant: "outline" }))}
        >
          Manage connections
          <ArrowUpRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      {connectedCount === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm font-medium">No connections in this workspace yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Connect Gmail, Calendar or Telegram once on the Integrations page,
            then flip them on for this project.
          </p>
          <Link
            href="/dashboard/integrations"
            className={cn(buttonStyles({ size: "sm" }), "mt-4")}
          >
            Go to Integrations
            <ArrowUpRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}

      {SUPPORTED.map((def) => (
        <IntegrationToggleCard
          key={def.id}
          def={def}
          global={global[def.id]}
          enabled={enabledSet.has(def.id)}
          busy={pending === def.id}
          onToggle={() => toggle(def.id)}
        />
      ))}
    </div>
  );
}

function IntegrationToggleCard({
  def,
  global,
  enabled,
  busy,
  onToggle,
}: {
  def: IntegrationDef;
  global: ConnectorState | undefined;
  enabled: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  const globallyConnected = global?.status === "connected";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition hover:border-foreground/15">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-muted">
            {def.icon}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight">{def.name}</h3>
              {globallyConnected ? (
                enabled ? (
                  <Badge variant="success" className="font-medium">
                    <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-300" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="secondary">Off for this project</Badge>
                )
              ) : (
                <Badge variant="warning">Not connected</Badge>
              )}
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {def.description}
            </p>
          </div>
        </div>

        <div className="flex flex-none items-center gap-2">
          {globallyConnected ? (
            <Toggle
              checked={enabled}
              busy={busy}
              onChange={onToggle}
              label={`Use ${def.name} in this project`}
            />
          ) : (
            <Link
              href="/dashboard/integrations"
              className={cn(buttonStyles({ size: "sm" }))}
            >
              Connect first
              <ArrowUpRightIcon className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {globallyConnected && enabled && global ? (
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-[0.16em]">Granted scopes</span>
            {global.connectedAt ? (
              <>
                <span aria-hidden>·</span>
                <span>
                  Connected{" "}
                  <time dateTime={global.connectedAt}>
                    {new Date(global.connectedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    })}
                  </time>
                </span>
              </>
            ) : null}
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {global.scopes.map((scope) => (
              <li
                key={scope}
                className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs"
              >
                <CheckMark />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {def.scopeLabels[scope] ?? scope}
                  </p>
                  <p className="truncate font-mono text-[10px] text-muted-foreground">
                    {scope}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Toggle({
  checked,
  busy,
  onChange,
  label,
}: {
  checked: boolean;
  busy: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={busy}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 flex-none items-center rounded-full transition",
        checked ? "bg-foreground" : "bg-muted",
        busy ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-background shadow-sm transition",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function CheckMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 flex-none text-emerald-500"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

// ─────────── Brand icons ───────────

function GmailIcon() {
  return (
    <svg viewBox="0 0 32 32" width={22} height={22} aria-hidden>
      <path d="M5 9.2v13.5C5 23.97 6.03 25 7.3 25H10V15.6L5 12V9.2Z" fill="#4285F4" />
      <path d="M22 25h2.7c1.27 0 2.3-1.03 2.3-2.3V9.2L22 12v13Z" fill="#34A853" />
      <path d="m22 12 5-3.3V8c0-1.27-1.03-2.3-2.3-2.3-.46 0-.91.13-1.3.39L22 7v5Z" fill="#FBBC04" />
      <path d="M10 15.6 16 19l6-3.4V12l-6 4-6-4v3.6Z" fill="#C5221F" />
      <path d="M5 9.2 10 12V7L7.6 5.69C7.21 5.43 6.76 5.3 6.3 5.3 5.03 5.3 4 6.33 4 7.6c0 .56.34 1.07 1 1.6Z" fill="#EA4335" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 32 32" width={22} height={22} aria-hidden>
      <rect x="5" y="6" width="22" height="22" rx="3" fill="#fff" />
      <path d="M5 11h22V9a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3v2Z" fill="#4285F4" />
      <rect x="10" y="15" width="12" height="9" rx="1.5" fill="white" />
      <text x="16" y="22.5" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="7.5" fontWeight="700" fill="#4285F4">
        16
      </text>
      <rect x="8" y="4" width="2" height="6" rx="1" fill="#34A853" />
      <rect x="22" y="4" width="2" height="6" rx="1" fill="#EA4335" />
    </svg>
  );
}

function TelegramRoundIcon() {
  return (
    <svg viewBox="0 0 20 20" width={22} height={22} fill="none" aria-hidden>
      <g clipPath="url(#integ-tg-clip)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M20 10C20 15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10ZM10.3584 7.38244C9.38571 7.787 7.44178 8.62433 4.52658 9.89443C4.05319 10.0827 3.80521 10.2668 3.78264 10.4469C3.74449 10.7512 4.12559 10.8711 4.64456 11.0343C4.71515 11.0565 4.78829 11.0795 4.86328 11.1038C5.37386 11.2698 6.06069 11.464 6.41774 11.4717C6.74162 11.4787 7.10311 11.3452 7.5022 11.0711C10.226 9.2325 11.632 8.30317 11.7203 8.28314C11.7825 8.26901 11.8688 8.25123 11.9273 8.3032C11.9858 8.35518 11.98 8.4536 11.9738 8.48C11.9361 8.64095 10.4401 10.0317 9.66593 10.7515C9.42459 10.9759 9.25339 11.135 9.2184 11.1714C9.14 11.2528 9.06011 11.3298 8.98332 11.4038C8.50897 11.8611 8.15326 12.204 9.00301 12.764C9.41137 13.0331 9.73814 13.2556 10.0641 13.4776C10.4201 13.7201 10.7752 13.9619 11.2347 14.2631C11.3517 14.3398 11.4635 14.4195 11.5724 14.4971C11.9867 14.7925 12.359 15.0578 12.8188 15.0155C13.086 14.9909 13.3621 14.7397 13.5022 13.9903C13.8335 12.2193 14.4847 8.38205 14.6352 6.80081C14.6484 6.66227 14.6318 6.48498 14.6185 6.40715C14.6051 6.32931 14.5773 6.21842 14.4761 6.13633C14.3563 6.03911 14.1714 6.01861 14.0886 6.02007C13.7125 6.0267 13.1355 6.22735 10.3584 7.38244Z"
          fill="#149EE4"
        />
      </g>
      <defs>
        <clipPath id="integ-tg-clip">
          <rect fill="white" height="20" width="20" />
        </clipPath>
      </defs>
    </svg>
  );
}
