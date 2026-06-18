'use client'

import { Suspense } from 'react'
import { OrdersListSearch } from '@/components/orders/OrdersListSearch'

/** Липкая строка поиска над списком нарядов (только мобильная ширина). */
export function OrdersListStickySearch({
  initialSearchQ,
  pageSize,
  tag,
  hideShipped,
  onlyShipped,
}: {
  initialSearchQ: string
  pageSize: number
  tag?: string | null
  hideShipped?: boolean
  onlyShipped?: boolean
}) {
  return (
    <div className="sticky top-0 z-50 -mx-2 border-b border-[var(--card-border)] bg-[var(--app-bg)] py-2 pe-2 ps-[var(--app-mobile-menu-inset,0px)] shadow-[0_4px_12px_-8px_rgba(0,0,0,0.45)] md:hidden">
      <Suspense fallback={null}>
        <OrdersListSearch
          initialValue={initialSearchQ}
          pageSize={pageSize}
          tag={tag}
          hideShipped={hideShipped}
          onlyShipped={onlyShipped}
        />
      </Suspense>
    </div>
  )
}
