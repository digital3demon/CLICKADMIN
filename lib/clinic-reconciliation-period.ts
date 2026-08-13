/**
 * Чистые хелперы сверки (без Prisma / server-only).
 * Период — по дате записи; «Согласовано» — по ревизиям.
 */
import type { Prisma } from "@prisma/client";
import { parseSnapshotV1 } from "@/lib/order-revision-snapshot";
import { ordersShipmentAppointmentInRange } from "@/lib/orders-shipment-list-filter";
import { moscowInclusiveRangeBoundsUtc } from "@/lib/shipments-date-range";
import { milestonesFromRevisionColumns } from "@/lib/sticker-public-milestones";

/**
 * Период сверки по дате записи (МСК-сутки для YYYY-MM-DD из range.from/to).
 * range.from/to — как из parseDateRangeUTC (UTC-сутки тех же календарных дат).
 */
export function orderWhereReconciliationPeriod(
  range: { from: Date; to: Date },
): Prisma.OrderWhereInput {
  const fromYmd = range.from.toISOString().slice(0, 10);
  const toYmd = range.to.toISOString().slice(0, 10);
  const { start, endExclusive } = moscowInclusiveRangeBoundsUtc(fromYmd, toYmd);
  return ordersShipmentAppointmentInRange(start, endExclusive);
}

function earlierDate(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a.getTime() <= b.getTime() ? a : b;
}

/**
 * Дата согласования по снимкам ревизий:
 * — выход из labWorkStatus APPROVAL;
 * — первый вход в PRODUCTION;
 * — веха колонки Kaiten «Производство» (как на стикере).
 */
export function resolveReconciliationApprovedAt(input: {
  revisions: Array<{ createdAt: Date; snapshot: unknown }>;
}): Date | null {
  let exitApproval: Date | null = null;
  let enterProduction: Date | null = null;
  let prevLab: string | null = null;
  const columnRows: Array<{ at: Date; column: string | null }> = [];

  for (const rev of input.revisions) {
    const snap = parseSnapshotV1(rev.snapshot);
    if (!snap) continue;
    const currentLab = String(snap.order.labWorkStatus || "").trim();
    const colRaw = snap.order.kaitenColumnTitle;
    columnRows.push({
      at: rev.createdAt,
      column: typeof colRaw === "string" ? colRaw : null,
    });

    if (
      exitApproval == null &&
      prevLab === "APPROVAL" &&
      currentLab !== "" &&
      currentLab !== "APPROVAL"
    ) {
      exitApproval = rev.createdAt;
    }
    if (
      enterProduction == null &&
      currentLab === "PRODUCTION" &&
      prevLab !== "PRODUCTION"
    ) {
      enterProduction = rev.createdAt;
    }
    if (currentLab) prevLab = currentLab;
  }

  const fromColumns = milestonesFromRevisionColumns(columnRows);
  const agreedFromCol = fromColumns.agreedAt
    ? new Date(fromColumns.agreedAt)
    : null;
  if (agreedFromCol && Number.isNaN(agreedFromCol.getTime())) {
    return earlierDate(exitApproval, enterProduction);
  }
  return earlierDate(earlierDate(exitApproval, enterProduction), agreedFromCol);
}
