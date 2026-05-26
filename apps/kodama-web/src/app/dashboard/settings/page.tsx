import { getWorkspaceSettings } from "@/lib/workspace-settings";
import { SettingsForm } from "@/components/settings/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getWorkspaceSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Workspace-wide preferences for {settings.name}.
        </p>
      </div>

      <SettingsForm initial={settings} />
    </div>
  );
}
