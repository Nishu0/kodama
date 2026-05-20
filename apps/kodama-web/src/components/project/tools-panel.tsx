"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { ConnectorId, ConnectorState } from "@/lib/runtime-config";
import {
  CATEGORIES,
  TOOLS_CATALOG,
  type ToolDef,
  type ToolCategory,
} from "@/lib/tools-catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ToolsPanel({
  projectId,
  initialEnabled,
  connectors,
}: {
  projectId: string;
  initialEnabled: string[];
  connectors: Record<ConnectorId, ConnectorState>;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = React.useState<Set<string>>(
    () => new Set(initialEnabled),
  );
  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<
    { kind: "ok" | "error"; message: string } | null
  >(null);

  const initialSet = React.useMemo(
    () => new Set(initialEnabled),
    [initialEnabled],
  );
  const dirty = setsDiffer(enabled, initialSet);

  const toggle = (toolName: string) => {
    setEnabled((prev) => {
      const next = new Set(prev);
      if (next.has(toolName)) next.delete(toolName);
      else next.add(toolName);
      return next;
    });
  };

  const enableAll = () => setEnabled(new Set(TOOLS_CATALOG.map((t) => t.name)));
  const disableAll = () => setEnabled(new Set());

  const save = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const resp = await fetch(
        `/api/v1/projects/${encodeURIComponent(projectId)}/runtime`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ enabledTools: [...enabled] }),
        },
      );
      if (!resp.ok) {
        const detail = await resp.json().catch(() => ({}));
        setFeedback({
          kind: "error",
          message:
            (detail as { message?: string }).message ??
            `request failed (${resp.status})`,
        });
        return;
      }
      setFeedback({ kind: "ok", message: "Tool selection saved." });
      router.refresh();
    } catch (cause) {
      setFeedback({ kind: "error", message: (cause as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground">
        <p>
          Toggle which MCP tools your project&apos;s agent can call. Disabled
          tools are filtered out of the agent loop at runtime — the model
          never even sees them in its tool registry. Changes propagate on the
          next runtime-config fetch.
        </p>
      </div>

      {feedback ? (
        <div
          role="status"
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            feedback.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {enabled.size}
          </span>{" "}
          of {TOOLS_CATALOG.length} tools enabled
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={enableAll}>
            Enable all
          </Button>
          <Button size="sm" variant="outline" onClick={disableAll}>
            Disable all
          </Button>
        </div>
      </div>

      {CATEGORIES.map((category) => (
        <CategoryGroup
          key={category.key}
          category={category}
          enabled={enabled}
          connectors={connectors}
          onToggle={toggle}
        />
      ))}

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEnabled(new Set(initialSet))}
          disabled={!dirty || saving}
        >
          Reset
        </Button>
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save tools"}
        </Button>
      </div>
    </div>
  );
}

function CategoryGroup({
  category,
  enabled,
  connectors,
  onToggle,
}: {
  category: { key: ToolCategory; label: string };
  enabled: Set<string>;
  connectors: Record<ConnectorId, ConnectorState>;
  onToggle: (toolName: string) => void;
}) {
  const tools = TOOLS_CATALOG.filter((t) => t.category === category.key);
  if (tools.length === 0) return null;
  return (
    <section className="rounded-2xl border border-border bg-card">
      <header className="flex items-baseline justify-between border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold tracking-tight">{category.label}</h3>
        <Badge variant="secondary" className="font-mono text-[10px]">
          {tools.filter((t) => enabled.has(t.name)).length}/{tools.length}
        </Badge>
      </header>
      <ul className="divide-y divide-border/60">
        {tools.map((tool) => (
          <ToolRow
            key={tool.name}
            tool={tool}
            checked={enabled.has(tool.name)}
            connectorState={
              tool.requiresConnector
                ? connectors[tool.requiresConnector]
                : null
            }
            onToggle={() => onToggle(tool.name)}
          />
        ))}
      </ul>
    </section>
  );
}

function ToolRow({
  tool,
  checked,
  connectorState,
  onToggle,
}: {
  tool: ToolDef;
  checked: boolean;
  connectorState: ConnectorState | null;
  onToggle: () => void;
}) {
  const connectorMissing =
    tool.requiresConnector != null &&
    connectorState != null &&
    connectorState.status !== "connected";

  return (
    <li className="px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <code className="font-mono text-xs text-muted-foreground">
              {tool.name}
            </code>
            <span className="text-sm font-medium">{tool.label}</span>
            <RiskBadge risk={tool.risk} />
            {tool.requiresConnector ? (
              <Badge variant="secondary" className="font-mono text-[10px]">
                requires {tool.requiresConnector}
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {tool.description}
          </p>
          {connectorMissing ? (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              ⚠ The {tool.requiresConnector} connector is{" "}
              {connectorState!.status}. The tool will be enabled, but calls
              will fail until you connect it on the Integrations tab.
            </p>
          ) : null}
        </div>
        <Toggle
          checked={checked}
          onChange={onToggle}
          label={`Enable ${tool.label}`}
        />
      </div>
    </li>
  );
}

function RiskBadge({ risk }: { risk: ToolDef["risk"] }) {
  if (risk === "low") return <Badge variant="success">low risk</Badge>;
  if (risk === "medium") return <Badge variant="warning">medium risk</Badge>;
  return <Badge variant="destructive">high risk</Badge>;
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 flex-none items-center rounded-full transition",
        checked ? "bg-foreground" : "bg-muted",
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

function setsDiffer(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return true;
  for (const item of a) if (!b.has(item)) return true;
  return false;
}
