import type { Prisma, PrismaClient } from "@prisma/client";
import { getClientsPrisma, getPricingPrisma } from "@/lib/get-domain-prisma";
import {
  financeOfficeListTagSkipsDueDateWindow,
  financeOfficeScopeWhere,
} from "@/lib/finance-office-list-scope";
import { countOrdersWithPendingKaitenLabMentionForUser } from "@/lib/order-kaiten-lab-mention-count";
import { hydrateOrderKaitenLabMentionHighlight } from "@/lib/hydrate-order-kaiten-lab-mention-highlight";
import {
  formatCounterpartyRequisitesShortSummary,
} from "@/lib/format-counterparty-requisites-summary";
import {
  listTagWhere,
  orderAttentionListSupersetWhere,
  parseListTagParam,
} from "@/lib/order-list-tag-filter";
import { orderInvoiceCompositionMismatch } from "@/lib/order-invoice-composition-mismatch";

const financeOfficeOrderSelect = {
  id: true,
  orderNumber: true,
  patientName: true,
  createdAt: true,
  legalEntity: true,
  dueDate: true,
  kaitenCardId: true,
  kaitenColumnTitle: true,
  demoKanbanColumn: true,
  kaitenCardType: { select: { name: true } },
  prostheticsOrdered: true,
  invoiceAttachmentId: true,
  invoicePrinted: true,
  payment: true,
  paymentPartialRub: true,
  adminShippedOtpr: true,
  financeCalculated: true,
  kaitenBlocked: true,
  kaitenBlockReason: true,
  isUrgent: true,
  urgentCoefficient: true,
  compositionDiscountPercent: true,
  invoiceParsedTotalRub: true,
  clinicId: true,
  doctorId: true,
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
  kaitenChatHasLabMention: true,
  kaitenLabMentionSignalAt: true,
} as const satisfies Prisma.OrderSelect;

type FinanceOfficeRaw = Prisma.OrderGetPayload<{
  select: typeof financeOfficeOrderSelect;
}>;

export type FinanceOfficeOrderRow = Omit<
  FinanceOfficeRaw,
  "constructions" | "chatCorrections" | "prostheticsRequests" | "clinicId" | "doctorId"
