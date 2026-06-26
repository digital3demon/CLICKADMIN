import Link from "next/link";
import {
  CORRECTION_HISTORY_KIND_LABEL,
  CORRECTION_SOURCE_LABEL,
  formatCorrectionHistoryDecision,
  formatRuDateTime,
  type CorrectionHistoryRow,
} from "@/lib/corrections-history";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { orderPathById } from "@/lib/order-public-ref";

function decisionClass(status: "pending" | "accepted" | "rejected"): string {
  if (status === "accepted") {
    return "text-emerald-800 dark:text-emerald-200";
  }
  if (status === "rejected") {
    return "text-rose-800 dark:text-rose-200";
  }
  return "text-amber-800 dark:text-amber-200";
}

export function OrdersCorrectionsHistoryTable({
  items,
}: {
  items: CorrectionHistoryRow[];
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
        По запросу ничего не найдено. Измените строку поиска или сбросьте фильтр.
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm [-webkit-overflow-scrolling:touch]">
      <table className="w-full min-w-[58rem] table-fixed border-collapse text-left text-sm sm:min-w-[64rem]">
        <colgroup>
          <col style={{ width: "8.5rem" }} />
          <col style={{ width: "9rem" }} />
          <col style={{ width: "11rem" }} />
          <col style={{ width: "6.5rem" }} />
          <col style={{ width: "9.5rem" }} />
          <col style={{ width: "11rem" }} />
          <col />
        </colgroup>
        <thead>
          <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            <th className="px-2 py-2.5 sm:px-3 sm:py-3">Тип</th>
            <th className="px-2 py-2.5 sm:px-3 sm:py-3">Наряд</th>
            <th className="px-2 py-2.5 sm:px-3 sm:py-3">Откуда</th>
            <th className="px-2 py-2.5 sm:px-3 sm:py-3">Когда</th>
            <th className="px-2 py-2.5 sm:px-3 sm:py-3">Решение</th>
            <th className="px-2 py-2.5 sm:px-3 sm:py-3">Кем и когда</th>
            <th className="px-2 py-2.5 sm:px-3 sm:py-3">Текст</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const decision = formatCorrectionHistoryDecision(item);
            const orderHref = orderPathById(item.order.id);
            const kanbanHref = kanbanOrderDeepLinkPath(item.order.id);
            return (
              <tr
                key={`${item.kind}-${item.id}`}
                className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--table-row-hover)]"
              >
                <td className="px-2 py-2 text-[var(--text-body)] sm:px-3 sm:py-2.5">
                  {CORRECTION_HISTORY_KIND_LABEL[item.kind]}
                </td>
                <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <Link
                      href={orderHref}
                      className="truncate font-mono font-medium text-[var(--sidebar-blue)] hover:underline"
                      title={`Наряд ${item.order.orderNumber}`}
                    >
                      {item.order.orderNumber}
                    </Link>
                    <Link
                      href={kanbanHref}
                      className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--sidebar-blue)] hover:underline"
                      title="Открыть карточку в канбане"
                    >
                      Канбан
                    </Link>
                  </div>
                </td>
                <td
                  className="px-2 py-2 text-[var(--text-strong)] sm:px-3 sm:py-2.5"
                  title={CORRECTION_SOURCE_LABEL[item.source]}
                >
                  {CORRECTION_SOURCE_LABEL[item.source]}
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-[var(--text-strong)] sm:px-3 sm:py-2.5">
                  {formatRuDateTime(item.createdAt)}
                </td>
                <td
                  className={`px-2 py-2 font-medium sm:px-3 sm:py-2.5 ${decisionClass(decision.status)}`}
                >
                  {decision.label}
                </td>
                <td
                  className="px-2 py-2 text-[var(--text-secondary)] sm:px-3 sm:py-2.5"
                  title={decision.detail ?? undefined}
                >
                  {decision.detail ? (
                    <span className="block whitespace-normal break-words">
                      {decision.detail}
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </td>
                <td
                  className="px-2 py-2 text-[var(--text-secondary)] sm:px-3 sm:py-2.5"
                  title={item.text}
                >
                  <span className="block whitespace-normal break-words line-clamp-3">
                    {item.text}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
