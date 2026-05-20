// Static catalog of MCP tools exposed to Kodama agents. Mirrors the
// tool definitions in `src/mind/tools.ts`. Keep both in sync — when a new
// tool is added on the daemon side, also add it here so it shows up in
// the dashboard's Tools tab.
//
// Cross-package import of the daemon's tool definitions would be cleaner
// but introduces an unfortunate dependency from the dashboard onto the
// agent runtime; the catalog rarely changes, so duplicating the metadata
// is the right tradeoff for now.

import type { ConnectorId } from "./runtime-config";

export type ToolCategory =
  | "core"
  | "memory"
  | "tasks"
  | "communication"
  | "watch";

export type ToolRisk = "low" | "medium" | "high";

export type ToolDef = {
  name: string;                    // matches the registry key in src/mind/tools.ts
  label: string;
  description: string;
  category: ToolCategory;
  risk: ToolRisk;
  requiresConnector?: ConnectorId;
};

export const CATEGORIES: Array<{ key: ToolCategory; label: string }> = [
  { key: "core", label: "Core" },
  { key: "memory", label: "Memory" },
  { key: "tasks", label: "Tasks" },
  { key: "communication", label: "Communication" },
  { key: "watch", label: "Watch" }
];

export const TOOLS_CATALOG: ToolDef[] = [
  {
    name: "snapshot",
    label: "Snapshot",
    description:
      "Return a short context block: recent journal entries, mood trend, open tasks, last few chat turns. The agent uses this to ground replies.",
    category: "core",
    risk: "low"
  },
  {
    name: "log_journal",
    label: "Log journal entry",
    description:
      "Record a journal entry for the owner. Used only when the owner's intent to journal is clear.",
    category: "memory",
    risk: "low"
  },
  {
    name: "remember_keyring",
    label: "Remember durable fact",
    description:
      "Write a durable key=value fact about the owner (timezone, birthday, preferences). Persists across runs.",
    category: "memory",
    risk: "medium"
  },
  {
    name: "add_task",
    label: "Add task",
    description:
      "Capture a task the owner wants to remember. Optionally schedule a reminder if a due time is provided.",
    category: "tasks",
    risk: "low"
  },
  {
    name: "complete_task",
    label: "Complete task",
    description: "Mark a task as done by id.",
    category: "tasks",
    risk: "low"
  },
  {
    name: "snooze_task",
    label: "Snooze task",
    description: "Snooze a task until a future ISO timestamp.",
    category: "tasks",
    risk: "low"
  },
  {
    name: "drop_task",
    label: "Drop task",
    description: "Discard a task the owner no longer wants to do.",
    category: "tasks",
    risk: "low"
  },
  {
    name: "schedule_reminder",
    label: "Schedule reminder",
    description:
      "Schedule a delayed iMessage at a specific future ISO timestamp. The owner must have asked to be reminded.",
    category: "communication",
    risk: "medium",
    requiresConnector: "imessage"
  },
  {
    name: "x_watch_user",
    label: "Watch an X user",
    description:
      "Verify an X (Twitter) handle and start watching them. The filter is a free-form description of what kinds of posts matter.",
    category: "watch",
    risk: "medium",
    requiresConnector: "x"
  },
  {
    name: "x_unwatch_user",
    label: "Stop watching X user",
    description: "Stop watching an X handle.",
    category: "watch",
    risk: "low",
    requiresConnector: "x"
  },
  {
    name: "x_list_watches",
    label: "List X watches",
    description: "List all X handles Kodama is currently watching.",
    category: "watch",
    risk: "low",
    requiresConnector: "x"
  },
  {
    name: "x_digest_now",
    label: "Run X digest immediately",
    description:
      "Run the X digest loop across all watched handles and return what was found. Bypasses the regular cron cadence.",
    category: "watch",
    risk: "medium",
    requiresConnector: "x"
  }
];

export const ALL_TOOL_NAMES = TOOLS_CATALOG.map((t) => t.name);

export function toolByName(name: string): ToolDef | null {
  return TOOLS_CATALOG.find((t) => t.name === name) ?? null;
}
