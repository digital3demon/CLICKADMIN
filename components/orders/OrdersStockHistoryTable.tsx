import Link from "next/link";
import { formatRuDateTime } from "@/lib/corrections-history";
import type { StockHistoryRow } from "@/lib/inventory/stock-history";
import { orderPathById } from "@/lib/order-public-ref";

export function OrdersStockHistoryTable({
  items,
}: {
  items: StockHistoryRow[];
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
        По запросу ничего не найдено. Измените строку поиска или сбросьте
        фильтр.
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm [-webkit-overflow-scrolling:touch]">
      <table className="w-full min-w-[48rem] table-fixed border-collapse text-left text-sm sm:min-w-[52rem]">
        <colgroup>
          <col style={{ width: "9.5rem" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "9rem" }} />
          <col />
          <col style={{ width: "8rem" }} />
        </colgroup>
        <thead>
          <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            <th className="min-w-0 truncate px-2 py-2.5 sm:px-3 sm:py-3">
              Когда
            </th>
            <th className="min-w-0 truncate px-2 py-2.5 sm:px-3 sm:py-3">
              Склад
            </th>
            <th className="min-w-0 truncate px-2 py-2.5 sm:px-3 sm:py-3">
              Кто
            </th>
            <th className="min-w-0 truncate px-2 py-2.5 sm:px-3 sm:py-3">
              Вид
            </th>
            <th className="min-w-0 truncate px-2 py-2.5 sm:px-3 sm:py-3">
              Описание
            </th>
            <th className="min-w-0 truncate px-2 py-2.5 sm:px-3 sm:py-3">
              Наряд
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const returned = Boolean(row.returnedToWarehouseAt);
            return (
              <tr
                key={row.id}
                className={`border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--table-row-hover)] ${
                  returned ? "opacity-60" : ""
                }`}
              >
                <td className="min-w-0 whitespace-nowrap px-2 py-2 text-[var(--text-strong)] sm:px-3 sm:py-2.5">
                  {formatRuDateTime(new Date(row.createdAt))}
                </td>
                <td className="min-w-0 px-2 py-2 sm:px-3 sm:py-2.5">
                  <Link
                    href="/warehouse"
                    className="block truncate font-medium text-[var(--sidebar-blue)] hover:underline"
                    title={row.warehouse.name}
                  >
                    {row.warehouse.name}
                  </Link>
                </td>
                <td
                  className="min-w-0 px-2 py-2 text-[var(--text-strong)] sm:px-3 sm:py-2.5"
                  title={row.actorLabel}
                >
                  <span className="block truncate">{row.actorLabel}</span>
                </td>
                <td
                  className="min-w-0 px-2 py-2 text-[var(--text-body)] sm:px-3 sm:py-2.5"
                  title={row.kindLabel}
                >
                  <span className="block truncate">{row.kindLabel}</span>
                </td>
                <td
                  className="min-w-0 px-2 py-2 text-[var(--text-body)] sm:px-3 sm:py-2.5"
                  title={row.description}
                >
                  <span className="block whitespace-pre-wrap break-words">
                    {row.description}
                    {returned ? (
                      <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                        возвращено на склад
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="min-w-0 px-2 py-2 sm:px-3 sm:py-2.5">
                  {row.order ? (
                    <Link
                      href={orderPathById(row.order.id)}
                      className="block truncate font-mono text-[var(--sidebar-blue)] hover:underline"
                      title={`Наряд ${row.order.orderNumber}`}
                    >
                      {row.order.orderNumber}
                    </Link>
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
