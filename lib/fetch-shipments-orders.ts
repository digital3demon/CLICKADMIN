import type { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { getClientsPrisma, getPricingPrisma } from "@/lib/get-domain-prisma";
import { formatCounterpartyRequisitesSummary } from "@/lib/format-counterparty-requisites-summary";
import {
  listTagWhere,
  orderAttentionListSupersetWhere,
  parseListTagParam,
} from "@/lib/order-list-tag-filter";
import { hydrateOrderKaitenLabMentionHighlight } from "@/lib/hydrate-order-kaiten-lab-mention-highlight";
import { hydrateListPendingChatCorrectionsFromInbox } from "@/lib/order-chat-corrections-read";
import { hydrateListPendingProstheticsFromInbox } from "@/lib/order-prosthetics-requests-read";
import { orderInvoiceCompositionMismatch } from "@/lib/order-invoice-composition-mismatch";
import { countOrdersWithPendingKaitenLabMentionForUser } from "@/lib/order-kaiten-lab-mention-count";

const pendingCorrectionsWhere = {
  chatCorrections: {
    some: { resolvedAt: null, rejectedAt: null },
  },
} satisfies Prisma.OrderWhereInput;

const pendingProstheticsWhere = {
  prostheticsOrdered: false,
  prostheticsRequests: {
    some: { resolvedAt: null, rejectedAt: null },
  },
} satisfies Prisma.OrderWhereInput;

/** Наряды в окне отгрузки по сроку лаборатории [start, endExclusive). */
export function shipmentDueRangeWhere(
  tenantId: string,
  start: Date,
  endExclusive: Date,
): Prisma.OrderWhereInput {
  return {
    tenantId,
    archivedAt: null,
    dueDate: { not: null, gte: start, lt: endExclusive },
  };
}

export async function countShipmentQuickFilterChips(
  db: PrismaClient,
  tenantId: string,
  start: Date,
  endExclusive: Date,
  userId?: string | null,
): Promise<{
  attentionCount: number;
  prostheticsPendingCount: number;
  labMentionCount: number;
}> {
  const scope = shipmentDueRangeWhere(tenantId, start, endExclusive);
  const [attentionCount, prostheticsPendingCount, labMentionCount] = await Promise.all([
    db.order.count({ where: { AND: [scope, pendingCorrectionsWhere] } }),
    db.order.count({ where: { AND: [scope, pendingProstheticsWhere] } }),
    countOrdersWithPendingKaitenLabMentionForUser(db, scope, userId ?? undefined),
  ]);
  return { attentionCount, prostheticsPendingCount, labMentionCount };
}

const shipmentOrderSelect = {
  id: true,
  orderNumber: true,
  patientName: true,
  legalEntity: true,
  appointmentDate: true,
  workReceivedAt: true,
  dueToAdminsAt: true,
  createdAt: true,
  dueDate: true,
  kaitenAdminDueHasTime: true,
  kaitenCardTitleLabel: true,
  kaitenCardTitleMirror: true,
  kaitenCardId: true,
  kaitenChatHasLabMention: true,
  kaitenLabMentionSignalAt: true,
  demoKanbanColumn: true,
  kaitenColumnTitle: true,
  kaitenTrackLane: true,
  prostheticsOrdered: true,
  invoicePrinted: true,
  invoicePaperDocs: true,
  invoiceSentToEdo: true,
  invoiceEdoSigned: true,
  invoiceAttachmentId: true,
  invoiceNumber: true,
  updAttachmentId: true,
  updNumber: true,
  updPrinted: true,
  payment: true,
  paymentPartialRub: true,
  adminShippedOtpr: true,
  adminShippedAt: true,
  kaitenBlocked: true,
  kaitenBlockReason: true,
  isUrgent: true,
  urgentCoefficient: true,
  compositionDiscountPercent: true,
  invoiceParsedTotalRub: true,
  invoiceMismatchAckFingerprint: true,
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
  /** Реквизиты плательщика: клиника или зеркало ИП врача (для бухгалтерии в отгрузках). */
  counterpartyRequisitesText: string | null;
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
  listKaitenLabMentionHighlight: boolean;
};

/** Наряды с непустым dueDate (срок лаборатории) в полуинтервале [start, endExclusive) — МСК-окно отгрузки; опционально пересечение с фильтром по отметке (`tag=`). */
export async function fetchShipmentOrdersInDueRange(
  db: PrismaClient,
  tenantId: string,
  start: Date,
  endExclusive: Date,
  opts?: { listTag?: string | null; userId?: string | null },
) {
  const tagDecoded =
    opts?.listTag != null && String(opts.listTag).trim()
      ? String(opts.listTag).trim()
      : null;
  const parsedTag = tagDecoded ? parseListTagParam(tagDecoded) : null;

  const dueRange: Prisma.OrderWhereInput = shipmentDueRangeWhere(
    tenantId,
    start,
    endExclusive,
  );

  const tagParts: Prisma.OrderWhereInput[] = [];
  if (parsedTag) {
    if (parsedTag.kind === "orderAttention") {
      tagParts.push(orderAttentionListSupersetWhere());
    } else {
      tagParts.push(listTagWhere(parsedTag));
    }
  }

  const where: Prisma.OrderWhereInput =
    tagParts.length === 0 ? dueRange : { AND: [dueRange, ...tagParts] };

  const rows = await db.order.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { orderNumber: "asc" }],
    select: shipmentOrderSelect,
  });
  const clientsPrisma = await getClientsPrisma();
  const pricingPrisma = await getPricingPrisma();
  const doctorIds = Array.from(new Set(rows.map((x) => x.doctorId)));
  const clinicIds = Array.from(new Set(rows.map((x) => x.clinicId).filter(Boolean))) as string[];
  const doctorIdsForPrivateRequisites = Array.from(
    new Set(rows.filter((x) => !x.clinicId).map((x) => x.doctorId)),
  );
  const cardTypeIds = Array.from(new Set(rows.map((x) => x.kaitenCardTypeId).filter(Boolean))) as string[];
  const constructionTypeIds = Array.from(
    new Set(rows.flatMap((x) => x.constructions.map((c) => c.constructionTypeId)).filter(Boolean)),
  ) as string[];
  const priceListItemIds = Array.from(
    new Set(rows.flatMap((x) => x.constructions.map((c) => c.priceListItemId)).filter(Boolean)),
  ) as string[];
  const requisiteClinicSelect = {
    id: true,
    name: true,
    address: true,
    legalFullName: true,
    inn: true,
    kpp: true,
    ogrn: true,
    bankName: true,
    bik: true,
    settlementAccount: true,
    correspondentAccount: true,
  } as const;

  const [doctors, clinics, doctorsIpRequisites, cardTypes, constructionTypes, priceItems] =
    await Promise.all([
    clientsPrisma.doctor.findMany({
      where: { id: { in: doctorIds } },
      select: { id: true, fullName: true },
    }),
    clinicIds.length
      ? clientsPrisma.clinic.findMany({
          where: { id: { in: clinicIds }, deletedAt: null },
          select: requisiteClinicSelect,
        })
      : Promise.resolve([]),
    doctorIdsForPrivateRequisites.length
      ? clientsPrisma.doctor.findMany({
          where: { id: { in: doctorIdsForPrivateRequisites } },
          select: {
            id: true,
            ipClinicAsSource: {
              select: {
                ...requisiteClinicSelect,
                deletedAt: true,
              },
            },
          },
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
  const privateReqByDoctorId = new Map(
    doctorsIpRequisites.map((d) => {
      const ip = d.ipClinicAsSource;
      if (!ip || ip.deletedAt != null) {
        return [d.id, null] as const;
      }
      const { deletedAt: _del, ...req } = ip;
      return [d.id, formatCounterpartyRequisitesSummary(req)] as const;
    }),
  );
  const clinicById = new Map(
    clinics.map((x) => {
      const { legalFullName, inn, kpp, ogrn, bankName, bik, settlementAccount, correspondentAccount, ...pub } =
        x;
      return [
        x.id,
        {
          ...pub,
          counterpartyRequisitesText: formatCounterpartyRequisitesSummary({
            legalFullName,
            inn,
            kpp,
            ogrn,
            bankName,
            bik,
            settlementAccount,
            correspondentAccount,
          }),
        },
      ] as const;
    }),
  );
  const cardTypeById = new Map(cardTypes.map((x) => [x.id, x]));
  const constructionTypeById = new Map(constructionTypes.map((x) => [x.id, x]));
  const priceItemById = new Map(priceItems.map((x) => [x.id, x]));

  const mapped = rows.map((o): ShipmentOrderRow => {
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
    const clinFull = o.clinicId ? clinicById.get(o.clinicId) : undefined;
    const counterpartyRequisitesText =
      clinFull?.counterpartyRequisitesText ??
      (!o.clinicId ? (privateReqByDoctorId.get(o.doctorId) ?? null) : null);
    return {
      ...rest,
      clinic: clinFull
        ? { id: clinFull.id, name: clinFull.name, address: clinFull.address }
        : null,
      counterpartyRequisitesText,
      doctor: doctorById.get(o.doctorId) ?? { id: o.doctorId, fullName: "—" },
      kaitenCardType: o.kaitenCardTypeId
        ? ((cardTypeById.get(o.kaitenCardTypeId) ?? null) as { name: string } | null)
        : null,
      constructions: hydratedConstructions,
      listCompositionMismatch: orderInvoiceCompositionMismatch({
        invoiceParsedTotalRub: o.invoiceParsedTotalRub,
        invoiceMismatchAckFingerprint: o.invoiceMismatchAckFingerprint,
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
      listKaitenLabMentionHighlight: false,
    };
  });

  const filtered =
    parsedTag?.kind === "orderAttention"
      ? mapped.filter(
          (r) => r.listCompositionMismatch || r.listPendingChatCorrections,
        )
      : mapped;

  return hydrateListPendingProstheticsFromInbox(
    db,
    await hydrateListPendingChatCorrectionsFromInbox(
      db,
      await hydrateOrderKaitenLabMentionHighlight(db, opts?.userId, filtered),
    ),
  );
}
