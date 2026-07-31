import {
  moscowActualAppointmentWindowYmd,
  moscowTodayYmd,
  parseYmdOrNull,
} from "@/lib/shipments-date-range";

export type OrdersShipmentMode = "actual" | "period";

export type ParsedOrdersShipmentParams = {
  mode: OrdersShipmentMode | null;
  shipFrom: string | null;
  shipTo: string | null;
  /** period без shipTo — невалидно */
  periodError: string | null;
};

export function parseOrdersShipmentMode(
  raw: string | null | undefined,
): OrdersShipmentMode | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (v === "actual" || v === "period") return v;
  return null;
}

export function parseOrdersShipmentParams(input: {
  ship?: string | null;
  shipFrom?: string | null;
  shipTo?: string | null;
}): ParsedOrdersShipmentParams {
  const mode = parseOrdersShipmentMode(input.ship);
  if (!mode) {
    return { mode: null, shipFrom: null, shipTo: null, periodError: null };
  }

  if (mode === "actual") {
    return { mode, shipFrom: null, shipTo: null, periodError: null };
  }

  const shipTo = parseYmdOrNull(input.shipTo);
  if (!shipTo) {
    return {
      mode,
      shipFrom: null,
      shipTo: null,
      periodError: "Укажите дату «по» для периода записи.",
    };
  }

  const shipFromRaw = parseYmdOrNull(input.shipFrom);
  if (input.shipFrom?.trim() && !shipFromRaw) {
    return {
      mode,
      shipFrom: null,
      shipTo,
      periodError: "Некорректная дата «с» в периоде записи.",
    };
  }

  if (shipFromRaw && shipFromRaw > shipTo) {
    return {
      mode,
      shipFrom: shipFromRaw,
      shipTo,
      periodError: "Дата «с» не может быть позже даты «по».",
    };
  }

  return { mode, shipFrom: shipFromRaw, shipTo, periodError: null };
}

export function ordersShipmentModeLabel(
  parsed: ParsedOrdersShipmentParams,
): string | null {
  if (!parsed.mode) return null;
  if (parsed.mode === "actual") {
    const { startYmd, endYmd } = moscowActualAppointmentWindowYmd(moscowTodayYmd());
    return `актуальное ${formatRuYmd(startYmd)}–${formatRuYmd(endYmd)}`;
  }
  if (parsed.shipFrom && parsed.shipTo) {
    return `запись ${formatRuYmd(parsed.shipFrom)}–${formatRuYmd(parsed.shipTo)}`;
  }
  if (parsed.shipTo) {
    return `запись до ${formatRuYmd(parsed.shipTo)}`;
  }
  return "за период";
}

function formatRuYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return `${d}.${m}.${y}`;
}

export type OrdersListHrefShipmentOpts = {
  ship?: OrdersShipmentMode | null;
  shipFrom?: string | null;
  shipTo?: string | null;
};

/** Добавляет ship/shipFrom/shipTo в URLSearchParams списка заказов. */
export function appendOrdersShipmentParams(
  p: URLSearchParams,
  opts: OrdersListHrefShipmentOpts,
): void {
  if (!opts.ship) {
    p.delete("ship");
    p.delete("shipFrom");
    p.delete("shipTo");
    return;
  }
  p.set("ship", opts.ship);
  if (opts.ship === "actual") {
    p.delete("shipFrom");
    p.delete("shipTo");
    return;
  }
  const from = opts.shipFrom?.trim() || "";
  const to = opts.shipTo?.trim() || "";
  if (from) p.set("shipFrom", from);
  else p.delete("shipFrom");
  if (to) p.set("shipTo", to);
  else p.delete("shipTo");
}

export function pickOrdersShipmentHrefOpts(
  sp: { get: (key: string) => string | null },
): OrdersListHrefShipmentOpts {
  return {
    ship: parseOrdersShipmentMode(sp.get("ship")),
    shipFrom: sp.get("shipFrom"),
    shipTo: sp.get("shipTo"),
  };
}

/** Список заказов в режиме отгрузок (`/orders?ship=…`). */
export function isOrdersShipmentListPath(
  pathname: string,
  search = "",
): boolean {
  if (pathname !== "/orders") return false;
  const raw = search.startsWith("?") ? search.slice(1) : search;
  return parseOrdersShipmentMode(new URLSearchParams(raw).get("ship")) != null;
}

/** PDF-выгрузка списка отгрузок (те же ship/shipFrom/shipTo). */
export function ordersShipmentListPdfHref(
  opts: OrdersListHrefShipmentOpts,
): string | null {
  if (!opts.ship) return null;
  if (opts.ship === "period" && !opts.shipTo?.trim()) return null;
  const p = new URLSearchParams();
  appendOrdersShipmentParams(p, opts);
  const q = p.toString();
  return q ? `/api/shipments/orders-list-pdf?${q}` : null;
}
