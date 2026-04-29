import type { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { orderInvoiceCompositionMismatch } from "@/lib/order-invoice-composition-mismatch";

const shipmentOrderSelect = {
  id: true,
  orderNumber: true,
  patientName: true,
  appointmentDate: true,
  workReceivedAt: true,
  dueToAdminsAt: true,
  createdAt: true,
  dueDate: true,
  kaitenCardId: true,
  demoKanbanColumn: true,
  kaitenColumnTitle: true,
  prostheticsOrdered: true,
  invoicePrinted: true,
  invoiceAttachmentId: true,
  adminShippedOtpr: true,
  kaitenBlocked: true,
  kaitenBlockReason: true,
  isUrgent: true,
  urgentCoefficient: true,
  invoiceParsedTotalRub: true,
  clinic: { select: { id: true, name: true, address: true } },
  doctor: { select: { id: true, fullName: true } },
  kaitenCardType: { select: { name: true } },
  constructions: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      quantity: true,
      unitPrice: true,
      constructionType: { select: { name: true } },
      priceListItem: { select: { code: true, name: true } },
    },
  },
  listCustomTags: { select: { id: true, label: true } },
  chatCorrections: {
    where: { resolvedAt: null, rejectedAt: null },
    select: { id: true },
    take: 1,
  },
  prostheticsRequests: {
    where: { resolvedAt: null, rejectedAt: null },
    select: { id: true },
    take: 1,
  },
} as const satisfies Prisma.OrderSelect;

type OrderShipmentRaw = Prisma.OrderGetPayload<{
  select: typeof shipmentOrderSelect;
}>;

export type ShipmentOrderRow = Omit<
  OrderShipmentRaw,
  "constructions" | "chatCorrections" | "prostheticsRequests"
> & {
  listCompositionMismatch: boolean;
  listPendingChatCorrections: boolean;
  listPendingProstheticsRequests: boolean;
};

/** Наряды с непустым appointmentDate в полуинтервале [start, endExclusive) (МСК-окно отгрузки). */
export async function fetchShipmentOrdersInDueRange(
  db: PrismaClient,
  start: Date,
  endExclusive: Date,
) {
  const rows = await db.order.findMany({
    where: {
      archivedAt: null,
      appointmentDate: { not: null, gte: start, lt: endExclusive },
    },
    orderBy: [{ appointmentDate: "asc" }, { orderNumber: "asc" }],
    select: shipmentOrderSelect,
  });

  return rows.map((o): ShipmentOrderRow => {
    const { chatCorrections, prostheticsRequests, constructions, ...rest } = o;
    return {
      ...rest,
      listCompositionMismatch: orderInvoiceCompositionMismatch({
        invoiceParsedTotalRub: o.invoiceParsedTotalRub,
        isUrgent: o.isUrgent,
        urgentCoefficient: o.urgentCoefficient,
        constructions: constructions.map((c) => ({
          quantity: c.quantity,
          unitPrice: c.unitPrice,
        })),
      }),
      listPendingChatCorrections: (chatCorrections?.length ?? 0) > 0,
      listPendingProstheticsRequests: (prostheticsRequests?.length ?? 0) > 0,
    };
  });
}
