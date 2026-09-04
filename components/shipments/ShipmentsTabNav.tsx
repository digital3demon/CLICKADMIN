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
    <div className="no-print sticky top-0 z-50 -mx-2 bg-[var(--app-bg)] pe-2 ps-[var(--app-mobile-menu-inset,0px)] shadow-[0_4px_12px_-8px_rgba(0,0,0,0.45)] shell-laptop:static shell-laptop:z-auto shell-laptop:mx-0 shell-laptop:bg-transparent shell-laptop:px-0 shell-laptop:shadow-none">
      <nav
        className="flex w-full flex-wrap gap-8 border-b border-[var(--card-border)]"
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
    </div>
  );
}
