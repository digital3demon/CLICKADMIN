"use client";

import type { OrderSourceEmailRow } from "@/lib/mail/order-source-emails";

function formatSourceEmailDate(email: OrderSourceEmailRow): string {
  const raw = email.receivedAt || email.sentAt;
  if (!raw) return "—";
  return new Date(raw).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function senderLabel(email: OrderSourceEmailRow): string {
  const name = email.fromName?.trim();
  const addr = email.fromAddress?.trim();
  if (name && addr) return `${name} <${addr}>`;
  return name || addr || "Без отправителя";
}

function fileSizeLabel(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

export function OrderSourceEmailView({
  email,
  index,
  compact = false,
}: {
  email: OrderSourceEmailRow;
  index?: number;
  compact?: boolean;
}) {
  return (
    <article
      className={`rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {index != null ? (
            <div className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">
              Письмо {index + 1}
            </div>
          ) : null}
          <h4 className="mt-1 text-sm font-semibold text-[var(--app-text)]">
            {email.subject?.trim() || "(без темы)"}
          </h4>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <time className="text-[0.68rem] font-medium text-[var(--text-muted)]">
            {formatSourceEmailDate(email)}
          </time>
          {email.isReplyTarget ? (
            <span className="rounded-full border border-emerald-400/50 bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              {email.autoReplySentAt ? "Автоответ отправлен" : "Ответ по шаблону"}
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-xs font-medium text-[var(--text-secondary)]">
        {senderLabel(email)}
      </p>
      <p
        className={`mt-3 overflow-y-auto whitespace-pre-wrap border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-xs leading-5 text-[var(--text-body)] ${
          compact ? "max-h-48" : "max-h-72"
        }`}
      >
        {email.textBody}
      </p>
      {email.attachments.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Вложения
          </div>
          {email.attachments.map((attachment) => (
            <a
              key={attachment.id}
              href={`/api/mail/emails/${email.id}/attachments/${attachment.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2.5 py-2 text-xs text-[var(--sidebar-blue)] hover:bg-[var(--surface-hover)]"
            >
              <span className="min-w-0 truncate font-medium">{attachment.fileName}</span>
              <span className="shrink-0 text-[var(--text-muted)]">
                {fileSizeLabel(attachment.size)}
              </span>
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}
