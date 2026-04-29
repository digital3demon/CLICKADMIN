"use client";

import type { ReactNode } from "react";
import { printOrderNarjadPdf } from "@/lib/print-order-narjad";

function PrintNarjadPdfIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 18h8v-8H6v8zM16 6V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <path d="M18 10v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-8" />
      <path d="M18 10H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2z" />
    </svg>
  );
}

/** Компактная кнопка в строке таблицы заказов (не «вторая галочка» при отправленной работе). */
const ICON_TABLE_CLASS =
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-body)] shadow-sm hover:bg-[var(--table-row-hover)] sm:h-7 sm:w-7";

type Props = {
  orderId: string;
  variant?: "icon" | "custom";
  className?: string;
  title?: string;
  children?: ReactNode;
};

export function OrderNarjadPrintTrigger({
  orderId,
  variant = "custom",
  className,
  title,
  children,
}: Props) {
  const aria =
    title?.trim() ||
    "Печать наряда (PDF) — открыть диалог печати браузера";

  return (
    <button
      type="button"
      className={
        variant === "icon"
          ? [ICON_TABLE_CLASS, className].filter(Boolean).join(" ")
          : className
      }
      title={title}
      aria-label={variant === "icon" ? aria : undefined}
      onClick={() => void printOrderNarjadPdf(orderId)}
    >
      {variant === "icon" ? (
        <PrintNarjadPdfIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      ) : (
        children
      )}
    </button>
  );
}
