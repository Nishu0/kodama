"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { ArrowUpRightIcon, SearchIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { GlobalIntegration } from "@/components/integrations/types";

// Reserved workspace scope — connections are stored once, not per project.
const GLOBAL_SCOPE = "__global__";
const RETURN_TO = "/dashboard/integrations";

const CONNECTOR_LABELS: Record<string, string> = {
  gmail: "Gmail",
  calendar: "Google Calendar",
  telegram: "Telegram",
  x: "X",
  imessage: "iMessage",
};
const labelFor = (id: string) => CONNECTOR_LABELS[id] ?? id;

type FilterKey = "all" | "connected" | "disconnected";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All apps" },
  { key: "connected", label: "Connected" },
  { key: "disconnected", label: "Disconnected" },
];

export function IntegrationsBrowser({
  items,
}: {
  items: GlobalIntegration[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [filter, setFilter] = React.useState<FilterKey>("all");
  const [query, setQuery] = React.useState("");

  // Toast on return from the OAuth round trip (?connector_connected /
  // ?connector_error), then strip the params from the URL. firedRef guards
  // against React's double-invoked effects in dev.
  const firedRef = React.useRef(false);
  React.useEffect(() => {
    const ok = searchParams.get("connector_connected");
    const err = searchParams.get("connector_error");
    if (!ok && !err) return;
    if (firedRef.current) return;
    firedRef.current = true;
    if (ok) {
      toast({ variant: "success", title: `${labelFor(ok)} connected to your workspace.` });
    } else if (err) {
      toast({ variant: "error", title: "Connection failed", description: err.replace(/_/g, " ") });
    }
    router.replace(RETURN_TO);
  }, [searchParams, toast, router]);

  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const connected = item.state.status === "connected";
      if (filter === "connected" && !connected) return false;
      if (filter === "disconnected" && connected) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [items, filter, query]);

  const counts = React.useMemo(
    () => ({
      all: items.length,
      connected: items.filter((i) => i.state.status === "connected").length,
      disconnected: items.filter((i) => i.state.status !== "connected").length,
    }),
    [items],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-0.5">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
                  active
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
                <span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                  {counts[f.key]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search integrations…"
            className="h-9 w-64 pl-8"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
          No integrations match the current filter.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <IntegrationCard
              key={item.id}
              item={item}
              onChanged={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function IntegrationCard({
  item,
  onChanged,
}: {
  item: GlobalIntegration;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const connected = item.state.status === "connected";
  const [busy, setBusy] = React.useState(false);
  const [showTgForm, setShowTgForm] = React.useState(false);
  const [tgToken, setTgToken] = React.useState("");
  const [tgError, setTgError] = React.useState<string | null>(null);

  const connect = () => {
    if (item.provider === "google") {
      const url = `/api/v1/connectors/google/start?projectId=${encodeURIComponent(GLOBAL_SCOPE)}&connector=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent(RETURN_TO)}`;
      window.location.href = url;
      return;
    }
    if (item.provider === "telegram") setShowTgForm(true);
  };

  const submitTelegram = async () => {
    setTgError(null);
    setBusy(true);
    try {
      const resp = await fetch("/api/v1/connectors/telegram/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: GLOBAL_SCOPE, botToken: tgToken.trim() }),
      });
      const json = (await resp.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!resp.ok || !json.ok) {
        setTgError(json.message ?? json.error ?? `request failed (${resp.status})`);
        return;
      }
      setTgToken("");
      setShowTgForm(false);
      toast({ variant: "success", title: `${item.name} connected to your workspace.` });
      onChanged();
    } catch (cause) {
      setTgError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await fetch(`/api/v1/connectors/${item.id}/disconnect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId: GLOBAL_SCOPE }),
      });
      toast({ variant: "success", title: `${item.name} disconnected from your workspace.` });
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card transition hover:border-foreground/15 hover:shadow-md">
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-muted">
            <IntegrationIcon id={item.id} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight">{item.name}</h3>
              <StatusBadge connected={connected} />
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-border/60 px-5 py-3 text-[11px]">
        <Meta label="Category" value={item.category} />
        <Meta label="Method" value={item.method} />
        <Meta
          label="In use"
          value={`${item.enabledProjects.length} / ${item.totalProjects}`}
        />
      </div>

      <div className="border-t border-border/60 px-5 py-3 text-xs">
        {connected ? (
          item.enabledProjects.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground">Enabled in</span>
              {item.enabledProjects.slice(0, 3).map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/projects/${p.id}?tab=integrations`}
                  className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-700 transition hover:bg-emerald-500/15 dark:text-emerald-400"
                >
                  {p.name}
                </Link>
              ))}
              {item.enabledProjects.length > 3 ? (
                <span className="text-muted-foreground">
                  +{item.enabledProjects.length - 3} more
                </span>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Connected — turn it on for a project from its Integrations tab.
            </p>
          )
        ) : (
          <p className="text-muted-foreground">
            Connect once here, then enable {item.name} per project.
          </p>
        )}
      </div>

      {connected && item.state.scopes.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 border-t border-border/60 px-5 py-3">
          {item.state.scopes.slice(0, 4).map((scope) => (
            <span
              key={scope}
              className="rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
            >
              {scope.replace("https://www.googleapis.com/auth/", "")}
            </span>
          ))}
          {item.state.scopes.length > 4 ? (
            <span className="px-1 py-0.5 text-[10px] text-muted-foreground">
              +{item.state.scopes.length - 4}
            </span>
          ) : null}
        </div>
      ) : null}

      {showTgForm && !connected ? (
        <div className="border-t border-border/60 p-5">
          <label className="text-xs font-medium" htmlFor={`tg-${item.id}`}>
            Bot token from <span className="font-mono">@BotFather</span>
          </label>
          <Input
            id={`tg-${item.id}`}
            value={tgToken}
            onChange={(event) => setTgToken(event.target.value)}
            placeholder="123456789:ABCdef…"
            autoComplete="off"
            spellCheck={false}
            className="mt-2 font-mono text-xs"
          />
          {tgError ? (
            <p className="mt-2 text-xs text-destructive">{tgError}</p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={submitTelegram}
              disabled={busy || tgToken.trim().length < 20}
            >
              {busy ? "Validating…" : "Save"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowTgForm(false);
                setTgError(null);
                setTgToken("");
              }}
              disabled={busy}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-auto border-t border-border p-3">
        {connected ? (
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-center"
            onClick={disconnect}
            disabled={busy}
          >
            {busy ? "Working…" : "Disconnect"}
          </Button>
        ) : showTgForm ? null : (
          <Button
            size="sm"
            className="w-full justify-center"
            onClick={connect}
            disabled={busy}
          >
            Connect {item.name}
            <ArrowUpRightIcon className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-medium text-foreground">{value}</p>
    </div>
  );
}

function StatusBadge({ connected }: { connected: boolean }) {
  if (connected) {
    return (
      <Badge variant="success" className="font-medium">
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Connected
      </Badge>
    );
  }
  return <Badge variant="secondary">Available</Badge>;
}

function IntegrationIcon({ id }: { id: GlobalIntegration["id"] }) {
  if (id === "gmail") return <GmailIcon />;
  if (id === "calendar") return <CalendarIcon />;
  if (id === "telegram") return <TelegramIcon />;
  return null;
}

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

function TelegramIcon() {
  return (
    <svg viewBox="0 0 20 20" width={22} height={22} fill="none" aria-hidden>
      <g clipPath="url(#integ-list-tg)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M20 10C20 15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10ZM10.3584 7.38244C9.38571 7.787 7.44178 8.62433 4.52658 9.89443C4.05319 10.0827 3.80521 10.2668 3.78264 10.4469C3.74449 10.7512 4.12559 10.8711 4.64456 11.0343C4.71515 11.0565 4.78829 11.0795 4.86328 11.1038C5.37386 11.2698 6.06069 11.464 6.41774 11.4717C6.74162 11.4787 7.10311 11.3452 7.5022 11.0711C10.226 9.2325 11.632 8.30317 11.7203 8.28314C11.7825 8.26901 11.8688 8.25123 11.9273 8.3032C11.9858 8.35518 11.98 8.4536 11.9738 8.48C11.9361 8.64095 10.4401 10.0317 9.66593 10.7515C9.42459 10.9759 9.25339 11.135 9.2184 11.1714C9.14 11.2528 9.06011 11.3298 8.98332 11.4038C8.50897 11.8611 8.15326 12.204 9.00301 12.764C9.41137 13.0331 9.73814 13.2556 10.0641 13.4776C10.4201 13.7201 10.7752 13.9619 11.2347 14.2631C11.3517 14.3398 11.4635 14.4195 11.5724 14.4971C11.9867 14.7925 12.359 15.0578 12.8188 15.0155C13.086 14.9909 13.3621 14.7397 13.5022 13.9903C13.8335 12.2193 14.4847 8.38205 14.6352 6.80081C14.6484 6.66227 14.6318 6.48498 14.6185 6.40715C14.6051 6.32931 14.5773 6.21842 14.4761 6.13633C14.3563 6.03911 14.1714 6.01861 14.0886 6.02007C13.7125 6.0267 13.1355 6.22735 10.3584 7.38244Z"
          fill="#149EE4"
        />
      </g>
      <defs>
        <clipPath id="integ-list-tg">
          <rect fill="white" height="20" width="20" />
        </clipPath>
      </defs>
    </svg>
  );
}
