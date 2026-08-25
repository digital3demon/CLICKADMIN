import type { OrdersShipmentMode } from "@/lib/orders-shipment-list-query";

export type FinanceOfficeListHrefInput = {
  tag?: string | null;
  q?: string | null;
  tab?: string | null;
  from?: string | null;
  to?: string | null;
  ship?: OrdersShipmentMode | string | null;
  shipFrom?: string | null;
  shipTo?: string | null;
};

export function financeOfficeListHref(
  input: FinanceOfficeListHrefInput = {},
): string {
  const sp = new URLSearchParams();
  const tab = input.tab?.trim();
  const from = input.from?.trim();
  const to = input.to?.trim();
  const tag = input.tag?.trim();
  const q = input.q?.trim();
  const ship = String(input.ship ?? "").trim().toLowerCase();
  const shipFrom = input.shipFrom?.trim();
  const shipTo = input.shipTo?.trim();
  if (tab) sp.set("tab", tab);
  if (from) sp.set("from", from);
  if (to) sp.set("to", to);
  if (tag) sp.set("tag", tag);
  if (q) sp.set("q", q);
  if (ship === "actual" || ship === "period") {
    sp.set("ship", ship);
    if (ship === "period") {
      if (shipFrom) sp.set("shipFrom", shipFrom);
      if (shipTo) sp.set("shipTo", shipTo);
    }
  }
  const qs = sp.toString();
  return qs ? `/finance-office?${qs}` : "/finance-office";
}
