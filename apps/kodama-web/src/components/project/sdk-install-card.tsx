"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";

const tabs = [
  { key: "bun", label: "bun", cmd: "bun add kodoma-ts" },
  { key: "npm", label: "npm", cmd: "npm install kodoma-ts" },
  { key: "pnpm", label: "pnpm", cmd: "pnpm add kodoma-ts" },
  { key: "yarn", label: "yarn", cmd: "yarn add kodoma-ts" },
] as const;

export function SdkInstallCard() {
  const [active, setActive] = React.useState<(typeof tabs)[number]["key"]>("bun");
  const [copied, setCopied] = React.useState(false);
  const cmd = tabs.find((t) => t.key === active)?.cmd ?? tabs[0].cmd;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // ignore
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <SdkMark />
          <div>
            <p className="text-sm font-semibold tracking-tight">
              Kodoma SDK · TypeScript
            </p>
            <p className="text-xs text-muted-foreground">
              The official client for Kodama agents.
            </p>
          </div>
          <Badge variant="success" className="ml-1">
            v0.1
          </Badge>
        </div>
        <a
          href="https://www.npmjs.com/package/kodoma-ts"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          View on npm
          <ExternalIcon />
        </a>
      </div>

      <div className="flex items-center gap-1 border-b border-border px-3 pt-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={
              active === t.key
                ? "rounded-md bg-muted px-3 py-1.5 text-xs font-medium"
                : "rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <code className="flex-1 truncate font-mono text-sm">
          <span className="text-muted-foreground">$ </span>
          {cmd}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function SdkMark() {
  return (
    <svg viewBox="0 0 32 32" width={22} height={22} aria-hidden>
      <defs>
        <radialGradient id="sdk-petal" cx="50%" cy="40%" r="60%">
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
          fill="url(#sdk-petal)"
          transform={`rotate(${deg} 16 16)`}
        />
      ))}
      <circle cx="16" cy="16" r="3.4" fill="#fff3df" />
      <circle cx="16" cy="16" r="1.6" fill="#f97316" />
    </svg>
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

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}
