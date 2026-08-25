"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFinanceOfficeSelection } from "@/components/finance-office/finance-office-selection";
import { printFinanceOfficeSelectedInvoices } from "@/lib/print-finance-office-invoices";
import { FINANCE_OFFICE_INVOICE_PRINT_MAX } from "@/lib/finance-office-invoice-print-limit";

export function FinanceOfficePrintInvoicesButton({
  orderIdsWithInvoice,
  orderIdsWithUpd = [],
  className = "",
}: {
  /** Наряды с файлом счёта (уже отфильтрованные). */
  orderIdsWithInvoice: readonly string[];
  orderIdsWithUpd?: readonly string[];
  className?: string;
}) {
  const { selected, selectedCount } = useFinanceOfficeSelection();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  if (selectedCount === 0) return null;

  const ids = orderIdsWithInvoice.filter((id) => selected.has(id));
  const updIds = orderIdsWithUpd.filter((id) => selected.has(id));
  const bothIds = [...new Set([...ids, ...updIds])];

  const runPrint = (
    pack: string[],
    documents: "invoices" | "upd" | "both",
    emptyTitle: string,
  ) => {
    void (async () => {
      setBusy(true);
      setHint(null);
      try {
        const result = await printFinanceOfficeSelectedInvoices(pack, documents);
        if (result.error) {
          setHint(result.error);
          return;
        }
        const label =
          documents === "upd"
            ? "УПД"
            : documents === "both"
              ? "счетов и УПД"
              : "счетов";
        const parts = [`Напечатано ${label}: ${result.printedOrderIds.length}`];
        if (result.skipped > 0) parts.push(`без файла: ${result.skipped}`);
        if (result.truncated > 0) {
          parts.push(
            `ещё ${result.truncated} не вошли (лимит ${FINANCE_OFFICE_INVOICE_PRINT_MAX})`,
          );
        }
        setHint(parts.join(". "));
        router.refresh();
      } catch {
        setHint("Сеть недоступна");
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy || ids.length === 0}
        title={
          ids.length === 0
            ? "У выбранных нарядов нет файла счёта"
            : `Печать PDF счетов выбранных нарядов (до ${FINANCE_OFFICE_INVOICE_PRINT_MAX} за раз)`
        }
        className="rounded-md border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-950 shadow-sm hover:bg-violet-100 disabled:opacity-40 dark:border-violet-800/70 dark:bg-violet-950/35 dark:text-violet-100 dark:hover:bg-violet-950/55"
        onClick={() => runPrint(ids, "invoices", "У выбранных нарядов нет файла счёта")}
      >
        {busy ? "Печать…" : "Печать счетов"}
      </button>
      <button
        type="button"
        disabled={busy || updIds.length === 0}
        title={
          updIds.length === 0
            ? "У выбранных нарядов нет файла УПД"
            : `Печать PDF УПД выбранных нарядов (до ${FINANCE_OFFICE_INVOICE_PRINT_MAX} за раз)`
        }
        className="rounded-md border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-950 shadow-sm hover:bg-violet-100 disabled:opacity-40 dark:border-violet-800/70 dark:bg-violet-950/35 dark:text-violet-100 dark:hover:bg-violet-950/55"
        onClick={() => runPrint(updIds, "upd", "У выбранных нарядов нет файла УПД")}
      >
        {busy ? "Печать…" : "Печать УПД"}
      </button>
      <button
        type="button"
        disabled={busy || bothIds.length === 0}
        title="Печать счетов и УПД выбранных нарядов"
        className="rounded-md border border-violet-300 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-950 shadow-sm hover:bg-violet-100 disabled:opacity-40 dark:border-violet-800/70 dark:bg-violet-950/35 dark:text-violet-100 dark:hover:bg-violet-950/55"
        onClick={() => runPrint(bothIds, "both", "")}
      >
        {busy ? "Печать…" : "Печать счетов и УПД"}
      </button>
      </div>
      {hint ? (
        <p className="max-w-xs text-[11px] leading-snug text-[var(--text-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
