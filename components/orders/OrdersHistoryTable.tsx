import Link from "next/link";
import {
  CONTRACTOR_REVISION_KIND_RU,
  ORDER_REVISION_KIND_RU,
  type RevisionsHistoryItem,
} from "@/lib/revisions-history";
import { formatMoscowDateTime } from "@/lib/moscow-datetime-format";
import { orderPathById } from "@/lib/order-public-ref";

export function OrdersHistoryTable({ items }: { items: RevisionsHistoryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
        По запросу ничего не найдено. Измените строку поиска или сбросьте фильтр.
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] shadow-sm [-webkit-overflow-scrolling:touch]">
      <table className="w-full min-w-[52rem] table-fixed border-collapse text-left text-sm sm:min-w-[56rem]">
        <colgroup>
          <col style={{ width: "9.5rem" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "7rem" }} />
          <col style={{ width: "30%" }} />
          <col style={{ width: "5.5rem" }} />
        </colgroup>
        <thead>
          <tr className="border-b border-[var(--card-border)] bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            <th className="min-w-0 truncate px-2 py-2.5 sm:px-3 sm:py-3">Когда</th>
            <th className="min-w-0 truncate px-2 py-2.5 sm:px-3 sm:py-3" title="Объект">
              Объект
            </th>
            <th className="min-w-0 truncate px-2 py-2.5 sm:px-3 sm:py-3" title="Пользователь">
              Пользователь
            </th>
            <th className="min-w-0 truncate px-2 py-2.5 sm:px-3 sm:py-3">Тип</th>
            <th className="min-w-0 truncate px-2 py-2.5 sm:px-3 sm:py-3">Описание</th>
            <th className="min-w-0 px-2 py-2.5 sm:px-3 sm:py-3" aria-label="Действие" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) =>
            item.t === "order" ? (
              <tr
                key={`o-${item.row.id}`}
                className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--table-row-hover)]"
              >
                <td className="min-w-0 whitespace-nowrap px-2 py-2 text-[var(--text-strong)] sm:px-3 sm:py-2.5">
                  {formatMoscowDateTime(item.row.createdAt)}
                </td>
                <td className="min-w-0 px-2 py-2 sm:px-3 sm:py-2.5 text-[var(--app-text)]">
                  <Link
                    href={orderPathById(item.row.order.id)}
                    className="block truncate font-mono font-medium text-[var(--sidebar-blue)] hover:underline"
                    title={`Наряд ${item.row.order.orderNumber}`}
                  >
                    <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      Наряд{" "}
                    </span>
                    {item.row.order.orderNumber}
                  </Link>
                </td>
                <td
                  className="min-w-0 px-2 py-2 sm:px-3 sm:py-2.5 text-[var(--text-strong)]"
                  title={item.row.actorLabel}
                >
                  <span className="block truncate">{item.row.actorLabel}</span>
                </td>
                <td
                  className="min-w-0 px-2 py-2 sm:px-3 sm:py-2.5 text-[var(--text-body)]"
                  title={ORDER_REVISION_KIND_RU[item.row.kind] ?? item.row.kind}
                >
                  <span className="block truncate">
                    {ORDER_REVISION_KIND_RU[item.row.kind] ?? item.row.kind}
                  </span>
                </td>
                <td
                  className="min-w-0 px-2 py-2 sm:px-3 sm:py-2.5 text-[var(--text-secondary)]"
                  title={item.row.summary}
                >
                  <span className="block whitespace-normal break-words">
                    {item.row.summary}
                  </span>
                </td>
                <td className="min-w-0 whitespace-nowrap px-2 py-2 sm:px-3 sm:py-2.5">
                  <Link
                    href={`${orderPathById(item.row.order.id)}?tab=history`}
                    className="text-xs font-medium text-[var(--sidebar-blue)] hover:underline"
                  >
                    Открыть
                  </Link>
                </td>
              </tr>
            ) : (
              <tr
                key={`c-${item.row.id}`}
                className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--table-row-hover)]"
              >
                <td className="min-w-0 whitespace-nowrap px-2 py-2 text-[var(--text-strong)] sm:px-3 sm:py-2.5">
                  {formatMoscowDateTime(item.row.createdAt)}
                </td>
                <td className="min-w-0 px-2 py-2 sm:px-3 sm:py-2.5 text-[var(--app-text)]">
                  {item.row.clinic ? (
                    <Link
                      href={`/clients/${item.row.clinic.id}`}
                      className="block truncate font-medium text-[var(--sidebar-blue)] hover:underline"
                      title={`Клиника ${item.row.clinic.name}`}
                    >
                      <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                        Клиника{" "}
                      </span>
                      {item.row.clinic.name}
                    </Link>
                  ) : item.row.doctor ? (
                    <Link
                      href={`/clients/doctors/${item.row.doctor.id}`}
                      className="block truncate font-medium text-[var(--sidebar-blue)] hover:underline"
                      title={`Врач ${item.row.doctor.fullName}`}
                    >
                      <span className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                        Врач{" "}
                      </span>
                      {item.row.doctor.fullName}
                    </Link>
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </td>
                <td
                  className="min-w-0 px-2 py-2 sm:px-3 sm:py-2.5 text-[var(--text-strong)]"
                  title={item.row.actorLabel}
                >
                  <span className="block truncate">{item.row.actorLabel}</span>
                </td>
                <td
                  className="min-w-0 px-2 py-2 sm:px-3 sm:py-2.5 text-[var(--text-body)]"
                  title={
                    CONTRACTOR_REVISION_KIND_RU[item.row.kind] ?? item.row.kind
                  }
                >
                  <span className="block truncate">
                    {CONTRACTOR_REVISION_KIND_RU[item.row.kind] ?? item.row.kind}
                  </span>
                </td>
                <td
                  className="min-w-0 px-2 py-2 sm:px-3 sm:py-2.5 text-[var(--text-secondary)]"
                  title={item.row.summary}
                >
                  <span className="block whitespace-normal break-words">
                    {item.row.summary}
                  </span>
                </td>
                <td className="min-w-0 whitespace-nowrap px-2 py-2 sm:px-3 sm:py-2.5">
                  {item.row.clinic ? (
                    <Link
                      href={`/clients/${item.row.clinic.id}`}
                      className="text-xs font-medium text-[var(--sidebar-blue)] hover:underline"
                    >
                      Открыть
                    </Link>
                  ) : item.row.doctor ? (
                    <Link
                      href={`/clients/doctors/${item.row.doctor.id}`}
                      className="text-xs font-medium text-[var(--sidebar-blue)] hover:underline"
                    >
                      Открыть
                    </Link>
                  ) : null}
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
