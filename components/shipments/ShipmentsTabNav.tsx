import Link from "next/link";
import { shipmentsListHref } from "@/lib/shipments-list-query";

export type ShipmentsTab = "today" | "tomorrow" | "period";

function tabClass(active: boolean): string {
  return active
    ? "border-b-2 border-[var(--sidebar-blue)] pb-2.5 text-sm font-semibold text-[var(--app-text)]"
    : "border-b-2 border-transparent pb-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--app-text)]";
}

export function ShipmentsTabNav({
  active,
  periodFrom,
  periodTo,
  /** Фильтр по отметке (`tag=`) только для ссылки «За период»; «Сегодня»/«Завтра» всегда без tag. */
  listTag = null,
}: {
  active: ShipmentsTab;
  /** Сохраняем в ссылке «За период», если уже заданы */
  periodFrom: string | null;
  periodTo: string | null;
  listTag?: string | null;
}) {
  const periodHref = shipmentsListHref({
    tab: "period",
    from: periodFrom ?? undefined,
    to: periodTo ?? undefined,
    tag: listTag ?? undefined,
  });

  return (
    <nav
      className="no-print flex w-full flex-wrap gap-8 border-b border-[var(--card-border)]"
      aria-label="Вид отгрузок"
    >
      <Link
        href={shipmentsListHref({
          tab: "today",
          from: periodFrom ?? undefined,
          to: periodTo ?? undefined,
        })}
        className={tabClass(active === "today")}
      >
        Сегодня
      </Link>
      <Link
        href={shipmentsListHref({
          tab: "tomorrow",
          from: periodFrom ?? undefined,
          to: periodTo ?? undefined,
        })}
        className={tabClass(active === "tomorrow")}
      >
        Завтра
      </Link>
      <Link href={periodHref} className={tabClass(active === "period")}>
        За период
      </Link>
    </nav>
  );
}
