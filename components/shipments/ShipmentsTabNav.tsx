import Link from "next/link";

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
}: {
  active: ShipmentsTab;
  /** Сохраняем в ссылке «За период», если уже заданы */
  periodFrom: string | null;
  periodTo: string | null;
}) {
  const periodHref = (() => {
    const q = new URLSearchParams();
    q.set("tab", "period");
    if (periodFrom) q.set("from", periodFrom);
    if (periodTo) q.set("to", periodTo);
    return `/shipments?${q.toString()}`;
  })();

  return (
    <nav
      className="no-print flex w-full flex-wrap gap-8 border-b border-[var(--card-border)]"
      aria-label="Вид отгрузок"
    >
      <Link href="/shipments?tab=today" className={tabClass(active === "today")}>
        Сегодня
      </Link>
      <Link
        href="/shipments?tab=tomorrow"
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
