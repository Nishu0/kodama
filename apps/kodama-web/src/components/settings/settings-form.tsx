"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  OPENROUTER_MODEL_PRESETS,
  type Notifications,
  type WorkspaceSettings,
} from "@/lib/workspace-settings-shared";

const NOTIF_OPTIONS: Array<{ value: Notifications; label: string; hint: string }> = [
  { value: "all", label: "All", hint: "Every event" },
  { value: "important", label: "Important", hint: "Invites, errors, limits" },
  { value: "off", label: "Off", hint: "No emails" },
];

export function SettingsForm({ initial }: { initial: WorkspaceSettings }) {
  const router = useRouter();
  const [name, setName] = React.useState(initial.name);
  const [model, setModel] = React.useState(initial.openRouterModel);
  const [notifications, setNotifications] = React.useState<Notifications>(initial.notifications);
  const [supportEmail, setSupportEmail] = React.useState(initial.supportEmail ?? "");
  const [openRouterKey, setOpenRouterKey] = React.useState("");
  const [clearKey, setClearKey] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [flash, setFlash] = React.useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const keyStillSet = initial.openRouterKeySet && !clearKey;

  const dirty =
    name !== initial.name ||
    model !== initial.openRouterModel ||
    notifications !== initial.notifications ||
    (supportEmail || "") !== (initial.supportEmail ?? "") ||
    openRouterKey.trim().length > 0 ||
    clearKey;

  const save = async () => {
    setBusy(true);
    setFlash(null);
    try {
      const resp = await fetch("/api/v1/workspace/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          model,
          notifications,
          supportEmail: supportEmail || undefined,
          openRouterKey: openRouterKey.trim() || undefined,
          clearOpenRouterKey: clearKey,
        }),
      });
      const json = (await resp.json().catch(() => ({}))) as { message?: string };
      if (!resp.ok) {
        setFlash({ kind: "error", text: json.message ?? `request failed (${resp.status})` });
        return;
      }
      setOpenRouterKey("");
      setClearKey(false);
      setFlash({ kind: "ok", text: "Settings saved." });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {flash ? (
        <div
          role="status"
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            flash.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {flash.text}
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Workspace</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Shown across the dashboard and in invite + onboarding emails.
        </p>
        <div className="mt-4 space-y-4">
          <Labeled label="Workspace name">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-md" />
          </Labeled>
          <Labeled label="Support email" hint="Used as the reply-to on outgoing emails.">
            <Input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@yourcompany.com"
              className="max-w-md"
            />
          </Labeled>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Model — bring your own OpenRouter key</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Kodama routes model calls through your{" "}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            OpenRouter
          </a>{" "}
          account, so you pick the model and pay OpenRouter directly. The key is encrypted at rest and never shown again.
        </p>

        <div className="mt-4 space-y-4">
          <Labeled label="OpenRouter API key">
            {keyStillSet ? (
              <div className="flex max-w-md flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
                <Badge variant="success">Key set</Badge>
                <code className="font-mono text-xs text-muted-foreground">
                  {initial.openRouterKeyHint ?? "••••"}
                </code>
                <button
                  type="button"
                  onClick={() => setClearKey(true)}
                  className="ml-auto text-xs font-medium text-muted-foreground underline-offset-2 hover:text-destructive hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex max-w-md items-center gap-2">
                <Input
                  type="password"
                  value={openRouterKey}
                  onChange={(e) => setOpenRouterKey(e.target.value)}
                  placeholder="sk-or-v1-…"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono text-xs"
                />
                {clearKey ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setClearKey(false);
                      setOpenRouterKey("");
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            )}
          </Labeled>

          <Labeled label="Model" hint="Any slug from openrouter.ai/models.">
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="anthropic/claude-3.5-sonnet"
              autoComplete="off"
              spellCheck={false}
              className="max-w-md font-mono text-xs"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {OPENROUTER_MODEL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setModel(preset)}
                  className={cn(
                    "rounded-md border px-2 py-1 font-mono text-[11px] transition",
                    model === preset
                      ? "border-foreground/40 bg-muted/60 text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </Labeled>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Email notifications</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">How much the workspace emails you.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {NOTIF_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setNotifications(opt.value)}
              className={cn(
                "rounded-xl border p-3 text-left transition",
                notifications === opt.value ? "border-foreground/40 bg-muted/50" : "border-border hover:border-foreground/15",
              )}
            >
              <p className="text-sm font-medium">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.hint}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={busy || !dirty}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function Labeled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      {hint ? <p className="mb-2 mt-0.5 text-xs text-muted-foreground">{hint}</p> : <div className="mb-2" />}
      {children}
    </div>
  );
}
