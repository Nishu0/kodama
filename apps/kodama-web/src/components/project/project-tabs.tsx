"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  Platform,
  PlatformId,
  ProjectSecrets,
  ProjectUser,
  ProjectWebhook,
} from "@/lib/api";
import type {
  ConnectorId,
  ConnectorState,
  PrivacyPolicy,
} from "@/lib/runtime-config";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnalyticsPanel } from "@/components/project/analytics-panel";
import { IntegrationsPanel } from "@/components/project/integrations-panel";
import { ObservabilityPanel } from "@/components/project/observability-panel";
import { PlatformIcon } from "@/components/project/platform-icons";
import { PolicyPanel } from "@/components/project/policy-panel";
import { ToolsPanel } from "@/components/project/tools-panel";
import { cn } from "@/lib/utils";

type TabKey =
  | "platforms"
  | "integrations"
  | "tools"
  | "policy"
  | "users"
  | "webhook"
  | "analytics"
  | "observability"
  | "settings";

const tabs: { key: TabKey; label: string }[] = [
  { key: "platforms", label: "Platforms" },
  { key: "integrations", label: "Integrations" },
  { key: "tools", label: "Tools" },
  { key: "policy", label: "Policy" },
  { key: "users", label: "Users" },
  { key: "webhook", label: "Webhook" },
  { key: "analytics", label: "Analytics" },
  { key: "observability", label: "Observability" },
  { key: "settings", label: "Settings" },
];

export function ProjectTabs({
  projectId,
  platforms,
  users,
  webhook,
  secrets,
  connectors,
  globalConnectors,
  enabledConnectors,
  policy,
  enabledTools,
}: {
  projectId: string;
  platforms: Platform[];
  users: ProjectUser[];
  webhook: ProjectWebhook;
  secrets: ProjectSecrets;
  connectors: Record<ConnectorId, ConnectorState>;
  globalConnectors: Record<ConnectorId, ConnectorState>;
  enabledConnectors: ConnectorId[];
  policy: PrivacyPolicy;
  enabledTools: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialTab = (() => {
    const raw = searchParams.get("tab");
    return tabs.some((t) => t.key === raw) ? (raw as TabKey) : "platforms";
  })();
  const [tab, setTab] = React.useState<TabKey>(initialTab);

  const selectTab = React.useCallback(
    (next: TabKey) => {
      setTab(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "platforms") {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div>
      <div className="border-b border-border">
        <nav className="-mb-px flex flex-wrap gap-1">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => selectTab(t.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors",
                    active ? "bg-foreground" : "bg-transparent",
                  )}
                />
              </button>
            );
          })}
        </nav>
      </div>

      <div className="pt-6">
        {tab === "platforms" && <PlatformsPanel initial={platforms} />}
        {tab === "integrations" && (
          <IntegrationsPanel
            projectId={projectId}
            global={globalConnectors}
            enabled={enabledConnectors}
          />
        )}
        {tab === "tools" && (
          <ToolsPanel
            projectId={projectId}
            initialEnabled={enabledTools}
            connectors={connectors}
          />
        )}
        {tab === "policy" && (
          <PolicyPanel projectId={projectId} initial={policy} />
        )}
        {tab === "users" && <UsersPanel users={users} />}
        {tab === "webhook" && <WebhookPanel webhook={webhook} />}
        {tab === "analytics" && <AnalyticsPanel projectId={projectId} />}
        {tab === "observability" && <ObservabilityPanel projectId={projectId} />}
        {tab === "settings" && <SettingsPanel secrets={secrets} />}
      </div>
    </div>
  );
}

// ─────────────────────────── Platforms ───────────────────────────

function PlatformsPanel({ initial }: { initial: Platform[] }) {
  const [items, setItems] = React.useState(initial);

  const toggle = (id: PlatformId) => {
    setItems((prev) =>
      prev.map((p) =>
        p.id === id && p.status !== "coming-soon"
          ? { ...p, status: p.status === "enabled" ? "disabled" : "enabled" }
          : p,
      ),
    );
  };

  return (
    <div className="space-y-4">
      {items.map((platform) => (
        <PlatformCard key={platform.id} platform={platform} onToggle={toggle} />
      ))}
    </div>
  );
}

