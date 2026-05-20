"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { PrivacyPolicy } from "@/lib/runtime-config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FormState = {
  gmail: {
    blockSenders: string;
    allowSenders: string;
    redactOtp: boolean;
    redactAuthCodes: boolean;
    redactFinance: boolean;
    redactPrivateAttachments: boolean;
    subjectDenyPatterns: string;
  };
  telegram: {
    blockChats: string;
    allowChats: string;
    redactPersonalDms: boolean;
  };
  x: {
    blockKeywords: string;
    readDirectMessages: boolean;
  };
};

function policyToForm(policy: PrivacyPolicy): FormState {
  const join = (arr: string[]) => arr.join(", ");
  return {
    gmail: {
      blockSenders: join(policy.gmail.blockSenders),
      allowSenders: join(policy.gmail.allowSenders),
      redactOtp: policy.gmail.redactOtp,
      redactAuthCodes: policy.gmail.redactAuthCodes,
      redactFinance: policy.gmail.redactFinance,
      redactPrivateAttachments: policy.gmail.redactPrivateAttachments,
      subjectDenyPatterns: join(policy.gmail.subjectDenyPatterns),
    },
    telegram: {
      blockChats: join(policy.telegram.blockChats),
      allowChats: join(policy.telegram.allowChats),
      redactPersonalDms: policy.telegram.redactPersonalDms,
    },
    x: {
      blockKeywords: join(policy.x.blockKeywords),
      readDirectMessages: policy.x.readDirectMessages,
    },
  };
}

function formToPolicy(form: FormState): PrivacyPolicy {
  const split = (value: string): string[] =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  return {
    gmail: {
      blockSenders: split(form.gmail.blockSenders),
      allowSenders: split(form.gmail.allowSenders),
      redactOtp: form.gmail.redactOtp,
      redactAuthCodes: form.gmail.redactAuthCodes,
      redactFinance: form.gmail.redactFinance,
      redactPrivateAttachments: form.gmail.redactPrivateAttachments,
      subjectDenyPatterns: split(form.gmail.subjectDenyPatterns),
    },
    telegram: {
      blockChats: split(form.telegram.blockChats),
      allowChats: split(form.telegram.allowChats),
      redactPersonalDms: form.telegram.redactPersonalDms,
    },
    x: {
      blockKeywords: split(form.x.blockKeywords),
      readDirectMessages: form.x.readDirectMessages,
    },
  };
}

