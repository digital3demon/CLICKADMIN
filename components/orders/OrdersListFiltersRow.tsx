"use client";

import { OrdersListFiltersBar } from "@/components/orders/OrdersListFiltersBar";
import { OrdersShipmentPanel } from "@/components/orders/OrdersShipmentPanel";

type Props = {
  pageSize: number;
  appliedFrom: string | null;
  appliedTo: string | null;
  initialSearchQ: string;
  tag?: string | null;
  hideShipped?: boolean;
  onlyShipped?: boolean;
  showSearch?: boolean;
  appliedShipFrom: string | null;
  appliedShipTo: string | null;
  shipMode: "actual" | "period" | null;
};

export function OrdersListFiltersRow({
  pageSize,
  appliedFrom,
  appliedTo,
  initialSearchQ,
  tag,
  hideShipped,
  onlyShipped,
  showSearch = true,
  appliedShipFrom,
  appliedShipTo,
  shipMode,
}: Props) {
  return (
    <div className="grid w-full min-w-0 grid-cols-1 items-stretch gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(16rem,1fr)]">
      <OrdersListFiltersBar
        pageSize={pageSize}
        appliedFrom={appliedFrom}
        appliedTo={appliedTo}
        initialSearchQ={initialSearchQ}
        tag={tag}
        hideShipped={hideShipped}
        onlyShipped={onlyShipped}
        showSearch={showSearch}
        className="min-w-0 h-full"
      />
      <OrdersShipmentPanel
        pageSize={pageSize}
        appliedShipFrom={appliedShipFrom}
        appliedShipTo={appliedShipTo}
        shipMode={shipMode}
      />
    </div>
  );
}
