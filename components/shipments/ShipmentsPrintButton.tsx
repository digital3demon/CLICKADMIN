"use client";

export function ShipmentsPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium text-[var(--text-strong)] shadow-sm transition-colors hover:bg-[var(--table-row-hover)]"
    >
      Печать списка
    </button>
  );
}
