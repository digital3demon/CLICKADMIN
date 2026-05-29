'use client'

import { DateRangePresets, FilterBadge } from '@/components/ui'
import { useUrlFilters } from '@/lib/hooks/useUrlFilters'
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

  return (
    <div className="no-print w-full min-w-0 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] p-3 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <FilterBadge count={activeCount} onReset={resetFilters} />
      </div>
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:gap-4">
        <OrdersListSearch
          initialValue={initialSearchQ}
          pageSize={pageSize}
          tag={tag}
          hideShipped={hideShipped}
          onlyShipped={onlyShipped}
          className="w-full min-w-0 xl:max-w-2xl xl:flex-none"
        />
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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
      </div>
    </div>
  )
}
