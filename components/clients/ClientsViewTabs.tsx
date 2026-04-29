import Link from "next/link";
import {
  buildClientsListUrl,
  type ClientsListUrlState,
} from "@/lib/clients-list-search";

export type ClientsListView = "clinic" | "doctor";

export function ClientsViewTabs({
  active,
  listState,
}: {
  active: ClientsListView;
  listState: ClientsListUrlState;
}) {
  const hrefClinic = buildClientsListUrl({ ...listState, view: "clinic" });
  const hrefDoctor = buildClientsListUrl({ ...listState, view: "doctor" });

  return (
    <div
      className="mb-6 flex flex-wrap gap-1.5"
      role="tablist"
      aria-label="Раздел списка клиентов"
    >
      <Link
        href={hrefClinic}
        scroll={false}
        role="tab"
        aria-selected={active === "clinic"}
        className={
          active === "clinic"
            ? "rounded-full bg-[var(--sidebar-blue)] px-3 py-1 text-xs font-semibold text-white shadow-sm sm:text-sm"
            : "rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-body)] transition-colors hover:border-[var(--input-border)] hover:bg-[var(--card-bg)] sm:text-sm"
        }
      >
        Клиника
      </Link>
      <Link
        href={hrefDoctor}
        scroll={false}
        role="tab"
        aria-selected={active === "doctor"}
        className={
          active === "doctor"
            ? "rounded-full bg-[var(--sidebar-blue)] px-3 py-1 text-xs font-semibold text-white shadow-sm sm:text-sm"
            : "rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-body)] transition-colors hover:border-[var(--input-border)] hover:bg-[var(--card-bg)] sm:text-sm"
        }
      >
        Доктор
      </Link>
    </div>
  );
}
