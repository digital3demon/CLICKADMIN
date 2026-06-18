'use client'

import { useId, useState } from 'react'
import { DateRangePresets, FilterBadge } from '@/components/ui'
import { useUrlFilters } from '@/lib/hooks/useUrlFilters'
import { useUiDesign } from '@/lib/hooks/useUiDesign'
import { OrdersListPeriodForm } from '@/components/orders/OrdersListPeriodForm'
import { OrdersListSearch } from '@/components/orders/OrdersListSearch'

type Props = {
  pageSize: number
  appliedFrom: string | null
  appliedTo: string | null
  initialSearchQ: string
  tag?: string | null
  hideShipped?: boolean
  onlyShipped?: boolean
  /** false — поиск вынесен в липкую полосу над списком (мобильная версия). */
  showSearch?: boolean
}

export function OrdersListFiltersBar({
  pageSize,
  appliedFrom,
  appliedTo,
  initialSearchQ,
  tag,
  hideShipped,
  onlyShipped,
  showSearch = true,
}: Props) {
  const { activeCount, resetFilters, setFilters } = useUrlFilters()
  const isHarmony = useUiDesign() === 'harmony'
  const filtersPanelId = useId()
  const [filtersOpen, setFiltersOpen] = useState(true)

  const cardClass = isHarmony
    ? 'no-print w-full min-w-0 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 card-shadow'
    : 'no-print w-full min-w-0 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'

  return (
    <div className={cardClass}>
      {showSearch ? (
        <OrdersListSearch
          initialValue={initialSearchQ}
          pageSize={pageSize}
          tag={tag}
          hideShipped={hideShipped}
          onlyShipped={onlyShipped}
          className="min-w-0 w-full"
        />
      ) : null}

      <div
        id={filtersPanelId}
        hidden={!filtersOpen}
        className={[
          'flex min-w-0 flex-col gap-3',
          showSearch ? 'mt-3' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="flex w-full justify-center">
          <DateRangePresets
            currentFrom={appliedFrom ?? undefined}
            currentTo={appliedTo ?? undefined}
            onSelect={(from, to) => setFilters({ from, to })}
          />
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <OrdersListPeriodForm
            pageSize={pageSize}
            appliedFrom={appliedFrom}
            appliedTo={appliedTo}
            className="min-w-0 flex-1"
          />
          <FilterBadge
            count={activeCount}
            onReset={resetFilters}
            onToggle={() => setFiltersOpen((open) => !open)}
            expanded={filtersOpen}
            controlsId={filtersPanelId}
          />
        </div>
      </div>
    </div>
  )
}