function PlatformCard({
  platform,
  onToggle,
}: {
  platform: Platform;
  onToggle: (id: PlatformId) => void;
}) {
  const comingSoon = platform.status === "coming-soon";
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 transition",
        comingSoon ? "opacity-70" : "hover:border-foreground/15",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-muted">
            <PlatformIcon id={platform.id} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight">
                {platform.name}
              </h3>
              {comingSoon ? (
                <Badge variant="secondary" className="font-medium">
                  Coming Soon
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {platform.description}
            </p>
          </div>
        </div>
        <Toggle
          checked={platform.status === "enabled"}
          disabled={comingSoon}
          onChange={() => onToggle(platform.id)}
          label={`Enable ${platform.name}`}
        />
      </div>
    </div>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 flex-none items-center rounded-full transition",
        checked ? "bg-foreground" : "bg-muted",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
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

// ─────────────────────────── Users ───────────────────────────

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const roleBadge: Record<
  ProjectUser["role"],
  "default" | "secondary" | "success" | "warning"
> = {
  owner: "success",
  admin: "default",
  member: "secondary",
  viewer: "warning",
};

function UsersPanel({ users }: { users: ProjectUser[] }) {
  if (users.length === 0) {
    return (
      <EmptyState
        title="No members yet"
        body="Invite teammates to collaborate on this project."
      />
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead className="bg-muted/40">
          <tr className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
            <th className="px-4 py-3 font-medium">Member</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-t border-border/60">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar fallback={initials(user.name)} />
                  <span className="font-medium">{user.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
              <td className="px-4 py-3">
                <Badge variant={roleBadge[user.role]}>{user.role}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────── Webhook ───────────────────────────

function WebhookPanel({ webhook }: { webhook: ProjectWebhook }) {
  const [url, setUrl] = React.useState(webhook.url ?? "");

  if (!webhook.url) {
    return (
      <div className="space-y-4">
        <EmptyState
          title="No webhook configured"
          body="Receive a POST request whenever Kodama processes a message. Useful for forwarding events to your own systems or queueing background jobs."
        />
        <div className="rounded-2xl border border-border bg-card p-5">
          <label className="text-sm font-medium">Endpoint URL</label>
          <p className="mt-1 text-xs text-muted-foreground">
            HTTPS URL Kodama will POST events to.
          </p>
          <div className="mt-3 flex gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-app.com/webhooks/kodama"
              className="font-mono text-xs"
            />
            <Button size="sm">Save</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <label className="text-sm font-medium">Endpoint URL</label>
        <p className="mt-1 text-xs text-muted-foreground">
          HTTPS URL Kodama POSTs events to.
        </p>
        <div className="mt-3 flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="font-mono text-xs"
          />
          <Button size="sm" variant="outline">
            Update
          </Button>
          <Button size="sm" variant="outline">
            Send test
          </Button>
        </div>
      </div>

      {webhook.signingSecret ? (
        <SecretField
          label="Signing secret"
          hint="Use this to verify webhook signatures."
          value={webhook.signingSecret}
        />
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Subscribed events</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {webhook.events.length} event type
              {webhook.events.length === 1 ? "" : "s"} selected
            </p>
          </div>
          {webhook.lastDeliveryAt ? (
            <Badge variant="success">
              Last delivery {new Date(webhook.lastDeliveryAt).toLocaleString()}
            </Badge>
          ) : (
            <Badge variant="secondary">No deliveries yet</Badge>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {webhook.events.map((ev) => (
            <span
              key={ev}
              className="rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-xs"
            >
              {ev}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── Settings ───────────────────────────

function SettingsPanel({ secrets }: { secrets: ProjectSecrets }) {
  return (
    <div className="space-y-4">
      <Field
        label="Project ID"
        hint="Use this ID to identify your project in API requests."
        value={secrets.projectId}
        mono
      />
      <SecretField
        label="Secret Key"
        hint="Use this key to authenticate API requests. Keep your secret key secure and do not share it publicly — click the refresh icon to regenerate."
        value={secrets.secretKey}
        regenerable
      />
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  mono,
}: {
  label: string;
  hint?: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm font-semibold">{label}</p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
        <code
          className={cn(
            "flex-1 truncate text-sm",
            mono ? "font-mono" : "font-sans",
          )}
        >
          {value}
        </code>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

function SecretField({
  label,
  hint,
  value,
  regenerable,
}: {
  label: string;
  hint?: string;
  value: string;
  regenerable?: boolean;
}) {
  const [visible, setVisible] = React.useState(false);
  const [val, setVal] = React.useState(value);

  const regenerate = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      const fresh = `kdm_${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
      setVal(fresh);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm font-semibold">{label}</p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
        <code className="flex-1 truncate font-mono text-sm tracking-wider">
          {visible ? val : "•".repeat(Math.min(28, val.length))}
        </code>
        <CopyButton value={val} />
        <IconButton
          label={visible ? "Hide secret" : "Show secret"}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </IconButton>
        {regenerable ? (
          <IconButton label="Regenerate secret" onClick={regenerate}>
            <RefreshIcon />
          </IconButton>
        ) : null}
      </div>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <IconButton
      label={copied ? "Copied" : "Copy"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        } catch {
          // ignore
        }
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </IconButton>
  );
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-muted-foreground transition hover:bg-background hover:text-foreground"
    >
      {children}
    </button>
  );
}

// ─────────────────────────── Empty + Icons ───────────────────────────

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
      <p className="text-base font-semibold">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 2l20 20" />
      <path d="M6.7 6.7C4 8.4 2 12 2 12s3.5 7 10 7c2.1 0 3.9-.6 5.3-1.4" />
      <path d="M9.9 4.2A11 11 0 0 1 12 4c6.5 0 10 7 10 7-.7 1.4-1.6 2.6-2.5 3.5" />
      <path d="M9.5 9.5a3.5 3.5 0 0 0 5 5" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}
