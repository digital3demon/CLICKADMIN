import type { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { getClientsPrisma, getPricingPrisma } from "@/lib/get-domain-prisma";
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
  compositionDiscountPercent: true,
  invoiceParsedTotalRub: true,
  clinicId: true,
  doctorId: true,
  kaitenCardTypeId: true,
  constructions: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      quantity: true,
      unitPrice: true,
      lineDiscountPercent: true,
      constructionTypeId: true,
      priceListItemId: true,
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
  "constructions" | "chatCorrections" | "prostheticsRequests" | "clinicId" | "doctorId" | "kaitenCardTypeId"
> & {
  clinic: { id: string; name: string; address: string | null } | null;
  doctor: { id: string; fullName: string };
  kaitenCardType: { name: string } | null;
  constructions: Array<{
    quantity: number;
    unitPrice: number | null;
    lineDiscountPercent: number;
    constructionType: { name: string } | null;
    priceListItem: { code: string; name: string } | null;
  }>;
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
  const clientsPrisma = await getClientsPrisma();
  const pricingPrisma = await getPricingPrisma();
  const doctorIds = Array.from(new Set(rows.map((x) => x.doctorId)));
  const clinicIds = Array.from(new Set(rows.map((x) => x.clinicId).filter(Boolean))) as string[];
  const cardTypeIds = Array.from(new Set(rows.map((x) => x.kaitenCardTypeId).filter(Boolean))) as string[];
  const constructionTypeIds = Array.from(
    new Set(rows.flatMap((x) => x.constructions.map((c) => c.constructionTypeId)).filter(Boolean)),
  ) as string[];
  const priceListItemIds = Array.from(
    new Set(rows.flatMap((x) => x.constructions.map((c) => c.priceListItemId)).filter(Boolean)),
  ) as string[];
  const [doctors, clinics, cardTypes, constructionTypes, priceItems] = await Promise.all([
    clientsPrisma.doctor.findMany({
      where: { id: { in: doctorIds } },
      select: { id: true, fullName: true },
    }),
    clinicIds.length
      ? clientsPrisma.clinic.findMany({
          where: { id: { in: clinicIds } },
          select: { id: true, name: true, address: true },
        })
      : Promise.resolve([]),
    cardTypeIds.length
      ? clientsPrisma.kaitenCardType.findMany({
          where: { id: { in: cardTypeIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    constructionTypeIds.length
      ? pricingPrisma.constructionType.findMany({
          where: { id: { in: constructionTypeIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    priceListItemIds.length
      ? pricingPrisma.priceListItem.findMany({
          where: { id: { in: priceListItemIds } },
          select: { id: true, code: true, name: true },
        })
      : Promise.resolve([]),
  ]);
  const doctorById = new Map(doctors.map((x) => [x.id, x]));
  const clinicById = new Map(clinics.map((x) => [x.id, x]));
  const cardTypeById = new Map(cardTypes.map((x) => [x.id, x]));
  const constructionTypeById = new Map(constructionTypes.map((x) => [x.id, x]));
  const priceItemById = new Map(priceItems.map((x) => [x.id, x]));

  return rows.map((o): ShipmentOrderRow => {
    const { chatCorrections, prostheticsRequests, constructions, ...rest } = o;
    const hydratedConstructions = constructions.map((c) => ({
      quantity: c.quantity,
      unitPrice: c.unitPrice,
      lineDiscountPercent: c.lineDiscountPercent,
      constructionType: c.constructionTypeId
        ? (constructionTypeById.get(c.constructionTypeId) ?? null)
        : null,
      priceListItem: c.priceListItemId
        ? (priceItemById.get(c.priceListItemId) ?? null)
        : null,
    }));
    return {
      ...rest,
      clinic: o.clinicId ? (clinicById.get(o.clinicId) ?? null) : null,
      doctor: doctorById.get(o.doctorId) ?? { id: o.doctorId, fullName: "—" },
      kaitenCardType: o.kaitenCardTypeId
        ? ((cardTypeById.get(o.kaitenCardTypeId) ?? null) as { name: string } | null)
        : null,
      constructions: hydratedConstructions,
      listCompositionMismatch: orderInvoiceCompositionMismatch({
        invoiceParsedTotalRub: o.invoiceParsedTotalRub,
        isUrgent: o.isUrgent,
        urgentCoefficient: o.urgentCoefficient,
        compositionDiscountPercent: o.compositionDiscountPercent,
        constructions: hydratedConstructions.map((c) => ({
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          lineDiscountPercent: c.lineDiscountPercent,
        })),
      }),
      listPendingChatCorrections: (chatCorrections?.length ?? 0) > 0,
      listPendingProstheticsRequests: (prostheticsRequests?.length ?? 0) > 0,
    };
  });
}
