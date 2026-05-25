import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listTeam } from "@/lib/team-store";
import { getWorkspaceSettings } from "@/lib/workspace-settings";
import { emailConfigured } from "@/lib/email";
import { TeamManager } from "@/components/team/team-manager";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const [members, settings, session] = await Promise.all([
    listTeam(),
    getWorkspaceSettings(),
    getServerSession(authOptions),
  ]);

  const active = members.filter((m) => m.status === "active").length;
  const invited = members.filter((m) => m.status === "invited").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">
            {active} active · {invited} pending invite{invited === 1 ? "" : "s"} in {settings.name}.
          </p>
        </div>
      </div>

      <TeamManager
        initial={members}
        emailReady={emailConfigured()}
        currentUserEmail={session?.user?.email ?? undefined}
        workspaceName={settings.name}
      />
    </div>
  );
}
