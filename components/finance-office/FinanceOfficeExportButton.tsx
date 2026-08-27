"use client";

import { useFinanceOfficeSelection } from "@/components/finance-office/finance-office-selection";
import { financeOfficeExportHref } from "@/lib/finance-office-export-ids";

const exportClassName =
  "rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-950 shadow-sm hover:bg-emerald-100 dark:border-emerald-800/70 dark:bg-emerald-950/35 dark:text-emerald-100 dark:hover:bg-emerald-950/55";

export function FinanceOfficeExportButton() {
  const { selected, selectedCount } = useFinanceOfficeSelection();

  if (selectedCount === 0) {
    return (
      <button
        type="button"
        disabled
        title="Выберите наряды для выгрузки"
        className={`${exportClassName} cursor-not-allowed opacity-40 hover:bg-emerald-50 dark:hover:bg-emerald-950/35`}
      >
        Выгрузить
      </button>
    );
  }

  return (
    <a
      href={financeOfficeExportHref(selected)}
      title={`Выгрузить выбранные наряды: ${selectedCount}`}
      className={exportClassName}
    >
      Выгрузить
    </a>
  );
}
