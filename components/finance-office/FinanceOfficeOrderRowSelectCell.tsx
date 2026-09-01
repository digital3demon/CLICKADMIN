"use client";

import { useFinanceOfficeSelection } from "@/components/finance-office/finance-office-selection";

export function FinanceOfficeOrderRowSelectCell({
  orderId,
  orderNumber,
}: {
  orderId: string;
  orderNumber: string;
}) {
  const { selected, toggleOne } = useFinanceOfficeSelection();
  return (
    <td className="w-[7.5rem] px-1 py-2 text-center">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-[var(--input-border)]"
        checked={selected.has(orderId)}
        onChange={(e) => toggleOne(orderId, e.target.checked)}
        aria-label={`Выбрать наряд ${orderNumber}`}
      />
    </td>
  );
}
