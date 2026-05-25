// Email sending via Resend's REST API. No SDK dependency — a plain fetch keeps
// the build light and lets us degrade cleanly: when RESEND_API_KEY is unset we
// log and report `skipped` instead of throwing, mirroring the dual-backend
// honesty used elsewhere (Convex vs in-memory).

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { sent: true; id: string }
  | { sent: false; skipped: true; reason: string }
  | { sent: false; skipped: false; error: string };

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function emailFrom(): string {
  return process.env.RESEND_FROM?.trim() || "Kodama <onboarding@resend.dev>";
}

export function appBaseUrl(): string {
  return (
    process.env.KODAMA_OAUTH_REDIRECT_BASE ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    // No provider configured — don't fail the calling flow (e.g. an invite is
    // still recorded even if the email can't go out).
    console.info(
      `[email] RESEND_API_KEY not set — skipping send to ${
        Array.isArray(input.to) ? input.to.join(", ") : input.to
      } ("${input.subject}")`,
    );
    return { sent: false, skipped: true, reason: "RESEND_API_KEY not configured" };
  }

  try {
    const resp = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom(),
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo,
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      return {
        sent: false,
        skipped: false,
        error: `resend responded ${resp.status}${detail ? `: ${detail}` : ""}`,
      };
    }
    const json = (await resp.json().catch(() => ({}))) as { id?: string };
    return { sent: true, id: json.id ?? "unknown" };
  } catch (cause) {
    return { sent: false, skipped: false, error: (cause as Error).message };
  }
}
