import type { PrismaClient } from "@prisma/client";
import { fetchShipmentOrdersInDueRange } from "@/lib/fetch-shipments-orders";
import { parseListTagParam } from "@/lib/order-list-tag-filter";
import {
  moscowShipmentDayBoundsUtc,
  moscowShipmentInclusiveRangeBoundsUtc,
  moscowTodayYmd,
  moscowTomorrowYmd,
  parseYmdOrNull,
} from "@/lib/shipments-date-range";

const MAX_RANGE_DAYS = 366;

function parseTab(raw: string | undefined): "today" | "tomorrow" | "period" {
  if (raw === "tomorrow" || raw === "period" || raw === "today") return raw;
  return "today";
}

function rangeDaySpan(fromYmd: string, toYmd: string): number {
  const [y1, m1, d1] = fromYmd.split("-").map(Number);
  const [y2, m2, d2] = toYmd.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/** Тот же список нарядов, что и на `/shipments` для текущих query-параметров. */
export async function loadOrdersForShipmentsStickersPrint(
  prisma: PrismaClient,
  tenantId: string,
  sp: { tab?: string; from?: string; to?: string; tag?: string },
): Promise<{
  orders: Awaited<ReturnType<typeof fetchShipmentOrdersInDueRange>>;
  error: string | null;
}> {
  const rawTag =
    typeof sp.tag === "string" && String(sp.tag).trim()
      ? String(sp.tag).trim()
      : null;
  const activeListTagFilter = rawTag ? parseListTagParam(rawTag) : null;
  const rawTagInvalid = Boolean(rawTag && !activeListTagFilter);
  const listTagForFetch = rawTagInvalid || !rawTag ? null : rawTag;

  const tab = parseTab(sp.tab);
  const fromRaw = parseYmdOrNull(sp.from ?? null);
  const toRaw = parseYmdOrNull(sp.to ?? null);

  if (tab === "today") {
    const todayYmd = moscowTodayYmd();
    const { start, endExclusive } = moscowShipmentDayBoundsUtc(todayYmd);
    const orders = await fetchShipmentOrdersInDueRange(
      prisma,
      tenantId,
      start,
      endExclusive,
      { listTag: listTagForFetch },
    );
    return { orders, error: null };
  }

  if (tab === "tomorrow") {
    const ymd = moscowTomorrowYmd();
    const { start, endExclusive } = moscowShipmentDayBoundsUtc(ymd);
    const orders = await fetchShipmentOrdersInDueRange(
      prisma,
      tenantId,
      start,
      endExclusive,
      { listTag: listTagForFetch },
    );
    return { orders, error: null };
  }

  if (!fromRaw || !toRaw) {
    return { orders: [], error: "Укажите период на странице отгрузок и нажмите «Показать»." };
  }
  if (fromRaw > toRaw) {
    return { orders: [], error: "Дата «с» не может быть позже даты «по»." };
  }
  const span = rangeDaySpan(fromRaw, toRaw);
  if (span > MAX_RANGE_DAYS) {
    return {
      orders: [],
      error: `Максимальный период — ${MAX_RANGE_DAYS} дней. Сузьте диапазон на странице отгрузок.`,
    };
  }
  const { start, endExclusive } = moscowShipmentInclusiveRangeBoundsUtc(fromRaw, toRaw);
  const orders = await fetchShipmentOrdersInDueRange(
    prisma,
    tenantId,
    start,
    endExclusive,
    { listTag: listTagForFetch },
  );
  return { orders, error: null };
}
