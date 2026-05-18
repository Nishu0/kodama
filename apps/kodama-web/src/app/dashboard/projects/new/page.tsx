"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [location, setLocation] = React.useState("United States");
  const [kodamaEnabled, setKodamaEnabled] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const nameValid = name.trim().length >= 3;

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!nameValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const resp = await fetch("/api/v1/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), environment: "development" }),
      });
      if (!resp.ok) {
        const detail = await resp.json().catch(() => ({}));
        setError(
          (detail as { message?: string }).message ??
            `request failed (${resp.status})`,
        );
        return;
      }
      const json = (await resp.json()) as {
        project: { id: string };
      };
      router.push(`/dashboard/projects/${encodeURIComponent(json.project.id)}`);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 pb-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Create a new project
        </h1>
        <p className="text-sm text-muted-foreground">
          Spin up a Kodama project to manage agents across your platforms.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="space-y-8 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-xs sm:p-8"
      >
        <Field
          label="Project Name"
          hint="The project name is a unique identifier for your project, making it easier to manage and track."
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Project Name…"
            autoComplete="off"
            required
            minLength={3}
          />
        </Field>

        <Field
          label="Location"
          hint="Currently, Kodama is exclusively available in the United States, but we plan to expand to additional countries and regions soon."
        >
          <Input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="United States"
            disabled
          />
        </Field>

        <div className="space-y-4">
          <p className="text-sm font-semibold">Feature Lists</p>

          <FeatureRow
            icon={<KodamaMark />}
            title="Kodama"
            description="Kodama is a managed runtime that connects your agents to iMessage, Telegram, WhatsApp, X, Discord, Instagram, and other interfaces people use every day."
            enabled={kodamaEnabled}
            onToggle={() => setKodamaEnabled((v) => !v)}
          />

          <FeatureRow
            icon={<TemplateIcon />}
            title="Templates"
            description="Templates are pre-built workflows that help you automate common tasks, saving you time and ensuring consistency across your projects."
            comingSoon
          />

          <FeatureRow
            icon={<EyeIcon />}
            title="Observability"
            description="Observability refers to the ability to measure and understand the internal state of a system based on the data it produces."
            comingSoon
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!nameValid || submitting}
        >
          {submitting ? "Creating…" : "Create"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold">{label}</label>
      {children}
      {hint ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  description,
  enabled,
  onToggle,
  comingSoon,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled?: boolean;
  onToggle?: () => void;
  comingSoon?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/50 p-4 transition",
        comingSoon ? "opacity-70" : "",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-foreground/80">{icon}</span>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{title}</h3>
            {comingSoon ? (
              <Badge variant="secondary" className="font-medium">
                Coming soon
              </Badge>
            ) : null}
          </div>
        </div>
        <Toggle
          checked={Boolean(enabled)}
          disabled={comingSoon}
          onChange={onToggle}
          label={`Enable ${title}`}
        />
      </div>
      <p className="mt-2 pl-7 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
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
  onChange?: () => void;
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

function KodamaMark() {
  return (
    <svg viewBox="0 0 32 32" width={18} height={18} aria-hidden>
      <defs>
        <radialGradient id="newproj-petal" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffd9a8" />
          <stop offset="60%" stopColor="#ff8a3d" />
          <stop offset="100%" stopColor="#e26a1f" />
        </radialGradient>
      </defs>
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse
          key={deg}
          cx="16"
          cy="9"
          rx="4.2"
          ry="6.4"
          fill="url(#newproj-petal)"
          transform={`rotate(${deg} 16 16)`}
        />
      ))}
      <circle cx="16" cy="16" r="3.4" fill="#fff3df" />
      <circle cx="16" cy="16" r="1.6" fill="#f97316" />
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

