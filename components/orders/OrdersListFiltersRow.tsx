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
    <div className="grid w-full min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">
      <OrdersListFiltersBar
        pageSize={pageSize}
        appliedFrom={appliedFrom}
        appliedTo={appliedTo}
        initialSearchQ={initialSearchQ}
        tag={tag}
        hideShipped={hideShipped}
        onlyShipped={onlyShipped}
        showSearch={showSearch}
        className="min-w-0"
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
