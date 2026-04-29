import Link from "next/link";
import { getPrisma } from "@/lib/get-prisma";
import { STOCK_MOVEMENT_KIND_LABELS } from "@/lib/inventory/stock-movement-kind-labels";

export async function OrderStockMovementsCard({ orderId }: { orderId: string }) {
  const rows = await (await getPrisma()).stockMovement.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: {
      item: { select: { name: true, unit: true } },
      warehouse: { select: { name: true } },
    },
  });

  if (rows.length === 0) {
    return (
      <div className="mt-8 rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
        <p className="font-medium text-[var(--text-strong)]">Склад</p>
        <p className="mt-1">
          Списаний материалов по этому наряду нет. Учётные позиции — в{" "}
          <Link
            href="/directory/warehouse"
            className="font-medium text-[var(--sidebar-blue)] hover:underline"
          >
            Конфигурация → Склад
          </Link>
          ; расход оформляется в разделе{" "}
          <Link
            href="/warehouse"
            className="font-medium text-[var(--sidebar-blue)] hover:underline"
          >
            Склад
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-body)]">
          Склад: движения по наряду
        </h2>
        <Link
          href="/warehouse"
          className="text-xs font-medium text-[var(--sidebar-blue)] hover:underline"
        >
          Все остатки →
        </Link>
      </div>
      <ul className="mt-3 divide-y divide-[var(--border-subtle)] text-sm">
        {rows.map((r) => {
          const returned =
            r.kind === "SALE_ISSUE" && r.returnedToWarehouseAt != null;
          const strike = returned ? "line-through opacity-65" : "";
          return (
            <li
              key={r.id}
              className={`flex flex-wrap gap-x-4 gap-y-1 py-2 ${strike}`}
            >
              <span className="text-xs text-[var(--text-muted)]">
                {r.createdAt.toLocaleString("ru-RU")}
              </span>
              <span className="font-medium text-[var(--text-strong)]">
                {STOCK_MOVEMENT_KIND_LABELS[r.kind] ?? r.kind}
                {returned ? (
                  <span className="ml-2 font-normal text-[var(--text-muted)]">
                    (возврат на склад)
                  </span>
                ) : null}
              </span>
              <span>
                {r.item.name}{" "}
                <span className="text-[var(--text-muted)]">
                  ×{r.quantity} {r.item.unit}
                </span>
              </span>
              <span className="text-[var(--text-muted)]">{r.warehouse.name}</span>
              {r.totalCostRub != null ? (
                <span className="tabular-nums text-[var(--text-secondary)]">
                  {r.totalCostRub.toLocaleString("ru-RU", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  ₽
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
