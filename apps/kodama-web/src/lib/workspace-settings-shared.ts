// Client-safe workspace settings types + constants. Kept separate from
// workspace-settings.ts so Client Components can import these without dragging
// in the server-only store (which uses node:crypto via lib/encryption.ts).

export type Notifications = "all" | "important" | "off";

// Public, client-safe shape. No raw API key — only whether one is set + a hint.
export type WorkspaceSettings = {
  name: string;
  openRouterModel: string;
  notifications: Notifications;
  supportEmail?: string;
  openRouterKeySet: boolean;
  openRouterKeyHint?: string;
  updatedAt?: number;
  updatedBy?: string;
};

// Suggested OpenRouter model slugs — the field is free-form, these are just
// quick-fill chips. Users can paste any slug from openrouter.ai/models.
export const OPENROUTER_MODEL_PRESETS = [
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-3.5-sonnet",
  "openai/gpt-4o",
  "google/gemini-2.0-flash-001",
  "meta-llama/llama-3.3-70b-instruct",
];

export const DEFAULT_OPENROUTER_MODEL = "anthropic/claude-3.5-sonnet";