> & {
  clinic: { id: string; name: string; address: string | null; legalFullName: string | null } | null;
  counterpartyRequisitesText: string | null;
  doctor: { id: string; fullName: string };
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

export {
  financeOfficeListTagSkipsDueDateWindow,
  financeOfficeScopeWhere,
} from "@/lib/finance-office-list-scope";

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

/** Счётчики чипов — без окна dueDate (как createdAt у списка «Заказы»), только поиск. */
export function financeOfficeChipCountScopeWhere(
  tenantId: string,
  opts: { search?: string | null } = {},
): Prisma.OrderWhereInput {
  return financeOfficeScopeWhere(tenantId, { search: opts.search });
}

export async function countFinanceOfficeQuickFilterChips(
  db: PrismaClient,
  tenantId: string,
  opts: {
    search?: string | null;
    userId?: string;
  } = {},
): Promise<{
  attentionCount: number;
  prostheticsPendingCount: number;
  labMentionCount: number;
}> {
  const scope = financeOfficeChipCountScopeWhere(tenantId, opts);
  const [attentionCount, prostheticsPendingCount, labMentionCount] =
    await Promise.all([
      db.order.count({ where: { AND: [scope, pendingCorrectionsWhere] } }),
      db.order.count({ where: { AND: [scope, pendingProstheticsWhere] } }),
      countOrdersWithPendingKaitenLabMentionForUser(db, scope, opts.userId),
    ]);
  return { attentionCount, prostheticsPendingCount, labMentionCount };
}

function financePriority(row: FinanceOfficeOrderRow): number {
  if (row.listPendingChatCorrections) return 0;
  if (row.listPendingProstheticsRequests) return 1;
  if (!row.financeCalculated) return 2;
  return 3;
}

export async function fetchFinanceOfficeOrders(
  db: PrismaClient,
  tenantId: string,
  opts: {
    listTag?: string | null;
    search?: string | null;
    start?: Date | null;
    endExclusive?: Date | null;
    userId?: string | null;
  } = {},
): Promise<FinanceOfficeOrderRow[]> {
  const parsedTag = opts.listTag?.trim() ? parseListTagParam(opts.listTag) : null;
  const skipDueDateWindow = financeOfficeListTagSkipsDueDateWindow(parsedTag);
  const parts: Prisma.OrderWhereInput[] = [
    financeOfficeScopeWhere(tenantId, {
      search: opts.search,
      start: skipDueDateWindow ? null : opts.start,
      endExclusive: skipDueDateWindow ? null : opts.endExclusive,
    }),
  ];
  if (parsedTag) {
    parts.push(
      parsedTag.kind === "orderAttention"
        ? orderAttentionListSupersetWhere()
        : listTagWhere(parsedTag),
    );
  }

  const rows = await db.order.findMany({
    where: { AND: parts },
    orderBy: [{ createdAt: "desc" }, { orderNumber: "desc" }],
    take: 500,
    select: financeOfficeOrderSelect,
  });

  const clientsPrisma = await getClientsPrisma();
  const pricingPrisma = await getPricingPrisma();
  const doctorIds = Array.from(new Set(rows.map((x) => x.doctorId)));
  const clinicIds = Array.from(new Set(rows.map((x) => x.clinicId).filter(Boolean))) as string[];
  const doctorIdsForPrivateRequisites = Array.from(
    new Set(rows.filter((x) => !x.clinicId).map((x) => x.doctorId)),
  );
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

  const [doctors, clinics, doctorsIpRequisites, constructionTypes, priceItems] =
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
                select: { ...requisiteClinicSelect, deletedAt: true },
              },
            },
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
      if (!ip || ip.deletedAt != null) return [d.id, null] as const;
      const { deletedAt: _del, ...req } = ip;
      return [d.id, formatCounterpartyRequisitesShortSummary(req)] as const;
    }),
  );
  const clinicById = new Map(
    clinics.map((x) => {
      const { legalFullName, inn, kpp, ogrn, bankName, bik, settlementAccount, correspondentAccount, ...pub } = x;
      return [
        x.id,
        {
          ...pub,
          legalFullName,
          counterpartyRequisitesText: formatCounterpartyRequisitesShortSummary({
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
  const constructionTypeById = new Map(constructionTypes.map((x) => [x.id, x]));
  const priceItemById = new Map(priceItems.map((x) => [x.id, x]));

  const mapped = rows.map((o): FinanceOfficeOrderRow => {
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
        ? {
            id: clinFull.id,
            name: clinFull.name,
            address: clinFull.address,
            legalFullName: clinFull.legalFullName,
          }
        : null,
      counterpartyRequisitesText,
      doctor: doctorById.get(o.doctorId) ?? { id: o.doctorId, fullName: "—" },
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
      listKaitenLabMentionHighlight: false,
    };
  });

  const exact =
    parsedTag?.kind === "orderAttention"
      ? mapped.filter((r) => r.listCompositionMismatch || r.listPendingChatCorrections)
      : mapped;

  const withMention = await hydrateOrderKaitenLabMentionHighlight(
    db,
    opts.userId,
    exact.map((r) => ({
      id: r.id,
      kaitenChatHasLabMention: r.kaitenChatHasLabMention,
      kaitenLabMentionSignalAt: r.kaitenLabMentionSignalAt,
    })),
  );
  const mentionById = new Map(
    withMention.map((r) => [r.id, r.listKaitenLabMentionHighlight]),
  );
  const withHighlight = exact.map((r) => ({
    ...r,
    listKaitenLabMentionHighlight: mentionById.get(r.id) ?? false,
  }));

  return withHighlight.sort((a, b) => {
    const pr = financePriority(a) - financePriority(b);
    if (pr !== 0) return pr;
    return (a.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER) -
      (b.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER);
  });
}
