"use client";

import Link from "next/link";
import { useNewOrderPanel } from "@/components/orders/new-order-panel-context";

export function OrdersPageTitleExtras() {
  const { canUseAiMode, aiModeEnabled, setAiModeEnabled } = useNewOrderPanel();

  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
      {canUseAiMode ? (
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-[0.7rem] font-medium tracking-wide text-[var(--text-secondary)] sm:text-xs">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-[var(--input-border)] text-[var(--sidebar-blue)] focus:ring-[var(--sidebar-blue)]"
            checked={aiModeEnabled}
            onChange={(e) => setAiModeEnabled(e.target.checked)}
          />
          <span>ИИ-Режим</span>
        </label>
      ) : null}
      <Link
        href="/orders/archived"
        className="text-[0.7rem] font-light tracking-wide text-[var(--text-muted)] hover:text-[var(--app-text)] hover:underline sm:text-xs"
      >
        Архив
      </Link>
    </span>
  );
}
