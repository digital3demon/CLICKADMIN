import Link from "next/link";
import { financeOfficeListHref } from "@/lib/finance-office-list-query";

export type FinanceOfficeTab = "today" | "tomorrow" | "period";

function tabClass(active: boolean): string {
  return active
    ? "border-b-2 border-[var(--sidebar-blue)] pb-2.5 text-sm font-semibold text-[var(--app-text)]"
    : "border-b-2 border-transparent pb-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--app-text)]";
}

export function FinanceOfficeTabNav({
  active,
  periodFrom,
  periodTo,
  listTag = null,
  q = "",
}: {
  active: FinanceOfficeTab;
  periodFrom: string | null;
  periodTo: string | null;
  listTag?: string | null;
  q?: string | null;
}) {
  return (
    <nav
      className="flex w-full flex-wrap gap-8 border-b border-[var(--card-border)]"
      aria-label="Вид ФинОтдела"
    >
      <Link
        href={financeOfficeListHref({
          tab: "today",
          from: periodFrom,
          to: periodTo,
          tag: listTag,
          q,
        })}
        className={tabClass(active === "today")}
      >
        Сегодня
      </Link>
      <Link
        href={financeOfficeListHref({
          tab: "tomorrow",
          from: periodFrom,
          to: periodTo,
          tag: listTag,
          q,
        })}
        className={tabClass(active === "tomorrow")}
      >
        Завтра
      </Link>
      <Link
        href={financeOfficeListHref({
          tab: "period",
          from: periodFrom,
          to: periodTo,
          tag: listTag,
          q,
        })}
        className={tabClass(active === "period")}
      >
        За период
      </Link>
    </nav>
  );
}
