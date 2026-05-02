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

/** Разбор «Имя <email@domain>» или просто email для From. */
function parseEmailFrom(from: string): { email: string; name?: string } {
  const m = from.match(/^\s*(.+?)\s*<([^>]+)>\s*$/);
  if (m) {
    const name = m[1].replace(/^["']|["']$/g, "").trim();
    return { name: name || undefined, email: m[2].trim().toLowerCase() };
  }
  return { email: from.trim().toLowerCase() };
}

function unisenderGoConfigured(): boolean {
  return Boolean(process.env.UNISENDER_GO_API_KEY?.trim());
}

const DEFAULT_UNISENDER_GO_SEND_URL =
  "https://goapi.unisender.ru/ru/transactional/api/v1/email/send.json";

async function sendViaUnisenderGo(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendInviteEmailResult> {
  const apiKey = process.env.UNISENDER_GO_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, reason: "not_configured" };
  }

  const url =
    process.env.UNISENDER_GO_SEND_URL?.trim() || DEFAULT_UNISENDER_GO_SEND_URL;

  const { email: fromEmail, name: fromParsedName } = parseEmailFrom(params.from);
  const fromName =
    process.env.EMAIL_FROM_NAME?.trim() || fromParsedName || "КликАдмин";

  const body = {
    message: {
      recipients: [{ email: params.to.toLowerCase().trim() }],
      subject: params.subject,
      from_email: fromEmail,
      from_name: fromName,
      body: {
        html: params.html,
        plaintext: params.text,
      },
      global_language: "ru",
      skip_unsubscribe: 1,
      tags: ["crm-invite"],
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify(body),
    });

    const raw = await res.text();
    let json: {
      status?: string;
      job_id?: string;
      failed_emails?: Record<string, string>;
      message?: string;
      code?: string | number;
    } = {};
    try {
      json = JSON.parse(raw) as typeof json;
    } catch {
      if (!res.ok) {
        return {
          sent: false,
          reason: "provider_error",
          error: `HTTP ${res.status}: ${raw.slice(0, 500)}`,
        };
      }
      return {
        sent: false,
        reason: "provider_error",
        error: "Некорректный ответ Unisender",
      };
    }

    if (json.status !== "success") {
      const err =
        typeof json.message === "string"
          ? json.message
          : `Unisender: ${JSON.stringify(json).slice(0, 400)}`;
      console.error("[sendInviteActivationEmail] Unisender Go", json);
      return { sent: false, reason: "provider_error", error: err };
    }

    const fail = json.failed_emails?.[params.to.toLowerCase().trim()];
    if (fail) {
      return {
        sent: false,
        reason: "provider_error",
        error: `Unisender: ${fail}`,
      };
    }

    return { sent: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error("[sendInviteActivationEmail] Unisender Go", e);
    return { sent: false, reason: "provider_error", error: err };
  }
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
 * Приоритет провайдера: **SMTP** → **Unisender Go** → **Resend**.
 *
 * **Unisender Go:** `UNISENDER_GO_API_KEY` (заголовок `X-API-KEY`), `EMAIL_FROM`
 * (например `noreply@ваш-домен`). Опционально `EMAIL_FROM_NAME`, полный URL вызова
 * `UNISENDER_GO_SEND_URL` (по умолчанию `goapi.unisender.ru/.../email/send.json`).
 * Если аккаунт на другом дата-центре — см. документацию Unisender (go1/go2).
 *
 * **SMTP:** `SMTP_URL` или `SMTP_HOST`+`SMTP_USER`+`SMTP_PASS` (+ порт/secure).
 *
 * **Resend:** `RESEND_API_KEY`, если нет SMTP и нет Unisender.
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

  if (unisenderGoConfigured()) {
    return sendViaUnisenderGo(mail);
  }

  if (process.env.RESEND_API_KEY?.trim()) {
    return sendViaResend(mail);
  }

  return { sent: false, reason: "not_configured" };
}
