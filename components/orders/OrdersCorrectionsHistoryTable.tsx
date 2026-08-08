import {
  CORRECTION_SOURCE_LABEL,
  formatCorrectionHistoryAuthorDetail,
  formatCorrectionHistoryDecision,
  type CorrectionHistoryRow,
} from "@/lib/corrections-history";
import { orderPathById } from "@/lib/order-public-ref";
import { CorrectionHistoryOrderCell } from "@/components/orders/CorrectionHistoryOrderCell";
import { CorrectionHistoryStatusCell } from "@/components/orders/CorrectionHistoryStatusCell";

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
      <table className="w-full min-w-[64rem] table-fixed border-collapse text-left text-sm sm:min-w-[70rem]">
        <colgroup>
          <col style={{ width: "11rem" }} />
          <col style={{ width: "10rem" }} />
          <col style={{ width: "10rem" }} />
          <col style={{ width: "8rem" }} />
          <col style={{ width: "10.5rem" }} />
          <col style={{ width: "22rem" }} />
        </colgroup>
        <thead>
          <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            <th className="px-2 py-2.5 sm:px-3 sm:py-3">Заказ</th>
            <th className="px-2 py-2.5 sm:px-3 sm:py-3">Откуда</th>
            <th className="px-2 py-2.5 sm:px-3 sm:py-3">От кого и когда</th>
            <th className="px-2 py-2.5 sm:px-3 sm:py-3">Решение</th>
            <th className="px-2 py-2.5 sm:px-3 sm:py-3">Кем и когда</th>
            <th className="px-2 py-2.5 sm:px-3 sm:py-3">Текст</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const decision = formatCorrectionHistoryDecision(item);
            return (
              <tr
                key={`${item.kind}-${item.id}`}
                className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--table-row-hover)]"
              >
                <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                  <CorrectionHistoryOrderCell order={item.order} />
                </td>
                <td
                  className="px-2 py-2 text-[var(--text-strong)] sm:px-3 sm:py-2.5"
                  title={CORRECTION_SOURCE_LABEL[item.source]}
                >
                  {CORRECTION_SOURCE_LABEL[item.source]}
                </td>
                <td
                  className="px-2 py-2 text-[var(--text-secondary)] sm:px-3 sm:py-2.5"
                  title={formatCorrectionHistoryAuthorDetail(item)}
                >
                  <span className="block whitespace-normal break-words">
                    {formatCorrectionHistoryAuthorDetail(item)}
                  </span>
                </td>
                <td className="px-2 py-2 sm:px-3 sm:py-2.5">
                  <CorrectionHistoryStatusCell row={item} />
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
                  className="min-w-0 px-2 py-2 text-[var(--text-secondary)] sm:px-3 sm:py-2.5"
                  title={item.text}
                >
                  <span className="block overflow-hidden whitespace-normal break-words [overflow-wrap:anywhere] line-clamp-4">
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
