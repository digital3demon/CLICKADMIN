"use client";

import { useCallback, useEffect, useState } from "react";
import { OrderSourceEmailView } from "@/components/orders/OrderSourceEmailView";
import type { OrderSourceEmailRow } from "@/lib/mail/order-source-emails";

export function OrderDocumentMailPanel({
  orderId,
  hasInvoice,
  compact = false,
  mode = "full",
  actionsStretch = false,
}: {
  orderId: string;
  hasInvoice: boolean;
  compact?: boolean;
  mode?: "full" | "actions" | "thread";
  /** Кнопка «Отправить документы» на всю колонку (макет документооборота). */
  actionsStretch?: boolean;
}) {
  const [emails, setEmails] = useState<OrderSourceEmailRow[]>([]);
  const [loading, setLoading] = useState(mode !== "actions");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const showActions = mode === "full" || mode === "actions";
  const showThread = mode === "full" || mode === "thread";

  const load = useCallback(async () => {
    if (mode === "actions") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/orders/${orderId}/source-emails?kind=documents`,
        {
        cache: "no-store",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as {
        emails?: OrderSourceEmailRow[];
        error?: string;
      };
      if (!res.ok) {
        setErr(
          typeof j.error === "string" ? j.error : "Не удалось загрузить переписку",
        );
        return;
      }
      setEmails(Array.isArray(j.emails) ? j.emails : []);
    } catch {
      setErr("Сеть недоступна");
    } finally {
      setLoading(false);
    }
  }, [orderId, mode]);

  useEffect(() => {
    void load();
  }, [load]);

  const sendDocs = async () => {
    if (!hasInvoice) return;
    if (
      !window.confirm("Отправить счёт (и УПД, если есть) на почту для счетов?")
    ) {
      return;
    }
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/send-documents`, {
        method: "POST",
        credentials: "include",
      });
      const j = (await res.json().catch(() => ({}))) as {
        error?: string;
        to?: string;
      };
      if (!res.ok) {
        setErr(typeof j.error === "string" ? j.error : "Не удалось отправить");
        return;
      }
      setInfo(j.to ? `Отправлено на ${j.to}` : "Отправлено");
      await load();
    } catch {
      setErr("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    setErr(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/document-mail`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reply }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(typeof j.error === "string" ? j.error : "Не удалось ответить");
        return;
      }
      setReply("");
      setInfo("Ответ отправлен");
      await load();
    } catch {
      setErr("Сеть недоступна");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-w-0 space-y-1.5">
      {showActions ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy || !hasInvoice}
            title={
              hasInvoice
                ? "Отправить счёт и УПД на почту для счетов"
                : "Сначала загрузите файл счёта"
            }
            className={
              actionsStretch
                ? "w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                : "rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
            }
            onClick={() => void sendDocs()}
          >
            Отправить документы
          </button>
        </div>
      ) : null}
      {err ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {err}
        </p>
      ) : null}
      {info ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">{info}</p>
      ) : null}
      {showThread ? (
        <>
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Переписка по документам
          </p>
          {loading ? (
            <p className="text-xs text-[var(--text-muted)]">Загрузка писем…</p>
          ) : emails.length === 0 ? (
            <p className="text-[11px] text-[var(--text-muted)]">
              Нет писем по документам. Появятся после «Отправить документы».
            </p>
          ) : (
            <div className="max-h-40 space-y-1.5 overflow-y-auto">
              {emails.map((email, index) => (
                <OrderSourceEmailView
                  key={email.id}
                  email={email}
                  index={index}
                  compact
                  hideReplyStatus
                />
              ))}
            </div>
          )}
          {emails.length > 0 ? (
          <div>
            <label
              className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]"
              htmlFor={`oe-doc-reply-${orderId}`}
            >
              Ответить
            </label>
            <textarea
              id={`oe-doc-reply-${orderId}`}
              rows={2}
              className="w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1 text-xs"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Текст ответа…"
            />
            <button
              type="button"
              disabled={busy || !reply.trim()}
              className="mt-1.5 rounded-md bg-[var(--sidebar-blue)] px-2.5 py-1 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
              onClick={() => void sendReply()}
            >
              Отправить ответ
            </button>
          </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
