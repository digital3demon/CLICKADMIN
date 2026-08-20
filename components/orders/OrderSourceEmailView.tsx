"use client";

import type { OrderSourceEmailRow } from "@/lib/mail/order-source-emails";
import { LinkifiedPlainText } from "@/components/ui/LinkifiedPlainText";

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
  usedByAi = false,
  fillHeight = false,
  hideReplyStatus = false,
}: {
  email: OrderSourceEmailRow;
  index?: number;
  compact?: boolean;
  /** Письмо использовано ИИ для предсказания (Diff Viewer). */
  usedByAi?: boolean;
  /** Карточка заполняет высоту колонки; тело письма крутится внутри. */
  fillHeight?: boolean;
  /** В канбане бейдж автоответа не нужен. */
  hideReplyStatus?: boolean;
}) {
  return (
    <article
      className={`rounded-xl border bg-[var(--card-bg)] ${
        usedByAi
          ? "border-[var(--sidebar-blue)]/50 ring-1 ring-[var(--sidebar-blue)]/25"
          : "border-[var(--card-border)]"
      } ${compact ? "p-3" : "p-4"} ${
        fillHeight ? "flex h-full min-h-0 flex-col" : ""
      }`}
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-2">
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
          {usedByAi ? (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-[var(--sidebar-blue)]/40 bg-[var(--sidebar-blue)]/10 px-2 py-0.5 text-[0.65rem] font-semibold text-[var(--sidebar-blue)]"
              title="ИИ использовал это письмо"
            >
              <svg
                className="h-3.5 w-3.5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              ИИ
            </span>
          ) : null}
          <time className="text-[0.68rem] font-medium text-[var(--text-muted)]">
            {formatSourceEmailDate(email)}
          </time>
          {email.isReplyTarget && !hideReplyStatus ? (
            <span className="rounded-full border border-emerald-400/50 bg-emerald-500/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
              {email.autoReplySentAt ? "Автоответ отправлен" : "Ответ по шаблону"}
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-2 shrink-0 text-xs font-medium text-[var(--text-secondary)]">
        {senderLabel(email)}
      </p>
      <p
        className={`mt-3 overflow-y-auto whitespace-pre-wrap border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-xs leading-5 text-[var(--text-body)] ${
          fillHeight
            ? "min-h-0 flex-1"
            : compact
              ? "max-h-48"
              : "max-h-72"
        }`}
      >
        <LinkifiedPlainText text={email.textBody ?? ""} />
      </p>
      {email.attachments.length > 0 ? (
        <div
          className={`mt-3 space-y-1.5 ${
            fillHeight ? "max-h-28 shrink-0 overflow-y-auto" : ""
          }`}
        >
          <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Вложения
          </div>
          {email.attachments.map((attachment) => {
            const externalUrl = attachment.externalUrl?.trim() || null;
            const size = fileSizeLabel(attachment.size);
            const meta = externalUrl
              ? [size, "Яндекс.Диск"].filter(Boolean).join(" · ")
              : attachment.id.startsWith("yandex-disk:")
                ? [size, "Яндекс.Диск (ссылка в письме не сохранена)"].filter(Boolean).join(" · ")
                : size;
            if (externalUrl) {
              return (
                <a
                  key={attachment.id}
                  href={externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2.5 py-2 text-xs text-[var(--sidebar-blue)] hover:bg-[var(--surface-hover)]"
                >
                  <span className="min-w-0 truncate font-medium">{attachment.fileName}</span>
                  <span className="shrink-0 text-[var(--text-muted)]">{meta}</span>
                </a>
              );
            }
            if (
              attachment.id.startsWith("yandex-disk:") ||
              attachment.id.startsWith("public-no-download:")
            ) {
              return (
                <div
                  key={attachment.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-[var(--card-border)] bg-[var(--surface-subtle)] px-2.5 py-2 text-xs text-[var(--text-body)]"
                  title={
                    attachment.id.startsWith("yandex-disk:")
                      ? "Файл на Яндекс.Диске: в теле письма нет URL, откройте письмо во внешней почте"
                      : "Скачивание вложения доступно после входа в CRM"
                  }
                >
                  <span className="min-w-0 truncate font-medium">{attachment.fileName}</span>
                  <span className="shrink-0 text-[var(--text-muted)]">{meta}</span>
                </div>
              );
            }
            return (
              <a
                key={attachment.id}
                href={`/api/mail/emails/${email.id}/attachments/${attachment.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-2.5 py-2 text-xs text-[var(--sidebar-blue)] hover:bg-[var(--surface-hover)]"
              >
                <span className="min-w-0 truncate font-medium">{attachment.fileName}</span>
                <span className="shrink-0 text-[var(--text-muted)]">{size}</span>
              </a>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}
