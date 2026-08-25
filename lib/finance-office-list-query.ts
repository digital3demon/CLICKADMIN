import type { OrdersShipmentMode } from "@/lib/orders-shipment-list-query";
import { parseYmdOrNull } from "@/lib/shipments-date-range";

export type FinanceOfficeListHrefInput = {
  tag?: string | null;
  q?: string | null;
  tab?: string | null;
  from?: string | null;
  to?: string | null;
  ship?: OrdersShipmentMode | string | null;
  shipFrom?: string | null;
  shipTo?: string | null;
  invFrom?: string | null;
  invTo?: string | null;
};

export function parseFinanceOfficeInvoiceIssuedParams(input: {
  invFrom?: string | null;
  invTo?: string | null;
}): {
  fromYmd: string | null;
  toYmd: string | null;
  error: string | null;
} {
  const fromRaw = input.invFrom?.trim() || "";
  const toRaw = input.invTo?.trim() || "";
  if (!fromRaw && !toRaw) {
    return { fromYmd: null, toYmd: null, error: null };
  }
  const toYmd = parseYmdOrNull(input.invTo);
  if (!toYmd) {
    return {
      fromYmd: null,
      toYmd: null,
      error: "Укажите дату «по» для «Счёт выставлен».",
    };
  }
  const fromYmd = parseYmdOrNull(input.invFrom);
  if (fromRaw && !fromYmd) {
    return {
      fromYmd: null,
      toYmd,
      error: "Некорректная дата «с» у счёта.",
    };
  }
  if (fromYmd && fromYmd > toYmd) {
    return {
      fromYmd,
      toYmd,
      error: "Дата «с» не может быть позже даты «по».",
    };
  }
  return { fromYmd, toYmd, error: null };
}

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
  const invFrom = input.invFrom?.trim();
  const invTo = input.invTo?.trim();
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
  if (invFrom) sp.set("invFrom", invFrom);
  if (invTo) sp.set("invTo", invTo);
  const qs = sp.toString();
  return qs ? `/finance-office?${qs}` : "/finance-office";
}
