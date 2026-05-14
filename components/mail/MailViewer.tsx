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
  onReply,
}: {
  email: MailEmailDetail | null;
  loading: boolean;
  onAction: (action: "archive" | "trash" | "delete" | "unread" | "flag" | "unflag") => void;
  onReply: (html: string, mode: "reply" | "replyAll" | "forward") => void;
}) {
  const [quickReply, setQuickReply] = useState("");
  if (loading) {
    return (
      <section className="hidden min-w-0 flex-1 bg-[#f9fafc] p-8 text-sm text-[#7f8796] xl:block">
        Открываем письмо...
      </section>
    );
  }
  if (!email) {
    return (
      <section className="hidden min-w-0 flex-1 items-center justify-center bg-[#f9fafc] p-10 xl:flex">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-3xl shadow-sm">
            ✉
          </div>
          <h3 className="text-lg font-semibold text-[#20242b]">Выберите письмо</h3>
          <p className="mt-2 text-sm leading-6 text-[#7a8292]">
            Просмотр откроется справа, как в Яндекс Почте. Горячие клавиши: J/K, R, E, Delete.
          </p>
        </div>
      </section>
    );
  }

  const body = email.safeHtmlBody?.trim()
    ? email.safeHtmlBody
    : `<pre style="white-space:pre-wrap;font:14px/1.6 system-ui;color:#20242b">${(
        email.textBody || ""
      )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")}</pre>`;

  return (
    <section className="min-w-0 flex-1 overflow-auto bg-[#f9fafc]">
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-[#e4e8f0] bg-[#f9fafc]/95 px-6 py-3 backdrop-blur">
        <button className="rounded-xl bg-[#2b7cff] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#176bf2]" onClick={() => onReply("", "reply")}>
          Ответить
        </button>
        <button className="rounded-xl border border-[#dfe4ee] bg-white px-3 py-2 text-sm font-medium text-[#424a56] hover:bg-[#f2f5fa]" onClick={() => onReply("", "replyAll")}>
          Ответить всем
        </button>
        <button className="rounded-xl border border-[#dfe4ee] bg-white px-3 py-2 text-sm font-medium text-[#424a56] hover:bg-[#f2f5fa]" onClick={() => onReply("", "forward")}>
          Переслать
        </button>
        <button className="rounded-xl border border-[#dfe4ee] bg-white px-3 py-2 text-sm font-medium text-[#424a56] hover:bg-[#f2f5fa]" onClick={() => onAction("archive")}>
          Архив
        </button>
        <button className="rounded-xl border border-[#ffd5d5] bg-white px-3 py-2 text-sm font-medium text-[#c23232] hover:bg-[#fff3f3]" onClick={() => onAction("trash")}>
          Удалить
        </button>
        <button className="rounded-xl border border-[#dfe4ee] bg-white px-3 py-2 text-sm font-medium text-[#424a56] hover:bg-[#f2f5fa]" onClick={() => onAction(email.isFlagged ? "unflag" : "flag")}>
          {email.isFlagged ? "Снять флажок" : "Флажок"}
        </button>
      </div>

      <article className="mx-auto max-w-4xl px-6 py-6">
        <div className="rounded-[28px] bg-white p-7 shadow-sm ring-1 ring-[#e5e9f2]">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#15191f]">
            {email.subject || "(без темы)"}
          </h1>
          <div className="mt-5 grid gap-2 text-sm text-[#5f6878]">
            <div>
              <span className="mr-2 text-[#9aa2b2]">От кого</span>
              <span className="font-medium text-[#222831]">
                {email.fromName || email.fromAddress || "Неизвестно"}
              </span>
              {email.fromAddress ? <span className="ml-2">{email.fromAddress}</span> : null}
            </div>
            <div>
              <span className="mr-2 text-[#9aa2b2]">Кому</span>
              <span>{addressLine(email.to)}</span>
            </div>
            {email.cc && email.cc.length ? (
              <div>
                <span className="mr-2 text-[#9aa2b2]">Копия</span>
                <span>{addressLine(email.cc)}</span>
              </div>
            ) : null}
            <div>
              <span className="mr-2 text-[#9aa2b2]">Дата</span>
              <span>
                {new Date(email.receivedAt || email.sentAt || email.createdAt).toLocaleString("ru-RU")}
              </span>
            </div>
          </div>

          {email.attachments.length > 0 ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {email.attachments.map((a) => (
                <a
                  key={a.id}
                  href={`/api/mail/emails/${email.id}/attachments/${a.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-[#e4e8f0] bg-[#fbfcff] p-3 transition hover:border-[#2b7cff]/40 hover:bg-[#f3f7ff]"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef4ff] text-xl">
                    {a.mimeType.startsWith("image/") ? "▧" : "▤"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#252b34]">
                      {a.fileName}
                    </span>
                    <span className="text-xs text-[#7b8494]">{sizeLabel(a.size)}</span>
                  </span>
                  <span className="text-sm font-semibold text-[#2b7cff]">Скачать</span>
                </a>
              ))}
            </div>
          ) : null}

          <iframe
            title="Тело письма"
            sandbox=""
            srcDoc={`<!doctype html><html><head><base target="_blank"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font:14px/1.6 Arial,sans-serif;color:#20242b} img{max-width:100%;height:auto} a{color:#176bf2}</style></head><body>${body}</body></html>`}
            className="mt-7 h-[520px] w-full rounded-2xl border border-[#edf0f6] bg-white"
          />

          <div className="mt-6 rounded-2xl border border-[#e2e7f0] bg-[#fbfcff] p-4">
            <textarea
              value={quickReply}
              onChange={(e) => setQuickReply(e.target.value)}
              rows={4}
              placeholder="Быстрый ответ..."
              className="w-full resize-none bg-transparent text-sm text-[#20242b] outline-none placeholder:text-[#a1a8b6]"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                disabled={!quickReply.trim()}
                onClick={() => {
                  onReply(`<p>${quickReply.replaceAll("\n", "<br>")}</p>`, "reply");
                  setQuickReply("");
                }}
                className="rounded-xl bg-[#2b7cff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#176bf2] disabled:opacity-50"
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
