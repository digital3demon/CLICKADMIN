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
  idSuffix?: string;
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
  idSuffix = "",
}: Props) {
  const { activeCount, resetFilters, setFilters } = useUrlFilters();
  const isHarmony = useUiDesign() === "harmony";

  const cardClass = [
    isHarmony
      ? "no-print relative z-[55] flex h-full min-h-[2.75rem] w-full min-w-0 items-center overflow-visible rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 card-shadow sm:px-2.5 sm:py-1.5"
      : "no-print relative z-[55] flex h-full min-h-[2.75rem] w-full min-w-0 items-center overflow-visible rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-2 py-1 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06] sm:px-2.5 sm:py-1.5",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClass}>
      <div className="flex min-w-0 w-full flex-nowrap items-center gap-x-1.5 overflow-x-auto [-webkit-overflow-scrolling:touch]">
        {showSearch ? (
          <OrdersListSearch
            initialValue={initialSearchQ}
            pageSize={pageSize}
            tag={tag}
            hideShipped={hideShipped}
            onlyShipped={onlyShipped}
            className="min-w-0 max-w-[10rem] basis-[7rem] shrink grow sm:max-w-[12rem] sm:basis-[8rem] lg:max-w-[14rem]"
            dense
            idSuffix={idSuffix}
          />
        ) : null}

        <OrdersListPeriodForm
          pageSize={pageSize}
          appliedFrom={appliedFrom}
          appliedTo={appliedTo}
          className="min-w-0 shrink-0"
          dense
          idSuffix={idSuffix}
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
