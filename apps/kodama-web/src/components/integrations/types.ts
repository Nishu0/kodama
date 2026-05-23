import type { ConnectorId, ConnectorState } from "@/lib/runtime-config";

export type CatalogEntry = {
  id: ConnectorId;
  name: string;
  description: string;
  category: "Email" | "Calendar" | "Messaging";
  method: "OAuth · Google" | "Bot token";
  provider: "google" | "telegram";
};

// A workspace-level integration: connected once, then enabled per project.
export type GlobalIntegration = CatalogEntry & {
  state: ConnectorState;
  enabledProjects: Array<{ id: string; name: string }>;
  totalProjects: number;
};
