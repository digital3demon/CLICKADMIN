"use client";

import { useEffect, useRef, useState } from "react";
import type { MailEmailDetail } from "@/components/mail/types";
import { mailFullDateLabel, mailPrimaryDateValue } from "@/components/mail/date-format";
import { sanitizeMailHtml } from "@/lib/mail/sanitize-mail-html";

function addressLine(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((x) => {
      if (!x || typeof x !== "object") return "";
      const item = x as { name?: string | null; address?: string | null };
      return item.name ? `${item.name} <${item.address ?? ""}>` : item.address ?? "";
    })
    .filter(Boolean)
    .join(", ");
}

function sizeLabel(size: number): string {
  if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} МБ`;
  if (size > 1024) return `${Math.round(size / 1024)} КБ`;
  return `${size} Б`;
}

export function MailViewer({
  email,
  loading,
  onAction,
  onCreateOrder,
  onReply,
}: {
  email: MailEmailDetail | null;
  loading: boolean;
  onAction: (action: "archive" | "trash" | "delete" | "unread" | "flag" | "unflag") => void;
  onCreateOrder: () => void;
  onReply: (html: string, mode: "reply" | "replyAll" | "forward") => void;
}) {
  const [quickReply, setQuickReply] = useState("");
  const [bodyFrameHeight, setBodyFrameHeight] = useState(360);
  const scrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setBodyFrameHeight(360);
    scrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [email?.id]);

  if (loading) {
    return (
      <section className="hidden h-full min-w-0 flex-1 bg-[var(--app-bg)] p-8 text-sm text-[var(--text-muted)] xl:flex xl:items-center xl:justify-center">
        Открываем письмо...
      </section>
    );
  }
  if (!email) {
    return (
      <section
        className="hidden min-w-0 flex-1 items-center justify-center bg-[var(--app-bg)] p-10 xl:flex"
        style={{ paddingRight: "calc((100vw / 0.85) - 100vw + 2.5rem)" }}
      >
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--card-bg)] text-3xl shadow-sm">
            ✉
          </div>
          <h3 className="text-lg font-semibold text-[var(--app-text)]">Выберите письмо</h3>
        </div>
      </section>
    );
  }

  const body = email.safeHtmlBody?.trim()
    ? sanitizeMailHtml(email.safeHtmlBody)
    : `<pre style="white-space:pre-wrap;font:14px/1.6 system-ui;color:CanvasText">${(
        email.textBody || ""
      )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")}</pre>`;

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-[var(--card-bg)]">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-3">
        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700" onClick={() => onReply("", "reply")}>
          Ответить
        </button>
        <button className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]" onClick={() => onAction("unread")}>
          Непрочитано
        </button>
        <button className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]" onClick={() => onReply("", "forward")}>
          Переслать
        </button>
        <button className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]" onClick={() => onAction("archive")}>
          Архив
        </button>
        <button className="rounded-lg border border-red-400/30 bg-[var(--surface-subtle)] px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-300" onClick={() => onAction("trash")}>
          Удалить
        </button>
        <button className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]" onClick={() => onAction(email.isFlagged ? "unflag" : "flag")}>
          {email.isFlagged ? "Снять флажок" : "Флажок"}
        </button>
        <button className="rounded-lg bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--sidebar-blue-hover)]" onClick={onCreateOrder}>
          Новый заказ
        </button>
      </div>

      <article
        ref={scrollRef}
        className="custom-scrollbar min-h-0 flex-1 overflow-auto overflow-x-hidden overscroll-contain"
      >
        <div className="border-b border-[var(--card-border)] px-6 py-6">
          <h1 className="text-2xl font-semibold leading-tight tracking-[-0.03em] text-[var(--app-text)]">
            {email.subject || "(без темы)"}
          </h1>
          <div className="mt-5 grid gap-2 text-sm text-[var(--text-secondary)]">
            <div>
              <span className="mr-2 text-[var(--text-muted)]">От кого</span>
              <span className="font-medium text-[var(--app-text)]">
                {email.fromName || email.fromAddress || "Неизвестно"}
              </span>
              {email.fromAddress ? <span className="ml-2">{email.fromAddress}</span> : null}
            </div>
            <div>
              <span className="mr-2 text-[var(--text-muted)]">Кому</span>
              <span>{addressLine(email.to)}</span>
            </div>
            {email.cc && email.cc.length ? (
              <div>
                <span className="mr-2 text-[var(--text-muted)]">Копия</span>
                <span>{addressLine(email.cc)}</span>
              </div>
            ) : null}
            <div>
              <span className="mr-2 text-[var(--text-muted)]">Дата</span>
              <span>{mailFullDateLabel(mailPrimaryDateValue(email))}</span>
            </div>
          </div>
        </div>

        {email.attachments.length > 0 ? (
          <div className="box-border w-full overflow-hidden border-b border-[var(--card-border)] px-6 py-4">
            <div
              className="grid w-full max-w-[760px] min-w-0 gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))" }}
            >
              {email.attachments.map((a) => {
                const externalUrl = a.externalUrl?.trim() || null;
                const isVirtualDisk = a.id.startsWith("yandex-disk:");
                const href = externalUrl
                  ? externalUrl
                  : isVirtualDisk
                    ? null
                    : `/api/mail/emails/${email.id}/attachments/${a.id}`;
                const meta = [
                  sizeLabel(a.size),
                  externalUrl || isVirtualDisk ? "Яндекс.Диск" : null,
                ]
                  .filter(Boolean)
                  .join(" · ");
                const inner = (
                  <>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-selection-bg)] text-xl">
                      {a.mimeType.startsWith("image/") ? "▧" : "▤"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[var(--app-text)]">
                        {a.fileName}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">{meta}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-[var(--sidebar-blue)]">
                      {href ? (externalUrl ? "Открыть" : "Скачать") : "Нет ссылки"}
                    </span>
                  </>
                );
                if (!href) {
                  return (
                    <div
                      key={a.id}
                      title="Файл на Яндекс.Диске: в теле письма нет URL"
                      className="flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-dashed border-[var(--card-border)] bg-[var(--surface-subtle)] p-3"
                    >
                      {inner}
                    </div>
                  );
                }
                return (
                  <a
                    key={a.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-3 transition hover:border-[var(--sidebar-blue)]/40 hover:bg-[var(--surface-hover)]"
                  >
                    {inner}
                  </a>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="box-border w-full max-w-[760px] overflow-hidden px-6 py-6">
          <iframe
            title="Тело письма"
            sandbox="allow-same-origin allow-popups"
            srcDoc={`<!doctype html><html><head><base target="_blank"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html{box-sizing:border-box}*,*:before,*:after{box-sizing:inherit}body{margin:0;padding:16px 18px;font:14px/1.6 Arial,sans-serif;color:CanvasText;background:Canvas;overflow-wrap:anywhere}img{max-width:100%;height:auto}a{color:LinkText}</style></head><body>${body}</body></html>`}
            className="w-full border border-[var(--border-subtle)] bg-[var(--card-bg)]"
            style={{ height: bodyFrameHeight }}
            onLoad={(event) => {
              const doc = event.currentTarget.contentDocument;
              const height = doc?.documentElement.scrollHeight ?? doc?.body.scrollHeight ?? 360;
              setBodyFrameHeight(Math.max(220, Math.min(height + 8, 1800)));
            }}
          />

          <div className="mt-6 box-border w-full max-w-full overflow-hidden rounded-2xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-4">
            <textarea
              value={quickReply}
              onChange={(e) => setQuickReply(e.target.value)}
              rows={4}
              placeholder="Быстрый ответ..."
              className="w-full resize-none bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)]"
            />
            <div className="mt-3 flex justify-start">
              <button
                type="button"
                disabled={!quickReply.trim()}
                onClick={() => {
                  onReply(`<p>${quickReply.replaceAll("\n", "<br>")}</p>`, "reply");
                  setQuickReply("");
                }}
                className="rounded-xl bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--sidebar-blue-hover)] disabled:opacity-50"
              >
                Ответить
              </button>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
