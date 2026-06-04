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
}

export function OrdersListFiltersBar({
  pageSize,
  appliedFrom,
  appliedTo,
  initialSearchQ,
  tag,
  hideShipped,
  onlyShipped,
}: Props) {
  const { activeCount, resetFilters, setFilters } = useUrlFilters()
  const isHarmony = useUiDesign() === 'harmony'
  const filtersPanelId = useId()
  const [filtersOpen, setFiltersOpen] = useState(true)

  return (
    <div
      className={
        isHarmony
          ? 'no-print sticky top-0 z-30 w-full min-w-0 border-b border-[var(--card-border)] bg-[var(--card-bg)] p-4 sticky-shadow'
          : 'no-print w-full min-w-0 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]'
      }
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 xl:flex-nowrap">
        <OrdersListSearch
          initialValue={initialSearchQ}
          pageSize={pageSize}
          tag={tag}
          hideShipped={hideShipped}
          onlyShipped={onlyShipped}
          className="min-w-0 w-full flex-1 basis-full xl:max-w-2xl xl:basis-auto"
        />
        <div
          id={filtersPanelId}
          hidden={!filtersOpen}
          className="flex min-w-0 flex-1 flex-wrap items-center gap-2 basis-full xl:basis-auto xl:justify-center"
        >
          <DateRangePresets
            currentFrom={appliedFrom ?? undefined}
            currentTo={appliedTo ?? undefined}
            onSelect={(from, to) => setFilters({ from, to })}
          />
          <OrdersListPeriodForm
            pageSize={pageSize}
            appliedFrom={appliedFrom}
            appliedTo={appliedTo}
            className="min-w-0"
          />
        </div>
        <div className="ml-auto shrink-0">
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
