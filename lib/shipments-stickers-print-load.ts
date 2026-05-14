import type { PrismaClient } from "@prisma/client";
import { fetchShipmentOrdersInDueRange } from "@/lib/fetch-shipments-orders";
import { getClientsPrisma } from "@/lib/get-domain-prisma";
import { parseListTagParam } from "@/lib/order-list-tag-filter";
import {
  moscowShipmentDayBoundsUtc,
  moscowShipmentInclusiveRangeBoundsUtc,
  moscowTodayYmd,
  moscowTomorrowYmd,
  parseYmdOrNull,
} from "@/lib/shipments-date-range";

const MAX_RANGE_DAYS = 366;

export type ShipmentStickerPrintOrder = {
  id: string;
  orderNumber: string;
  patientName: string | null;
  clinic: { id: string; name: string; address: string | null } | null;
  doctor: { id: string; fullName: string };
};

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

async function loadStickerPrintOrdersByIds(
  prisma: PrismaClient,
  tenantId: string,
  orderIds: string[],
): Promise<ShipmentStickerPrintOrder[]> {
  const ids = Array.from(new Set(orderIds.map((x) => x.trim()).filter(Boolean)));
  if (ids.length === 0) return [];
  const rows = await prisma.order.findMany({
    where: { tenantId, archivedAt: null, id: { in: ids } },
    select: {
      id: true,
      orderNumber: true,
      patientName: true,
      clinicId: true,
      doctorId: true,
    },
  });
  const clientsPrisma = await getClientsPrisma();
  const clinicIds = Array.from(new Set(rows.map((x) => x.clinicId).filter(Boolean))) as string[];
  const doctorIds = Array.from(new Set(rows.map((x) => x.doctorId)));
  const [clinics, doctors] = await Promise.all([
    clinicIds.length
      ? clientsPrisma.clinic.findMany({
          where: { id: { in: clinicIds }, deletedAt: null },
          select: { id: true, name: true, address: true },
        })
      : Promise.resolve([]),
    clientsPrisma.doctor.findMany({
      where: { id: { in: doctorIds } },
      select: { id: true, fullName: true },
    }),
  ]);
  const clinicById = new Map(clinics.map((x) => [x.id, x]));
  const doctorById = new Map(doctors.map((x) => [x.id, x]));
  const indexById = new Map(ids.map((id, index) => [id, index]));
  return rows
    .map((o): ShipmentStickerPrintOrder => ({
      id: o.id,
      orderNumber: o.orderNumber,
      patientName: o.patientName,
      clinic: o.clinicId ? (clinicById.get(o.clinicId) ?? null) : null,
      doctor: doctorById.get(o.doctorId) ?? { id: o.doctorId, fullName: "—" },
    }))
    .sort((a, b) => (indexById.get(a.id) ?? 0) - (indexById.get(b.id) ?? 0));
}

/** Тот же список нарядов, что и на `/shipments` для текущих query-параметров. */
export async function loadOrdersForShipmentsStickersPrint(
  prisma: PrismaClient,
  tenantId: string,
  sp: { tab?: string; from?: string; to?: string; tag?: string; orderId?: string },
): Promise<{
  orders: ShipmentStickerPrintOrder[];
  error: string | null;
}> {
  const directOrderId =
    typeof sp.orderId === "string" && sp.orderId.trim() ? sp.orderId.trim() : null;
  if (directOrderId) {
    const orders = await loadStickerPrintOrdersByIds(prisma, tenantId, [directOrderId]);
    return {
      orders,
      error: orders.length === 0 ? "Наряд для печати этикетки не найден." : null,
    };
  }

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
