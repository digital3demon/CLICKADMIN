import "server-only";
import nodemailer from "nodemailer";
import { crmPublicBaseUrl } from "@/lib/crm-public-base-url";

export type SendInviteEmailResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" }
  | { sent: false; reason: "provider_error"; error: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildInviteBodies(opts: {
  displayName: string;
  inviteCode: string;
}): { subject: string; html: string; text: string } {
  const base = crmPublicBaseUrl();
  const activateUrl = `${base}/login/activate`;
  const subject = "Приглашение в CRM — код активации";
  const name = escapeHtml(opts.displayName);
  const code = escapeHtml(opts.inviteCode);
  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.5">
<p>Здравствуйте, ${name}.</p>
<p>Вас пригласили в CRM. Код активации (10 символов):</p>
<p style="font-size:1.25rem;font-weight:600;letter-spacing:0.08em">${code}</p>
<p>Откройте страницу активации, укажите свою почту и этот код, задайте пароль:<br/>
<a href="${escapeHtml(activateUrl)}">${escapeHtml(activateUrl)}</a></p>
<p>Если вы не ожидали это письмо, просто проигнорируйте его.</p>
</body></html>`;

  const text = [
    `Здравствуйте, ${opts.displayName}.`,
    "",
    `Код активации: ${opts.inviteCode}`,
    "",
    `Страница активации: ${activateUrl}`,
    "",
    "Если вы не ожидали это письмо, проигнорируйте его.",
  ].join("\n");

  return { subject, html, text };
}

function smtpConfigured(): boolean {
  if (process.env.SMTP_URL?.trim()) return true;
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  return Boolean(host && user && pass);
}

async function sendViaSmtp(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendInviteEmailResult> {
  const url = process.env.SMTP_URL?.trim();
  let transporter: nodemailer.Transporter;
  if (url) {
    transporter = nodemailer.createTransport(url);
  } else {
    const host = process.env.SMTP_HOST?.trim() ?? "";
    const user = process.env.SMTP_USER?.trim() ?? "";
    const pass = process.env.SMTP_PASS?.trim() ?? "";
    if (!host || !user || !pass) {
      return { sent: false, reason: "not_configured" };
    }
    const portRaw = process.env.SMTP_PORT?.trim();
    const port = portRaw ? Number.parseInt(portRaw, 10) : 587;
    const secureRaw = process.env.SMTP_SECURE?.trim().toLowerCase();
    const secure =
      secureRaw === "1" ||
      secureRaw === "true" ||
      (!Number.isNaN(port) && port === 465);
    transporter = nodemailer.createTransport({
      host,
      port: Number.isFinite(port) ? port : 587,
      secure,
      auth: { user, pass },
    });
  }

  try {
    await transporter.sendMail({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    return { sent: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error("[sendInviteActivationEmail] SMTP", e);
    return { sent: false, reason: "provider_error", error: err };
  }
}

async function sendViaResend(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendInviteEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, reason: "not_configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    message?: string;
  };

  if (!res.ok) {
    const err =
      typeof body.message === "string"
        ? body.message
        : `Resend HTTP ${res.status}`;
    console.error("[sendInviteActivationEmail] Resend", err, body);
    return { sent: false, reason: "provider_error", error: err };
  }

  return { sent: true };
}

/**
 * Письмо с кодом приглашения.
 *
 * **РФ / без VPN:** задайте `EMAIL_FROM` и SMTP — например Яндекс или Mail.ru
 * (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, опционально `SMTP_PORT`, `SMTP_SECURE`),
 * либо одну строку `SMTP_URL` (как в документации nodemailer).
 *
 * **Resend** (если доступен): `RESEND_API_KEY` — используется только если SMTP не настроен.
 */
export async function sendInviteActivationEmail(opts: {
  to: string;
  displayName: string;
  inviteCode: string;
}): Promise<SendInviteEmailResult> {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) {
    return { sent: false, reason: "not_configured" };
  }

  const { subject, html, text } = buildInviteBodies(opts);
  const mail = { from, to: opts.to, subject, html, text };

  if (smtpConfigured()) {
    return sendViaSmtp(mail);
  }

  if (process.env.RESEND_API_KEY?.trim()) {
    return sendViaResend(mail);
  }

  return { sent: false, reason: "not_configured" };
}
