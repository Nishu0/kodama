// HTML + text email templates for the Kodama workspace. Kept dependency-free
// (string templates) so they render the same whether sent via Resend or shown
// in a preview. Brand: Kodama. Keep copy terse and on-brand.

type Built = { subject: string; html: string; text: string };

const BRAND = "Kodama";
const ACCENT = "#10b981"; // emerald-500

function layout(opts: { heading: string; body: string; cta?: { label: string; url: string }; footer?: string }): string {
  const button = opts.cta
    ? `<tr><td style="padding:28px 0 8px;">
         <a href="${opts.cta.url}" style="background:${ACCENT};color:#06281d;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:8px;display:inline-block;">${opts.cta.label}</a>
       </td></tr>
       <tr><td style="font-size:12px;color:#8a8f98;padding-top:10px;">Or paste this link into your browser:<br/><span style="color:#6b7280;word-break:break-all;">${opts.cta.url}</span></td></tr>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#0b0b0c;padding:32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" align="center" width="100%" style="max-width:480px;margin:0 auto;background:#141416;border:1px solid #26262b;border-radius:16px;">
    <tr><td style="padding:28px 32px 0;">
      <div style="font-size:15px;font-weight:700;letter-spacing:-0.01em;color:#fafafa;">◐ ${BRAND}</div>
    </td></tr>
    <tr><td style="padding:20px 32px 8px;">
      <h1 style="margin:0;font-size:20px;line-height:1.3;color:#fafafa;font-weight:600;letter-spacing:-0.01em;">${opts.heading}</h1>
    </td></tr>
    <tr><td style="padding:8px 32px 0;">
      <table role="presentation" width="100%"><tr><td style="font-size:14px;line-height:1.6;color:#c4c4c8;">${opts.body}</td></tr>${button}</table>
    </td></tr>
    <tr><td style="padding:28px 32px 28px;">
      <hr style="border:none;border-top:1px solid #26262b;margin:0 0 14px;"/>
      <div style="font-size:12px;color:#6b7280;">${opts.footer ?? `You're receiving this because you were added to a ${BRAND} workspace.`}</div>
    </td></tr>
  </table>
</body></html>`;
}

export function inviteEmail(args: {
  workspaceName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
}): Built {
  const { workspaceName, inviterName, role, acceptUrl } = args;
  const subject = `${inviterName} invited you to ${workspaceName} on ${BRAND}`;
  const body = `<p style="margin:0 0 12px;"><strong style="color:#fafafa;">${escapeHtml(inviterName)}</strong> invited you to join the <strong style="color:#fafafa;">${escapeHtml(workspaceName)}</strong> workspace on ${BRAND} as <strong style="color:${ACCENT};">${escapeHtml(role)}</strong>.</p>
  <p style="margin:0;">${BRAND} is the control plane for AI agents that live on iMessage, Telegram and email. Accept the invite to start managing projects, integrations and policies with the team.</p>`;
  return {
    subject,
    html: layout({ heading: `Join ${escapeHtml(workspaceName)}`, body, cta: { label: "Accept invitation", url: acceptUrl } }),
    text: `${inviterName} invited you to join the ${workspaceName} workspace on ${BRAND} as ${role}.\n\nAccept your invitation: ${acceptUrl}`,
  };
}

export function onboardingEmail(args: {
  workspaceName: string;
  memberName?: string;
  dashboardUrl: string;
}): Built {
  const { workspaceName, memberName, dashboardUrl } = args;
  const greeting = memberName ? `Welcome, ${escapeHtml(memberName)}` : "Welcome aboard";
  const subject = `Welcome to ${workspaceName} on ${BRAND}`;
  const body = `<p style="margin:0 0 12px;">You're in. Here's how to get going in ${BRAND}:</p>
  <ul style="margin:0 0 4px;padding-left:18px;color:#c4c4c8;">
    <li style="margin-bottom:6px;"><strong style="color:#fafafa;">Connect an integration</strong> — link Gmail, Calendar or Telegram once from the Integrations page.</li>
    <li style="margin-bottom:6px;"><strong style="color:#fafafa;">Open a project</strong> — toggle which connections it can use and set its privacy policy.</li>
    <li style="margin-bottom:6px;"><strong style="color:#fafafa;">Watch Analytics</strong> — track responses, tool calls and spend across the workspace.</li>
  </ul>`;
  return {
    subject,
    html: layout({ heading: greeting, body, cta: { label: "Open your dashboard", url: dashboardUrl }, footer: `Glad to have you on ${workspaceName}.` }),
    text: `${greeting}!\n\nYou're in. Get going in ${BRAND}:\n- Connect an integration (Gmail, Calendar, Telegram)\n- Open a project and toggle its connections + privacy policy\n- Watch Analytics for responses, tool calls and spend\n\nOpen your dashboard: ${dashboardUrl}`,
  };
}

export function testEmail(args: { dashboardUrl: string }): Built {
  const subject = `${BRAND} email is working`;
  const body = `<p style="margin:0;">This is a test message from your ${BRAND} workspace. If you're reading it, Resend is wired up correctly and invites + onboarding emails will go out.</p>`;
  return {
    subject,
    html: layout({ heading: "Test email", body, cta: { label: "Back to dashboard", url: args.dashboardUrl } }),
    text: `This is a test message from your ${BRAND} workspace. Resend is wired up correctly.`,
  };
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
