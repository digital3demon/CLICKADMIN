"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type Props = {
  /** URL для QR-кода (при наличии Kaiten — ссылка на карточку Kaiten) */
  url: string | null;
  /** Ссылка на карточку в канбане CRM (вторая строка в диалоге) */
  kanbanUrl?: string | null;
  /** Текст кнопки в полной шапке наряда */
  labelFull?: string;
  /** Компактный режим: только иконка в таблице */
  compact?: boolean;
  /** Демо: подписи про канбан вместо Kaiten */
  variant?: "kaiten" | "kanban";
};

export function OrderKaitenQrModal({
  url,
  kanbanUrl = null,
  labelFull = "QR Kaiten",
  compact = false,
  variant = "kaiten",
}: Props) {
  const isKanbanOnly = variant === "kanban";
  const showDualLinks = !isKanbanOnly && Boolean(kanbanUrl?.trim());
  const btnTitle = isKanbanOnly
    ? "QR-код со ссылкой на карточку в канбане CRM"
    : showDualLinks
      ? "QR-код Kaiten; в диалоге — ссылки на Kaiten и канбан"
      : "QR-код со ссылкой на карточку в Kaiten";
  const dialogAria = isKanbanOnly
    ? "QR-код канбана CRM"
    : showDualLinks
      ? "QR-код Kaiten и ссылки на Kaiten и канбан"
      : "QR-код Kaiten";
  const dialogHeading = isKanbanOnly
    ? "Карточка в канбане CRM"
    : showDualLinks
      ? "Карточка Kaiten / канбан"
      : "Карточка Kaiten";
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !url) {
      setDataUrl(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setError(null);
    QRCode.toDataURL(url, {
      width: compact ? 200 : 256,
      margin: 2,
      errorCorrectionLevel: "M",
    })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {
        if (!cancelled) {
          setDataUrl(null);
          setError("Не удалось сформировать QR");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, url, compact]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!url) return null;

  const btnClass = compact
    ? "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-body)] shadow-sm hover:bg-[var(--table-row-hover)] sm:h-6 sm:w-6"
    : "rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-medium text-[var(--text-strong)] shadow-sm hover:bg-[var(--table-row-hover)] sm:text-sm";

  const kaitenHref = isKanbanOnly ? null : url;
  const kanbanHref = kanbanUrl?.trim() || (isKanbanOnly ? url : null);

  return (
    <>
      <button
        type="button"
        className={btnClass}
        title={btnTitle}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {compact ? (
          <QrIcon className="h-3.5 w-3.5" />
        ) : (
          labelFull
        )}
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
            aria-label={dialogAria}
            className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-[var(--app-text)]">{dialogHeading}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {isKanbanOnly
                ? "Отсканируйте код или откройте ссылку на канбан ниже."
                : showDualLinks
                  ? "QR-код ведёт в Kaiten. Ниже — ссылки на Kaiten и канбан CRM."
                  : "Отсканируйте код или откройте ссылку ниже."}
            </p>
            <div className="mt-4 flex justify-center">
              {error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : dataUrl ? (
                <img
                  src={dataUrl}
                  width={compact ? 200 : 256}
                  height={compact ? 200 : 256}
                  alt=""
                  className="rounded-md border border-[var(--border-subtle)]"
                />
              ) : (
                <p className="text-sm text-[var(--text-muted)]">Формирование QR…</p>
              )}
            </div>
            <div className="mt-4 space-y-3 border-t border-[var(--border-subtle)] pt-4">
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
