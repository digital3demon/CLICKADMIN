"use client";

import { DateRangePresets, FilterBadge } from "@/components/ui";
import { useUrlFilters } from "@/lib/hooks/useUrlFilters";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import { OrdersListPeriodForm } from "@/components/orders/OrdersListPeriodForm";
import { OrdersListSearch } from "@/components/orders/OrdersListSearch";

type Props = {
  pageSize: number;
  appliedFrom: string | null;
  appliedTo: string | null;
  initialSearchQ: string;
  tag?: string | null;
  hideShipped?: boolean;
  onlyShipped?: boolean;
  /** false — поиск вынесен в липкую полосу над списком (мобильная версия). */
  showSearch?: boolean;
  className?: string;
};

/**
 * Макет: одна плотная строка — поиск · даты · Показать · пресеты · Фильтры.
 * Высота карточки как у полосы пилюль (компактный padding + h-9 контролы).
 */
export function OrdersListFiltersBar({
  pageSize,
  appliedFrom,
  appliedTo,
  initialSearchQ,
  tag,
  hideShipped,
  onlyShipped,
  showSearch = true,
  className = "",
}: Props) {
  const { activeCount, resetFilters, setFilters } = useUrlFilters();
  const isHarmony = useUiDesign() === "harmony";

  const cardClass = [
    isHarmony
      ? "no-print relative z-[55] flex h-full min-h-[3.25rem] w-full min-w-0 items-center overflow-visible rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1.5 card-shadow sm:px-3 sm:py-2"
      : "no-print relative z-[55] flex h-full min-h-[3.25rem] w-full min-w-0 items-center overflow-visible rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2.5 py-1.5 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] sm:px-3 sm:py-2",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClass}>
      {/* Без горизонтального скролла: сначала сжимаются поиск/даты, потом wrap. */}
      <div className="flex min-w-0 w-full flex-wrap items-center gap-x-1.5 gap-y-1.5">
        {showSearch ? (
          <OrdersListSearch
            initialValue={initialSearchQ}
            pageSize={pageSize}
            tag={tag}
            hideShipped={hideShipped}
            onlyShipped={onlyShipped}
            className="min-w-0 max-w-full basis-[7.5rem] grow shrink sm:basis-[9rem] sm:max-w-[12rem] lg:max-w-[14rem]"
            dense
          />
        ) : null}

        <OrdersListPeriodForm
          pageSize={pageSize}
          appliedFrom={appliedFrom}
          appliedTo={appliedTo}
          className="min-w-0 shrink"
          dense
        />

        <DateRangePresets
          currentFrom={appliedFrom ?? undefined}
          currentTo={appliedTo ?? undefined}
          onSelect={(from, to) => setFilters({ from, to })}
          compact
        />

        <FilterBadge
          count={activeCount}
          onReset={resetFilters}
          onToggle={() => {
            if (activeCount > 0) resetFilters();
          }}
          expanded
        />
      </div>
    </div>
  );
}
