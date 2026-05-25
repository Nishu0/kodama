"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { TeamMember, TeamRole } from "@/lib/team-store";

const ROLES: TeamRole[] = ["owner", "admin", "member", "viewer"];

type EmailResult =
  | { sent: true; id: string }
  | { sent: false; skipped: true; reason: string }
  | { sent: false; skipped: false; error: string };

function describeEmail(result: EmailResult | undefined, action: string): { kind: "ok" | "warn" | "error"; text: string } {
  if (!result) return { kind: "ok", text: `${action} saved.` };
  if (result.sent) return { kind: "ok", text: `${action} — email sent.` };
  if ("skipped" in result && result.skipped)
    return { kind: "warn", text: `${action} saved, but email was skipped (${result.reason}). Set RESEND_API_KEY to send.` };
  return { kind: "error", text: `${action} saved, but email failed: ${(result as { error: string }).error}` };
}

export function TeamManager({
  initial,
  emailReady,
  currentUserEmail,
  workspaceName,
}: {
  initial: TeamMember[];
  emailReady: boolean;
  currentUserEmail?: string;
  workspaceName: string;
}) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<TeamRole>("member");
  const [busy, setBusy] = React.useState(false);
  const [flash, setFlash] = React.useState<{ kind: "ok" | "warn" | "error"; text: string } | null>(null);

  const flashAndRefresh = (f: { kind: "ok" | "warn" | "error"; text: string }) => {
    setFlash(f);
    router.refresh();
    window.setTimeout(() => setFlash(null), 6000);
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFlash(null);
    try {
      const resp = await fetch("/api/v1/team/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, role }),
      });
      const json = (await resp.json().catch(() => ({}))) as { message?: string; emailResult?: EmailResult };
      if (!resp.ok) {
        setFlash({ kind: "error", text: json.message ?? `request failed (${resp.status})` });
        return;
      }
      setEmail("");
      setName("");
      setRole("member");
      flashAndRefresh(describeEmail(json.emailResult, `Invited ${email.trim()}`));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {!emailReady ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          Email isn&apos;t configured — invites are recorded but no email is sent.
          Set <code className="font-mono">RESEND_API_KEY</code> (and optionally{" "}
          <code className="font-mono">RESEND_FROM</code>) to send invite and onboarding emails.
        </div>
      ) : null}

      {flash ? (
        <div
          role="status"
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            flash.kind === "ok" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            flash.kind === "warn" && "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            flash.kind === "error" && "border-destructive/30 bg-destructive/10 text-destructive",
          )}
        >
          {flash.text}
        </div>
      ) : null}

      <form onSubmit={invite} className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">Invite a teammate</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          They&apos;ll get an email invite to join {workspaceName}.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1.4fr_1fr_auto_auto]">
          <Input
            type="email"
            required
            placeholder="teammate@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
          />
          <Input
            placeholder="Name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
          />
          <RoleSelect value={role} onChange={setRole} />
          <Button type="submit" disabled={busy || email.trim().length < 3}>
            {busy ? "Inviting…" : "Send invite"}
          </Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="bg-muted/40">
            <tr className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {initial.map((member) => (
              <MemberRow
                key={member.email}
                member={member}
                isSelf={member.email === currentUserEmail}
                onResult={flashAndRefresh}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MemberRow({
  member,
  isSelf,
  onResult,
}: {
  member: TeamMember;
  isSelf: boolean;
  onResult: (f: { kind: "ok" | "warn" | "error"; text: string }) => void;
}) {
  const [busy, setBusy] = React.useState<string | null>(null);

  const call = async (
    action: string,
    url: string,
    body: Record<string, unknown>,
    success: (json: { emailResult?: EmailResult }) => { kind: "ok" | "warn" | "error"; text: string },
  ) => {
    setBusy(action);
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await resp.json().catch(() => ({}))) as { message?: string; emailResult?: EmailResult };
      if (!resp.ok) {
        onResult({ kind: "error", text: json.message ?? `request failed (${resp.status})` });
        return;
      }
      onResult(success(json));
    } finally {
      setBusy(null);
    }
  };

  return (
    <tr className="border-t border-border/60">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar fallback={initials(member.name ?? member.email)} />
          <div className="min-w-0">
            <p className="truncate font-medium">
              {member.name ?? member.email.split("@")[0]}
              {isSelf ? <span className="ml-1.5 text-xs text-muted-foreground">(you)</span> : null}
            </p>
            <p className="truncate text-xs text-muted-foreground">{member.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {member.status === "active" ? (
          <Badge variant="success">active</Badge>
        ) : (
          <Badge variant="warning">invited</Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <RoleSelect
          value={member.role}
          disabled={busy !== null || (member.role === "owner" && isSelf)}
          onChange={(role) =>
            call("role", "/api/v1/team/role", { email: member.email, role }, () => ({
              kind: "ok",
              text: `${member.email} is now ${role}.`,
            }))
          }
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {member.status === "invited" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() =>
                call("resend", "/api/v1/team/invite", { email: member.email, name: member.name, role: member.role }, (json) =>
                  describeEmail(json.emailResult, "Invite resent"),
                )
              }
            >
              {busy === "resend" ? "…" : "Resend"}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            disabled={busy !== null}
            onClick={() =>
              call("welcome", "/api/v1/team/welcome", { email: member.email }, (json) =>
                describeEmail(json.emailResult, "Welcome email"),
              )
            }
          >
            {busy === "welcome" ? "…" : "Send welcome"}
          </Button>
          {!(member.role === "owner") ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy !== null}
              onClick={() =>
                call("remove", "/api/v1/team/remove", { email: member.email }, () => ({
                  kind: "ok",
                  text: `Removed ${member.email}.`,
                }))
              }
            >
              {busy === "remove" ? "…" : "Remove"}
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: TeamRole;
  onChange: (role: TeamRole) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as TeamRole)}
      className={cn(
        "h-9 rounded-md border border-border bg-background px-2.5 text-sm capitalize transition",
        "focus:outline-none focus:ring-2 focus:ring-ring/40",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {ROLES.map((r) => (
        <option key={r} value={r} className="capitalize">
          {r}
        </option>
      ))}
    </select>
  );
}

function initials(input: string): string {
  const clean = input.includes("@") ? input.split("@")[0]! : input;
  const parts = clean.trim().split(/[\s._-]+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}
