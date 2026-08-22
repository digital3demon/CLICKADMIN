"use client";

import { useEffect, useState } from "react";

type Props = {
  orderId: string;
  /** Доп. ссылка Kaiten (не в QR — QR ведёт на витрину как стикер). */
  kaitenUrl?: string | null;
  /** Доп. ссылка на канбан CRM. */
  kanbanUrl?: string | null;
  /** Текст кнопки в полной шапке наряда */
  labelFull?: string;
  /** Компактный режим: только иконка в таблице */
  compact?: boolean;
};

/**
 * QR наряда = та же публичная витрина, что и QR на стикере (`/p/t/.../s/...`).
 */
export function OrderKaitenQrModal({
  orderId,
  kaitenUrl = null,
  kanbanUrl = null,
  labelFull = "QR витрины",
  compact = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [hubUrl, setHubUrl] = useState<string | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingHub, setLoadingHub] = useState(false);

  useEffect(() => {
    if (!open) {
      setDataUrl(null);
      setError(null);
      setHubUrl(null);
      setLoadingHub(false);
      return;
    }
    let cancelled = false;
    setLoadingHub(true);
    setError(null);
    setDataUrl(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/orders/${encodeURIComponent(orderId)}/sticker-hub`,
          { credentials: "include", cache: "no-store" },
        );
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          url?: string;
        };
        if (!res.ok || !data.url?.trim()) {
          if (!cancelled) {
            setError(data.error ?? "Не удалось получить ссылку витрины");
            setLoadingHub(false);
          }
          return;
        }
        const url = data.url.trim();
        if (cancelled) return;
        setHubUrl(url);
        setLoadingHub(false);
        try {
          const QRCode = (await import("qrcode")).default;
          const d = await QRCode.toDataURL(url, {
            width: compact ? 200 : 256,
            margin: 2,
            errorCorrectionLevel: "M",
          });
          if (!cancelled) setDataUrl(d);
        } catch {
          if (!cancelled) setError("Не удалось сформировать QR");
        }
      } catch {
        if (!cancelled) {
          setError("Сеть недоступна");
          setLoadingHub(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, orderId, compact]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const kaitenHref = kaitenUrl?.trim() || null;
  const kanbanHref = kanbanUrl?.trim() || null;

  const btnClass = compact
    ? "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-body)] shadow-sm hover:bg-[var(--table-row-hover)] sm:h-6 sm:w-6"
    : "inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-1.5 text-xs font-medium text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] sm:h-9 sm:px-2.5 sm:text-sm";

  return (
    <>
      <button
        type="button"
        className={btnClass}
        title="QR-код витрины наряда (как на стикере)"
        aria-label={labelFull}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <QrIcon className={compact ? "h-3.5 w-3.5" : "h-4 w-4 sm:h-[1.1rem] sm:w-[1.1rem]"} />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[240] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="QR-код витрины наряда"
            className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-[var(--app-text)]">
              Витрина наряда
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Тот же адрес, что и QR на стикере. Скан откроет публичную страницу
              статуса и блок для сотрудников.
            </p>
            <div className="mt-4 flex justify-center">
              {error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : loadingHub || !dataUrl ? (
                <p className="text-sm text-[var(--text-muted)]">Формирование QR…</p>
              ) : (
                <img
                  src={dataUrl}
                  width={compact ? 200 : 256}
                  height={compact ? 200 : 256}
                  alt=""
                  className="rounded-md border border-[var(--border-subtle)]"
                />
              )}
            </div>
            <div className="mt-4 space-y-3 border-t border-[var(--border-subtle)] pt-4">
              {hubUrl ? (
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Витрина (QR)
                  </p>
                  <a
                    href={hubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block break-all text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
                  >
                    {hubUrl}
                  </a>
                </div>
              ) : null}
              {kaitenHref ? (
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Kaiten
                  </p>
                  <a
                    href={kaitenHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block break-all text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
                  >
                    {kaitenHref}
                  </a>
                </div>
              ) : null}
              {kanbanHref ? (
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Канбан CRM
                  </p>
                  <a
                    href={kanbanHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block break-all text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
                  >
                    {kanbanHref}
                  </a>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className="mt-5 w-full rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--surface-hover)]"
              onClick={() => setOpen(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function QrIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm6-2h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2zm-4 4h2v2h-2v-2zm4 0h2v2h-2v-2z" />
    </svg>
  );
}
