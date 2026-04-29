"use client";

import Link from "next/link";
import { useEffect, type MouseEvent } from "react";
import type { DuplicatePreflightMatch } from "@/lib/order-duplicate-preflight";

export type ContinuationParent = { id: string; orderNumber: string };

export type DuplicateGateState =
  | { type: "open"; matches: DuplicatePreflightMatch[] }
  | { type: "shipped"; parent: DuplicatePreflightMatch };

type Props = {
  open: boolean;
  gate: DuplicateGateState | null;
  onClose: () => void;
  onProceedCreateAnyway: () => void;
  onProceedAsContinuation: (parent: ContinuationParent) => void;
  onProceedWithoutContinuation: () => void;
};

function formatRuDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/** Закрыть панель только при обычном левом клике по ссылке (не Ctrl/Cmd/Shift — новая вкладка). */
function onPlainOrderLinkClick(
  onPanelClose: () => void,
): (e: MouseEvent<HTMLAnchorElement>) => void {
  return (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (e.button !== 0) return;
    onPanelClose();
  };
}

export function NewOrderDuplicatePreflightModal({
  open,
  gate,
  onClose,
  onProceedCreateAnyway,
  onProceedAsContinuation,
  onProceedWithoutContinuation,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !gate) return null;

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center bg-zinc-900/55 p-3 sm:p-5"
      role="presentation"
      onClick={() => onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dup-preflight-title"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {gate.type === "open" ? (
          <>
            <h2
              id="dup-preflight-title"
              className="text-base font-semibold text-[var(--app-text)]"
            >
              Такая работа уже есть
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-body)]">
              Найден наряд с тем же пациентом, врачом и клиникой, без отметки
              «Работа отправлена» (не отгружен). Возможно, его заносят повторно.
            </p>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Ссылку на номер можно открыть в новой вкладке колёсиком мыши или
              Ctrl+кликом.
            </p>
            <ul className="mt-3 space-y-3 border-t border-[var(--card-border)] pt-3 text-sm">
              {gate.matches.slice(0, 6).map((m) => (
                <li
                  key={m.id}
                  className="flex flex-col gap-2 rounded-md border border-[var(--card-border)] bg-[var(--surface-subtle)] p-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                    <Link
                      href={`/orders/${m.id}`}
                      prefetch={false}
                      className="font-semibold text-[var(--sidebar-blue)] underline-offset-2 hover:underline"
                      onClick={onPlainOrderLinkClick(onClose)}
                    >
                      {m.orderNumber}
                    </Link>
                    <span className="text-[var(--text-muted)]">
                      от {formatRuDate(m.createdAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-md border border-[var(--sidebar-blue)] bg-[var(--card-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--sidebar-blue)] hover:bg-sky-50"
                    onClick={() =>
                      onProceedAsContinuation({
                        id: m.id,
                        orderNumber: m.orderNumber,
                      })
                    }
                  >
                    Продолжить работу
                  </button>
                </li>
              ))}
            </ul>
            {gate.matches.length > 6 ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Показаны 6 из {gate.matches.length}. Остальные — в списке
                заказов по фильтру.
              </p>
            ) : null}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <button
                type="button"
                className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
                onClick={() => onClose()}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100"
                onClick={() => onProceedCreateAnyway()}
              >
                Всё равно создать новый
              </button>
            </div>
          </>
        ) : (
          <>
            <h2
              id="dup-preflight-title"
              className="text-base font-semibold text-[var(--app-text)]"
            >
              Похоже на продолжение работы
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-body)]">
              Наряд{" "}
              <Link
                href={`/orders/${gate.parent.id}`}
                prefetch={false}
                className="font-semibold text-[var(--sidebar-blue)] underline-offset-2 hover:underline"
                onClick={onPlainOrderLinkClick(onClose)}
              >
                {gate.parent.orderNumber}
              </Link>{" "}
              с тем же пациентом, врачом и клиникой уже отмечен как отгруженный.
              Отметить новый наряд как{" "}
              <span className="font-medium">продолжение</span> этой работы?
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <button
                type="button"
                className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
                onClick={() => onClose()}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--card-border)] px-4 py-2 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
                onClick={() => onProceedWithoutContinuation()}
              >
                Нет, обычный наряд
              </button>
              <button
                type="button"
                className="rounded-lg bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                onClick={() =>
                  onProceedAsContinuation({
                    id: gate.parent.id,
                    orderNumber: gate.parent.orderNumber,
                  })
                }
              >
                Да, продолжение
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