export function PolicyPanel({
  projectId,
  initial,
}: {
  projectId: string;
  initial: PrivacyPolicy;
}) {
  const router = useRouter();
  const initialForm = React.useMemo(() => policyToForm(initial), [initial]);
  const [form, setForm] = React.useState<FormState>(initialForm);
  const [saving, setSaving] = React.useState(false);
  const [feedback, setFeedback] = React.useState<
    { kind: "ok" | "error"; message: string } | null
  >(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  const save = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const resp = await fetch(
        `/api/v1/projects/${encodeURIComponent(projectId)}/runtime`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ policy: formToPolicy(form) }),
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
      setFeedback({ kind: "ok", message: "Policy saved." });
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
          Privacy rules apply to every connector the agent reaches into. Lists
          accept comma-separated values. Changes here propagate to running
          SDKs on the next fetch of the runtime config.
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

      <Section
        title="Gmail"
        description="Redactions are applied before the LLM ever sees the email body. Sender lists match by substring, case-insensitive; subject patterns are regex."
      >
        <ToggleRow
          label="Redact OTP codes"
          hint="One-time passwords are removed before summarization."
          checked={form.gmail.redactOtp}
          onChange={(v) => setForm({ ...form, gmail: { ...form.gmail, redactOtp: v } })}
        />
        <ToggleRow
          label="Redact auth codes"
          hint="Other auth codes (login confirmations, sign-in links)."
          checked={form.gmail.redactAuthCodes}
          onChange={(v) => setForm({ ...form, gmail: { ...form.gmail, redactAuthCodes: v } })}
        />
        <ToggleRow
          label="Redact financial details"
          hint="Account numbers, IBAN/IFSC/Aadhaar/PAN, CVV."
          checked={form.gmail.redactFinance}
          onChange={(v) => setForm({ ...form, gmail: { ...form.gmail, redactFinance: v } })}
        />
        <ToggleRow
          label="Withhold private attachment bodies"
          hint="When a mail has attachments, body content is withheld from the LLM."
          checked={form.gmail.redactPrivateAttachments}
          onChange={(v) =>
            setForm({
              ...form,
              gmail: { ...form.gmail, redactPrivateAttachments: v },
            })
          }
        />

        <TextRow
          label="Block senders"
          hint="Comma-separated. Skips matching mail entirely. Use @domain.com or partial substrings."
          value={form.gmail.blockSenders}
          placeholder="@bank.com, noreply@stripe.com"
          onChange={(v) => setForm({ ...form, gmail: { ...form.gmail, blockSenders: v } })}
        />
        <TextRow
          label="Allow senders"
          hint="If set, only mail from these senders is processed. Leave empty to allow all."
          value={form.gmail.allowSenders}
          placeholder="leave empty for default"
          onChange={(v) => setForm({ ...form, gmail: { ...form.gmail, allowSenders: v } })}
        />
        <TextRow
          label="Subject deny patterns (regex)"
          hint="Subjects matching any pattern have the subject and body redacted."
          value={form.gmail.subjectDenyPatterns}
          placeholder="payslip, salary, ^Receipt"
          onChange={(v) =>
            setForm({
              ...form,
              gmail: { ...form.gmail, subjectDenyPatterns: v },
            })
          }
        />
      </Section>

      <Section
        title="Telegram"
        description="Applies to both bot and personal-account (MTProto, coming soon)."
      >
        <TextRow
          label="Block chats"
          hint="Comma-separated chat IDs the agent should never read."
          value={form.telegram.blockChats}
          placeholder="-100123456, partner_dm"
          onChange={(v) =>
            setForm({ ...form, telegram: { ...form.telegram, blockChats: v } })
          }
        />
        <TextRow
          label="Allow chats"
          hint="If set, only these chats are accessible."
          value={form.telegram.allowChats}
          placeholder="leave empty for default"
          onChange={(v) =>
            setForm({ ...form, telegram: { ...form.telegram, allowChats: v } })
          }
        />
        <ToggleRow
          label="Redact personal DMs"
          hint="Drop content of one-to-one personal chats; group/channel content still flows through."
          checked={form.telegram.redactPersonalDms}
          onChange={(v) =>
            setForm({
              ...form,
              telegram: { ...form.telegram, redactPersonalDms: v },
            })
          }
        />
      </Section>

      <Section
        title="X (Twitter)"
        description="Applies to the watch/digest tools. DMs default to off."
      >
        <TextRow
          label="Block keywords"
          hint="Posts/replies containing any keyword are skipped."
          value={form.x.blockKeywords}
          placeholder="politics, gambling"
          onChange={(v) => setForm({ ...form, x: { ...form.x, blockKeywords: v } })}
        />
        <ToggleRow
          label="Read direct messages"
          hint="Off by default. Enable only if you've connected an account that grants DM read scope."
          checked={form.x.readDirectMessages}
          onChange={(v) =>
            setForm({ ...form, x: { ...form.x, readDirectMessages: v } })
          }
        />
      </Section>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setForm(initialForm)}
          disabled={!dirty || saving}
        >
          Reset
        </Button>
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save policy"}
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <Badge variant="secondary" className="font-mono text-[10px]">
          policy.{title.toLowerCase().split(" ")[0]}
        </Badge>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
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
    </div>
  );
}

function TextRow({
  label,
  hint,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      <Input
        className="mt-2 font-mono text-xs"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
