"use client";

import { useState } from "react";
import type { MailEmailDetail } from "@/components/mail/types";

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
  if (loading) {
    return (
      <section className="hidden min-w-0 flex-1 bg-[var(--app-bg)] p-8 text-sm text-[var(--text-muted)] xl:block">
        Открываем письмо...
      </section>
    );
  }
  if (!email) {
    return (
      <section className="hidden min-w-0 flex-1 items-center justify-center bg-[var(--app-bg)] p-10 xl:flex">
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
    ? email.safeHtmlBody
    : `<pre style="white-space:pre-wrap;font:14px/1.6 system-ui;color:CanvasText">${(
        email.textBody || ""
      )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")}</pre>`;

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--card-bg)]">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-3">
        <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700" onClick={() => onReply("", "reply")}>
          Ответить
        </button>
        <button className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]" onClick={() => onReply("", "replyAll")}>
          Ответить всем
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

      <article className="min-h-0 flex-1 overflow-auto">
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
              <span>
                {new Date(email.receivedAt || email.sentAt || email.createdAt).toLocaleString("ru-RU")}
              </span>
            </div>
          </div>
        </div>

        {email.attachments.length > 0 ? (
          <div className="border-b border-[var(--card-border)] px-6 py-4">
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {email.attachments.map((a) => (
                <a
                  key={a.id}
                  href={`/api/mail/emails/${email.id}/attachments/${a.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-3 transition hover:border-[var(--sidebar-blue)]/40 hover:bg-[var(--surface-hover)]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent-selection-bg)] text-xl">
                    {a.mimeType.startsWith("image/") ? "▧" : "▤"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[var(--app-text)]">
                      {a.fileName}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">{sizeLabel(a.size)}</span>
                  </span>
                  <span className="text-sm font-semibold text-[var(--sidebar-blue)]">Скачать</span>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        <div className="px-6 py-6">
          <iframe
            title="Тело письма"
            sandbox=""
            srcDoc={`<!doctype html><html><head><base target="_blank"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font:14px/1.6 Arial,sans-serif;color:CanvasText;background:Canvas} img{max-width:100%;height:auto} a{color:LinkText}</style></head><body>${body}</body></html>`}
            className="h-[min(68dvh,760px)] min-h-[520px] w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--card-bg)]"
          />

          <div className="mt-6 rounded-2xl border border-[var(--card-border)] bg-[var(--surface-subtle)] p-4">
            <textarea
              value={quickReply}
              onChange={(e) => setQuickReply(e.target.value)}
              rows={4}
              placeholder="Быстрый ответ..."
              className="w-full resize-none bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--text-placeholder)]"
            />
            <div className="mt-3 flex justify-end">
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
