import Link from "next/link";
import {
  ordersHistoryHref,
  type OrdersHistoryTab,
} from "@/lib/corrections-history";

function tabClass(active: boolean): string {
  return active
    ? "border-b-2 border-[var(--sidebar-blue)] pb-2.5 text-sm font-semibold text-[var(--app-text)]"
    : "border-b-2 border-transparent pb-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--app-text)]";
}

export function OrdersHistoryTabNav({
  active,
  q = "",
}: {
  active: OrdersHistoryTab;
  q?: string;
}) {
  const searchQ = q.trim() || undefined;
  return (
    <nav
      className="flex w-full flex-wrap gap-8 border-b border-[var(--card-border)]"
      aria-label="Разделы истории"
    >
      <Link
        href={ordersHistoryHref({ tab: "changes", q: searchQ })}
        className={tabClass(active === "changes")}
      >
        История изменений
      </Link>
      <Link
        href={ordersHistoryHref({ tab: "corrections", q: searchQ })}
        className={tabClass(active === "corrections")}
      >
        История корректировок
      </Link>
      <Link
        href={ordersHistoryHref({ tab: "prosthetics", q: searchQ })}
        className={tabClass(active === "prosthetics")}
      >
        История заказов протетики
      </Link>
      <Link
        href={ordersHistoryHref({ tab: "tasks", q: searchQ })}
        className={tabClass(active === "tasks")}
      >
        Задачи
      </Link>
      <Link
        href={ordersHistoryHref({ tab: "pickups", q: searchQ })}
        className={tabClass(active === "pickups")}
      >
        Забрать из
      </Link>
      <Link
        href={ordersHistoryHref({ tab: "stock", q: searchQ })}
        className={tabClass(active === "stock")}
      >
        Склад
      </Link>
    </nav>
  );
}
