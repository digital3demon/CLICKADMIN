import "server-only";

import type { PrismaClient } from "@prisma/client";
import { ORDER_PAYMENT_PAID, ORDER_PAYMENT_PARTIAL } from "@/lib/order-clinic-client-fields";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import type { RecentPaidOrderRow } from "@/lib/recent-orders-paid-from-revisions-logic";
import {
  lastPaidTransitionAtFromRevisions,
  lastPartialTransitionAtFromRevisions,
} from "@/lib/recent-orders-paid-from-revisions-logic";

export type { RecentPaidOrderRow } from "@/lib/recent-orders-paid-from-revisions-logic";

function daysAgoUtc(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

const CANDIDATE_LIMIT = 160;
/** Шире окна «недавности», иначе цепочка снимков начинается уже с «Оплачено» и переход не виден. */
const REVISION_LOOKBACK_DAYS = 730;
const RESULT_LIMIT = 12;
const RECENCY_DAYS = 60;

/**
 * Наряды с недавним переходом на «Оплачено» (с неоплач./частично) или на «Частично оплачено»
 * (с любого статуса, кроме уже частичной оплаты). Текущий `Order.payment` должен совпадать с видом строки.
 */
export async function getRecentOrdersPaidAfterUnpaidOrPartial(
  prisma: PrismaClient,
  tenantId: string,
): Promise<RecentPaidOrderRow[]> {
  const sinceRecency = daysAgoUtc(RECENCY_DAYS);
  const sinceRevisions = daysAgoUtc(REVISION_LOOKBACK_DAYS);

  const candidates = await prisma.order.findMany({
    where: {
      tenantId,
      archivedAt: null,
      payment: { in: [ORDER_PAYMENT_PAID, ORDER_PAYMENT_PARTIAL] },
      updatedAt: { gte: sinceRecency },
    },
    orderBy: { updatedAt: "desc" },
    take: CANDIDATE_LIMIT,
    select: {
      id: true,
      orderNumber: true,
      payment: true,
      patientName: true,
      doctor: { select: { fullName: true } },
    },
  });

  if (candidates.length === 0) return [];

  const idList = candidates.map((c) => c.id);
  const metaById = new Map(
    candidates.map(
      (c) =>
        [
          c.id,
          {
            paymentKind:
              (c.payment ?? "").trim() === ORDER_PAYMENT_PARTIAL ? ("partial" as const) : ("paid" as const),
            orderNumber: c.orderNumber,
            doctorLabel:
              personNameSurnameInitials(c.doctor.fullName).trim() ||
              (c.doctor.fullName ?? "").trim(),
            patientLabel:
              personNameSurnameInitials(c.patientName).trim() ||
              (c.patientName ?? "").trim(),
          },
        ] as const,
    ),
  );

  const revs = await prisma.orderRevision.findMany({
    where: {
      orderId: { in: idList },
      createdAt: { gte: sinceRevisions },
    },
    orderBy: { createdAt: "asc" },
    select: { orderId: true, createdAt: true, snapshot: true },
  });

  const byOrder = new Map<string, Array<{ createdAt: Date; snapshot: (typeof revs)[0]["snapshot"] }>>();
  for (const r of revs) {
    const arr = byOrder.get(r.orderId);
    const row = { createdAt: r.createdAt, snapshot: r.snapshot };
    if (arr) arr.push(row);
    else byOrder.set(r.orderId, [row]);
  }

  const out: RecentPaidOrderRow[] = [];
  for (const id of idList) {
    const chain = byOrder.get(id);
    if (!chain || chain.length < 2) continue;
    const meta = metaById.get(id);
    if (!meta) continue;
    const changedAt =
      meta.paymentKind === "paid"
        ? lastPaidTransitionAtFromRevisions(chain)
        : lastPartialTransitionAtFromRevisions(chain);
    if (!changedAt) continue;
    if (changedAt < sinceRecency) continue;
    out.push({
      orderId: id,
      orderNumber: meta.orderNumber,
      changedAt: changedAt.toISOString(),
      doctorLabel: meta.doctorLabel,
      patientLabel: meta.patientLabel,
      paymentKind: meta.paymentKind,
    });
  }

  out.sort((a, b) => (a.changedAt < b.changedAt ? 1 : a.changedAt > b.changedAt ? -1 : 0));
  return out.slice(0, RESULT_LIMIT);
}
