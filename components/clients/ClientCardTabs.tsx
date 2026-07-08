"use client";

import Link from "next/link";

type TabId = "overview" | "requisites" | "finance" | "price";

const BASE_ITEMS: { id: Exclude<TabId, "price">; label: string }[] = [
  { id: "overview", label: "Обзор" },
  { id: "requisites", label: "Реквизиты" },
  { id: "finance", label: "Финансы" },
];

function tabHref(base: string, tab: TabId): string {
  const p = new URLSearchParams();
  if (tab !== "overview") p.set("tab", tab);
  const q = p.toString();
  return q ? `${base}?${q}` : base;
}

export function ClientCardTabs({
  basePath,
  active,
  showPriceTab = false,
}: {
  /** Напр. `/clients/abc` или `/clients/doctors/abc` */
  basePath: string;
  active: TabId;
  /** Вкладка «Прайс» нужна только в карточке клиники */
  showPriceTab?: boolean;
}) {
  const base = basePath.replace(/\/$/, "");
  const items = showPriceTab
    ? [...BASE_ITEMS, { id: "price" as const, label: "Прайс" }]
    : BASE_ITEMS;

  return (
    <div
      className="mb-6 flex flex-wrap gap-1.5"
      role="tablist"
      aria-label="Разделы карточки клиента"
    >
      {items.map((item) => {
        const isActive = item.id === active;
        const href = tabHref(base, item.id);
        return (
          <Link
            key={item.id}
            href={href}
            role="tab"
            aria-selected={isActive}
            scroll={false}
            className={
              isActive
                ? "rounded-full bg-[var(--sidebar-blue)] px-3 py-1 text-xs font-semibold text-white shadow-sm sm:text-sm"
                : "rounded-full border border-[var(--card-border)] bg-[var(--surface-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-body)] transition-colors hover:border-[var(--input-border)] hover:bg-[var(--card-bg)] sm:text-sm"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
