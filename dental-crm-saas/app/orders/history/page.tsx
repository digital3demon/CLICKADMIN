import Link from "next/link";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { getPrisma } from "@/lib/get-prisma";
export const dynamic = "force-dynamic";

const ORDER_KIND_RU: Record<string, string> = {
  CREATE: "Создание",
  SAVE: "Сохранение",
  RESTORE: "Восстановление",
};

const CONTRACTOR_KIND_RU: Record<string, string> = {
  CREATE: "Создание",
  UPDATE: "Сохранение",
};

const TAKE_EACH = 100;
const MERGED_LIMIT = 150;

type OrderRow = {
  id: string;
  createdAt: Date;
  actorLabel: string;
  summary: string;
  kind: string;
  order: { id: string; orderNumber: string };
};

type ContractorRow = {
  id: string;
  createdAt: Date;
  actorLabel: string;
  summary: string;
  kind: string;
  clinic: { id: string; name: string } | null;
  doctor: { id: string; fullName: string } | null;
};

type TimelineItem =
  | { t: "order"; at: number; row: OrderRow }
  | { t: "contractor"; at: number; row: ContractorRow };

export default async function OrdersHistoryPage() {
  let merged: TimelineItem[] = [];
  try {
    const [orderRows, contractorRows] = await Promise.all([
      (await getPrisma()).orderRevision.findMany({
        orderBy: { createdAt: "desc" },
        take: TAKE_EACH,
        select: {
          id: true,
          createdAt: true,
          actorLabel: true,
          summary: true,
          kind: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
        },
      }),
      (await getPrisma()).contractorRevision.findMany({
        orderBy: { createdAt: "desc" },
        take: TAKE_EACH,
        select: {
          id: true,
          createdAt: true,
          actorLabel: true,
          summary: true,
          kind: true,
          clinic: { select: { id: true, name: true } },
          doctor: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    const items: TimelineItem[] = [
      ...orderRows.map((r) => ({
        t: "order" as const,
        at: r.createdAt.getTime(),
        row: r,
      })),
      ...contractorRows.map((r) => ({
        t: "contractor" as const,
        at: r.createdAt.getTime(),
        row: r,
      })),
    ];
    items.sort((a, b) => b.at - a.at);
    merged = items.slice(0, MERGED_LIMIT);
  } catch (e) {
    console.error("[orders/history]", e);
  }

  return (
    <ModuleFrame title="История изменений">
      <div className="min-w-0 space-y-4">
        {merged.length === 0 ? (
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
            Журнал пуст. После сохранения нарядов и карточек клиентов здесь
            появятся записи.
          </div>
        ) : (
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
                  <th className="min-w-0 truncate px-2 py-2.5 sm:px-3 sm:py-3">
                    Когда
                  </th>
                  <th
                    className="min-w-0 truncate px-2 py-2.5 sm:px-3 sm:py-3"
                    title="Объект"
                  >
                    Объект
                  </th>
                  <th
                    className="min-w-0 truncate px-2 py-2.5 sm:px-3 sm:py-3"
                    title="Пользователь"
                  >
                    Пользователь
                  </th>
                  <th className="min-w-0 truncate px-2 py-2.5 sm:px-3 sm:py-3">
                    Тип
                  </th>
                  <th className="min-w-0 truncate px-2 py-2.5 sm:px-3 sm:py-3">
                    Описание
                  </th>
                  <th
                    className="min-w-0 px-2 py-2.5 sm:px-3 sm:py-3"
                    aria-label="Действие"
                  />
                </tr>
              </thead>
              <tbody>
                {merged.map((item) =>
                  item.t === "order" ? (
                    <tr
                      key={`o-${item.row.id}`}
                      className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--table-row-hover)]"
                    >
                      <td className="min-w-0 whitespace-nowrap px-2 py-2 text-[var(--text-strong)] sm:px-3 sm:py-2.5">
                        {item.row.createdAt.toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="min-w-0 px-2 py-2 sm:px-3 sm:py-2.5 text-[var(--app-text)]">
                        <Link
                          href={`/orders/${item.row.order.id}`}
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
                        title={ORDER_KIND_RU[item.row.kind] ?? item.row.kind}
                      >
                        <span className="block truncate">
                          {ORDER_KIND_RU[item.row.kind] ?? item.row.kind}
                        </span>
                      </td>
                      <td
                        className="min-w-0 px-2 py-2 sm:px-3 sm:py-2.5 text-[var(--text-secondary)]"
                        title={item.row.summary}
                      >
                        <span className="block truncate">{item.row.summary}</span>
                      </td>
                      <td className="min-w-0 whitespace-nowrap px-2 py-2 sm:px-3 sm:py-2.5">
                        <Link
                          href={`/orders/${item.row.order.id}?tab=history`}
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
                        {item.row.createdAt.toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
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
                        title={CONTRACTOR_KIND_RU[item.row.kind] ?? item.row.kind}
                      >
                        <span className="block truncate">
                          {CONTRACTOR_KIND_RU[item.row.kind] ?? item.row.kind}
                        </span>
                      </td>
                      <td
                        className="min-w-0 px-2 py-2 sm:px-3 sm:py-2.5 text-[var(--text-secondary)]"
                        title={item.row.summary}
                      >
                        <span className="block truncate">{item.row.summary}</span>
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
        )}
      </div>
    </ModuleFrame>
  );
}
