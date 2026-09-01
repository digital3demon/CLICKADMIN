import type { Prisma, PrismaClient } from "@prisma/client";
import { getClientsPrisma, getPricingPrisma } from "@/lib/get-domain-prisma";
import {
  financeOfficeChipCountScopeWhere,
  financeOfficeChipDueWindowScopeWhere,
  financeOfficeScopeWhere,
  financeOfficeTagOverridesCalculated,
  type FinanceOfficeAppointmentFilter,
  type FinanceOfficeInvoiceIssuedFilter,
} from "@/lib/finance-office-list-scope";
import {
  compareOrdersByEffectiveFinanceRecord,
} from "@/lib/finance-office-list-filter";
import {
  parseFinanceOfficePageSize,
  sliceFinanceOfficePage,
} from "@/lib/finance-office-list-query";
import { parseOrdersListPage } from "@/lib/orders-list-query";
import { countOrdersWithPendingKaitenLabMentionForUser } from "@/lib/order-kaiten-lab-mention-count";
import { hydrateOrderKaitenLabMentionHighlight } from "@/lib/hydrate-order-kaiten-lab-mention-highlight";
import {
  hydrateListPendingChatCorrectionsFromInbox,
  orderIdsWithPendingMergedCorrections,
} from "@/lib/order-chat-corrections-read";
import {
  hydrateListPendingProstheticsFromInbox,
  orderIdsWithPendingMergedProsthetics,
} from "@/lib/order-prosthetics-requests-read";
import {
  formatCounterpartyRequisitesShortSummary,
} from "@/lib/format-counterparty-requisites-summary";
import {
  listTagWhere,
  orderAttentionListSupersetWhere,
  parseListTagParam,
} from "@/lib/order-list-tag-filter";
import { waitPaymentListTagWhere } from "@/lib/wait-payment-list-tag";
import { clinicDocChannel } from "@/lib/clinic-doc-channel";
import { orderInvoiceCompositionMismatch, uniqueAttentionOrderCount } from "@/lib/order-invoice-composition-mismatch";
import { overlayCrmStopColumnTitle } from "@/lib/kanban/crm-stop-column-overlay";
import { loadStoppedLinkedOrderIdSet } from "@/lib/kanban/load-stopped-linked-order-ids.server";

const financeOfficeOrderSelect = {
  id: true,
  orderNumber: true,
  patientName: true,
  createdAt: true,
  legalEntity: true,
  dueDate: true,
  appointmentDate: true,
  dueToAdminsAt: true,
  labWorkStatus: true,
  kaitenCardId: true,
  kaitenColumnTitle: true,
  kaitenTrackLane: true,
  demoKanbanColumn: true,
  kaitenCardType: { select: { name: true } },
  prostheticsOrdered: true,
  invoiceAttachmentId: true,
  invoiceIssued: true,
  invoiceIssuedAt: true,
  invoiceAttachment: { select: { createdAt: true } },
  invoiceNumber: true,
  invoicePrinted: true,
  updAttachmentId: true,
  updNumber: true,
  updPrinted: true,
  invoicePaperDocs: true,
  invoiceSentToEdo: true,
  invoiceEdoSigned: true,
  payment: true,
  paymentPartialRub: true,
  adminShippedOtpr: true,
  adminShippedAt: true,
  financeCalculated: true,
  kaitenBlocked: true,
  kaitenBlockReason: true,
  isUrgent: true,
  urgentCoefficient: true,
  compositionDiscountPercent: true,
  invoiceParsedTotalRub: true,
  invoiceMismatchAckFingerprint: true,
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
  "constructions" | "chatCorrections" | "prostheticsRequests" | "clinicId" | "doctorId" | "invoiceAttachment"
> & {
  clinic: {
    id: string;
    name: string;
    address: string | null;
    legalFullName: string | null;
    worksWithEdo: boolean;
  } | null;
  /** ЭДО клиники наряда или ИП-клиники врача; без клиники — false. */
  clinicWorksWithEdo: boolean;
  /** Бумажные доки клиники / ИП врача; без клиники — false. */
  clinicUsesPaperDocs: boolean;
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

/** Потолок индекса (id + ключи сортировки/фильтра), не полные ряды таблицы. */
export const FINANCE_OFFICE_INDEX_CAP = 3000;

export type FinanceOfficeOrdersPage = {
  orders: FinanceOfficeOrderRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  truncated: boolean;
};

export {
  financeOfficeListTagSkipsDueDateWindow,
  financeOfficeScopeWhere,
  financeOfficeChipCountScopeWhere,
  financeOfficeChipDueWindowScopeWhere,
  financeOfficeTagOverridesCalculated,
} from "@/lib/finance-office-list-scope";

async function countFinanceOfficeEdoChips(
  db: PrismaClient,
  scope: Prisma.OrderWhereInput,
): Promise<{ edoCount: number; noEdoCount: number; edoPaperCount: number }> {
  const [clinicGroups, doctorGroups] = await Promise.all([
    db.order.groupBy({
      by: ["clinicId"],
      where: { AND: [scope, { clinicId: { not: null } }] },
      _count: { _all: true },
    }),
    db.order.groupBy({
      by: ["doctorId"],
      where: { AND: [scope, { clinicId: null }] },
      _count: { _all: true },
    }),
  ]);

  if (clinicGroups.length === 0 && doctorGroups.length === 0) {
    return { edoCount: 0, noEdoCount: 0, edoPaperCount: 0 };
  }

  const clinicIds = clinicGroups
    .map((g) => g.clinicId)
    .filter((id): id is string => id != null);
  const doctorIds = doctorGroups.map((g) => g.doctorId);

  const clientsPrisma = await getClientsPrisma();
  const [clinics, doctorsIp] = await Promise.all([
    clinicIds.length
      ? clientsPrisma.clinic.findMany({
          where: { id: { in: clinicIds }, deletedAt: null },
          select: { id: true, worksWithEdo: true, usesPaperDocs: true },
        })
      : Promise.resolve([]),
    doctorIds.length
      ? clientsPrisma.doctor.findMany({
          where: { id: { in: doctorIds } },
          select: {
            id: true,
            ipClinicAsSource: {
              select: {
                worksWithEdo: true,
                usesPaperDocs: true,
                deletedAt: true,
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const clinicFlagsById = new Map(
    clinics.map((c) => [
      c.id,
      {
        edo: Boolean(c.worksWithEdo),
        paper: Boolean(c.usesPaperDocs),
      },
    ]),
  );
  const privateFlagsByDoctorId = new Map(
    doctorsIp.map((d) => {
      const ip = d.ipClinicAsSource;
      if (!ip || ip.deletedAt != null) {
        return [d.id, { edo: false, paper: false }] as const;
      }
      return [
        d.id,
        {
          edo: Boolean(ip.worksWithEdo),
          paper: Boolean(ip.usesPaperDocs),
        },
      ] as const;
    }),
  );

  let edoCount = 0;
  let noEdoCount = 0;
  let edoPaperCount = 0;
  const bump = (edo: boolean, paper: boolean, n: number) => {
    const ch = clinicDocChannel(edo, paper);
    if (ch === "edo") edoCount += n;
    else if (ch === "edoPaper") edoPaperCount += n;
    else noEdoCount += n;
  };
  for (const g of clinicGroups) {
    if (g.clinicId == null) continue;
    const flags = clinicFlagsById.get(g.clinicId);
    bump(flags?.edo ?? false, flags?.paper ?? false, g._count._all);
  }
  for (const g of doctorGroups) {
    const flags = privateFlagsByDoctorId.get(g.doctorId);
    bump(flags?.edo ?? false, flags?.paper ?? false, g._count._all);
  }
  return { edoCount, noEdoCount, edoPaperCount };
}

export async function countFinanceOfficeQuickFilterChips(
  db: PrismaClient,
  tenantId: string,
  opts: {
    search?: string | null;
    userId?: string;
    mode?: "all" | "actual" | "period" | null;
    fromYmd?: string | null;
    toYmd?: string | null;
    listTag?: string | null;
    appointment?: FinanceOfficeAppointmentFilter | null;
    invoiceIssued?: FinanceOfficeInvoiceIssuedFilter | null;
  } = {},
): Promise<{
  attentionCount: number;
  prostheticsPendingCount: number;
  financeNotCalculatedCount: number;
  financeCalculatedCount: number;
  edoCount: number;
  noEdoCount: number;
  edoPaperCount: number;
  labMentionCount: number;
  waitPaymentCount: number;
}> {
  // Просчитано/Не просчитано — по всему окну срока.
  // «Корректировки» — тоже по окну срока (включая просчитанные), иначе пилюля
  // меньше, чем в Заказах: второй наряд уже с галкой «просчитано» / со счётом.
  const scope = financeOfficeChipCountScopeWhere(tenantId, opts);
  const dueWindow = financeOfficeChipDueWindowScopeWhere(tenantId, opts);
  const inbox = (db as {
    orderChatInboxItem: {
      findMany: (args: unknown) => Promise<Array<{ orderId: string }>>;
    };
  }).orderChatInboxItem;

  const [
    legacyCorrPending,
    inboxCorrPending,
    legacyProsPending,
    inboxProsPending,
    financeNotCalculatedCount,
    financeCalculatedCount,
    edoCounts,
    labMentionCount,
    waitPaymentCount,
    invoiceTotalCandidates,
  ] = await Promise.all([
    db.orderChatCorrection.findMany({
      where: {
        resolvedAt: null,
        rejectedAt: null,
        order: dueWindow,
      },
      select: { orderId: true },
      distinct: ["orderId"],
    }),
    inbox.findMany({
      where: {
        type: "CORRECTION",
        resolvedAt: null,
        rejectedAt: null,
        order: dueWindow,
      },
      select: { orderId: true },
      distinct: ["orderId"],
    }),
    db.orderProstheticsRequest.findMany({
      where: {
        resolvedAt: null,
        rejectedAt: null,
        order: scope,
      },
      select: { orderId: true },
      distinct: ["orderId"],
    }),
    inbox.findMany({
      where: {
        type: "PROSTHETICS",
        resolvedAt: null,
        rejectedAt: null,
        order: scope,
      },
      select: { orderId: true },
      distinct: ["orderId"],
    }),
    db.order.count({
      where: { AND: [dueWindow, { financeCalculated: false }] },
    }),
    db.order.count({
      where: { AND: [dueWindow, { financeCalculated: true }] },
    }),
    countFinanceOfficeEdoChips(db, scope),
    countOrdersWithPendingKaitenLabMentionForUser(
      db,
      scope,
      opts.userId,
    ),
    db.order.count({
      where: { AND: [dueWindow, waitPaymentListTagWhere()] },
    }),
    db.order.findMany({
      where: { AND: [dueWindow, { invoiceParsedTotalRub: { not: null } }] },
      select: {
        id: true,
        invoiceParsedTotalRub: true,
        invoiceMismatchAckFingerprint: true,
        isUrgent: true,
        urgentCoefficient: true,
        compositionDiscountPercent: true,
        constructions: {
          select: {
            quantity: true,
            unitPrice: true,
            lineDiscountPercent: true,
          },
        },
      },
    }),
  ]);

  const corrCandidateIds = [
    ...new Set([
      ...legacyCorrPending.map((r) => r.orderId),
      ...inboxCorrPending.map((r) => r.orderId),
    ]),
  ];
  const prosCandidateIds = [
    ...new Set([
      ...legacyProsPending.map((r) => r.orderId),
      ...inboxProsPending.map((r) => r.orderId),
    ]),
  ];

  const [pendingCorrections, pendingProsthetics] = await Promise.all([
    orderIdsWithPendingMergedCorrections(db, corrCandidateIds),
    orderIdsWithPendingMergedProsthetics(db, prosCandidateIds),
  ]);

  const pendingProsList = [...pendingProsthetics];
  const prostheticsPendingCount =
    pendingProsList.length === 0
      ? 0
      : await db.order.count({
          where: {
            AND: [
              scope,
              { id: { in: pendingProsList } },
            ],
          },
        });

  const mismatchIds = invoiceTotalCandidates
    .filter((o) =>
      orderInvoiceCompositionMismatch({
        ...o,
        invoiceMismatchAckFingerprint: o.invoiceMismatchAckFingerprint,
      }),
    )
    .map((o) => o.id);

  return {
    attentionCount: uniqueAttentionOrderCount(pendingCorrections, mismatchIds),
    prostheticsPendingCount,
    financeNotCalculatedCount,
    financeCalculatedCount,
    edoCount: edoCounts.edoCount,
    noEdoCount: edoCounts.noEdoCount,
    edoPaperCount: edoCounts.edoPaperCount,
    labMentionCount,
    waitPaymentCount,
  };
}

function financePriority(row: {
  listPendingChatCorrections: boolean;
  listPendingProstheticsRequests: boolean;
  financeCalculated: boolean;
}): number {
  if (row.listPendingChatCorrections) return 0;
  if (row.listPendingProstheticsRequests) return 1;
  if (!row.financeCalculated) return 2;
  return 3;
}

const financeOfficeIndexPendingSelect = {
  where: { resolvedAt: null, rejectedAt: null },
  select: { id: true },
  take: 1,
} as const;

const financeOfficeIndexSelect = {
  id: true,
  orderNumber: true,
  dueDate: true,
  financeCalculated: true,
  clinicId: true,
  doctorId: true,
  invoiceParsedTotalRub: true,
  invoiceMismatchAckFingerprint: true,
  isUrgent: true,
  urgentCoefficient: true,
  compositionDiscountPercent: true,
  chatCorrections: financeOfficeIndexPendingSelect,
  prostheticsRequests: financeOfficeIndexPendingSelect,
  kaitenChatHasLabMention: true,
  kaitenLabMentionSignalAt: true,
} as const satisfies Prisma.OrderSelect;

const financeOfficeIndexAttentionSelect = {
  ...financeOfficeIndexSelect,
  constructions: {
    select: {
      quantity: true,
      unitPrice: true,
      lineDiscountPercent: true,
    },
  },
} as const satisfies Prisma.OrderSelect;

type FinanceOfficeIndexRow = {
  id: string;
  orderNumber: string;
  dueDate: Date | null;
  financeCalculated: boolean;
  clinicId: string | null;
  doctorId: string;
  invoiceParsedTotalRub: number | null;
  invoiceMismatchAckFingerprint: string | null;
  isUrgent: boolean;
  urgentCoefficient: number | null;
  compositionDiscountPercent: number | null;
  chatCorrections: { id: string }[];
  prostheticsRequests: { id: string }[];
  kaitenChatHasLabMention: boolean;
  kaitenLabMentionSignalAt: Date | null;
  constructions?: Array<{
    quantity: number;
    unitPrice: number | null;
    lineDiscountPercent: number;
  }>;
};

async function loadClinicDocFlagsForIndex(
  rows: Array<{ clinicId: string | null; doctorId: string }>,
): Promise<{
  clinicFlags: Map<string, { edo: boolean; paper: boolean }>;
  privateFlags: Map<string, { edo: boolean; paper: boolean }>;
}> {
  const clinicIds = Array.from(
    new Set(rows.map((r) => r.clinicId).filter((id): id is string => id != null)),
  );
  const doctorIds = Array.from(
    new Set(rows.filter((r) => !r.clinicId).map((r) => r.doctorId)),
  );
  if (clinicIds.length === 0 && doctorIds.length === 0) {
    return { clinicFlags: new Map(), privateFlags: new Map() };
  }
  const clientsPrisma = await getClientsPrisma();
  const [clinics, doctorsIp] = await Promise.all([
    clinicIds.length
      ? clientsPrisma.clinic.findMany({
          where: { id: { in: clinicIds }, deletedAt: null },
          select: { id: true, worksWithEdo: true, usesPaperDocs: true },
        })
      : Promise.resolve([]),
    doctorIds.length
      ? clientsPrisma.doctor.findMany({
          where: { id: { in: doctorIds } },
          select: {
            id: true,
            ipClinicAsSource: {
              select: {
                worksWithEdo: true,
                usesPaperDocs: true,
                deletedAt: true,
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);
  return {
    clinicFlags: new Map(
      clinics.map((c) => [
        c.id,
        { edo: Boolean(c.worksWithEdo), paper: Boolean(c.usesPaperDocs) },
      ]),
    ),
    privateFlags: new Map(
      doctorsIp.map((d) => {
        const ip = d.ipClinicAsSource;
        if (!ip || ip.deletedAt != null) {
          return [d.id, { edo: false, paper: false }] as const;
        }
        return [
          d.id,
          {
            edo: Boolean(ip.worksWithEdo),
            paper: Boolean(ip.usesPaperDocs),
          },
        ] as const;
      }),
    ),
  };
}

function sortFinanceOfficeIndex<
  T extends {
    listPendingChatCorrections: boolean;
    listPendingProstheticsRequests: boolean;
    financeCalculated: boolean;
    dueDate: Date | null;
    orderNumber: string;
    id: string;
  },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const pr = financePriority(a) - financePriority(b);
    if (pr !== 0) return pr;
    return compareOrdersByEffectiveFinanceRecord(a, b);
  });
}

async function rankFinanceOfficeIndexIds(
  db: PrismaClient,
  indexRows: FinanceOfficeIndexRow[],
  parsedTag: ReturnType<typeof parseListTagParam>,
  userId: string | null | undefined,
): Promise<string[]> {
  let working: Array<
    FinanceOfficeIndexRow & {
      listPendingChatCorrections: boolean;
      listPendingProstheticsRequests: boolean;
      listCompositionMismatch: boolean;
      clinicWorksWithEdo: boolean;
      clinicUsesPaperDocs: boolean;
      listKaitenLabMentionHighlight: boolean;
    }
  > = indexRows.map((r) => ({
    ...r,
    listPendingChatCorrections: (r.chatCorrections?.length ?? 0) > 0,
    listPendingProstheticsRequests: (r.prostheticsRequests?.length ?? 0) > 0,
    listCompositionMismatch: orderInvoiceCompositionMismatch({
      invoiceParsedTotalRub: r.invoiceParsedTotalRub,
      invoiceMismatchAckFingerprint: r.invoiceMismatchAckFingerprint,
      isUrgent: r.isUrgent,
      urgentCoefficient: r.urgentCoefficient,
      compositionDiscountPercent: r.compositionDiscountPercent,
      constructions: (r.constructions ?? []).map((c) => ({
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        lineDiscountPercent: c.lineDiscountPercent,
      })),
    }),
    clinicWorksWithEdo: false,
    clinicUsesPaperDocs: false,
    listKaitenLabMentionHighlight: false,
  }));

  const edoTag =
    parsedTag?.kind === "edo" ||
    parsedTag?.kind === "noEdo" ||
    parsedTag?.kind === "edoPaper";
  if (edoTag) {
    const flags = await loadClinicDocFlagsForIndex(working);
    working = working.filter((r) => {
      const f = r.clinicId
        ? flags.clinicFlags.get(r.clinicId)
        : flags.privateFlags.get(r.doctorId);
      const ch = clinicDocChannel(f?.edo ?? false, f?.paper ?? false);
      if (parsedTag.kind === "edo") return ch === "edo";
      if (parsedTag.kind === "edoPaper") return ch === "edoPaper";
      return ch === "paper";
    });
  }

  working = await hydrateListPendingProstheticsFromInbox(
    db,
    await hydrateListPendingChatCorrectionsFromInbox(db, working),
  );

  if (parsedTag?.kind === "kaitenLabMention") {
    const withMention = await hydrateOrderKaitenLabMentionHighlight(
      db,
      userId,
      working.map((r) => ({
        id: r.id,
        kaitenChatHasLabMention: r.kaitenChatHasLabMention,
        kaitenLabMentionSignalAt: r.kaitenLabMentionSignalAt,
      })),
    );
    const mentionById = new Map(
      withMention.map((r) => [r.id, r.listKaitenLabMentionHighlight]),
    );
    working = working.filter((r) => mentionById.get(r.id) === true);
  }

  if (parsedTag?.kind === "orderAttention") {
    working = working.filter(
      (r) => r.listCompositionMismatch || r.listPendingChatCorrections,
    );
  }

  return sortFinanceOfficeIndex(working).map((r) => r.id);
}

async function hydrateFinanceOfficeRawRows(
  db: PrismaClient,
  tenantId: string,
  userId: string | null | undefined,
  stageFiltered: FinanceOfficeRaw[],
): Promise<FinanceOfficeOrderRow[]> {
  const clientsPrisma = await getClientsPrisma();
  const pricingPrisma = await getPricingPrisma();
  const doctorIds = Array.from(new Set(stageFiltered.map((x) => x.doctorId)));
  const clinicIds = Array.from(
    new Set(stageFiltered.map((x) => x.clinicId).filter(Boolean)),
  ) as string[];
  const doctorIdsForPrivateRequisites = Array.from(
    new Set(stageFiltered.filter((x) => !x.clinicId).map((x) => x.doctorId)),
  );
  const constructionTypeIds = Array.from(
    new Set(
      stageFiltered.flatMap((x) => x.constructions.map((c) => c.constructionTypeId)).filter(Boolean),
    ),
  ) as string[];
  const priceListItemIds = Array.from(
    new Set(
      stageFiltered.flatMap((x) => x.constructions.map((c) => c.priceListItemId)).filter(Boolean),
    ),
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
    worksWithEdo: true,
    usesPaperDocs: true,
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
      return [
        d.id,
        {
          counterpartyRequisitesText: formatCounterpartyRequisitesShortSummary(req),
          worksWithEdo: Boolean(req.worksWithEdo),
          usesPaperDocs: Boolean(req.usesPaperDocs),
        },
      ] as const;
    }),
  );
  const clinicById = new Map(
    clinics.map((x) => {
      const {
        legalFullName,
        inn,
        kpp,
        ogrn,
        bankName,
        bik,
        settlementAccount,
        correspondentAccount,
        worksWithEdo,
        usesPaperDocs,
        ...pub
      } = x;
      return [
        x.id,
        {
          ...pub,
          legalFullName,
          worksWithEdo: Boolean(worksWithEdo),
          usesPaperDocs: Boolean(usesPaperDocs),
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

  const mapped = stageFiltered.map((o): FinanceOfficeOrderRow => {
    const {
      chatCorrections,
      prostheticsRequests,
      constructions,
      invoiceAttachment,
      ...rest
    } = o;
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
    const privateReq = !o.clinicId ? privateReqByDoctorId.get(o.doctorId) : undefined;
    const counterpartyRequisitesText =
      clinFull?.counterpartyRequisitesText ??
      privateReq?.counterpartyRequisitesText ??
      null;
    const clinicWorksWithEdo = clinFull
      ? clinFull.worksWithEdo
      : (privateReq?.worksWithEdo ?? false);
    const clinicUsesPaperDocs = clinFull
      ? clinFull.usesPaperDocs
      : (privateReq?.usesPaperDocs ?? false);
    return {
      ...rest,
      clinic: clinFull
        ? {
            id: clinFull.id,
            name: clinFull.name,
            address: clinFull.address,
            legalFullName: clinFull.legalFullName,
            worksWithEdo: clinFull.worksWithEdo,
          }
        : null,
      clinicWorksWithEdo,
      clinicUsesPaperDocs,
      counterpartyRequisitesText,
      doctor: doctorById.get(o.doctorId) ?? { id: o.doctorId, fullName: "—" },
      invoiceIssuedAt:
        rest.invoiceIssuedAt ??
        (rest.invoiceIssued ? (invoiceAttachment?.createdAt ?? null) : null),
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

  const withMention = await hydrateOrderKaitenLabMentionHighlight(
    db,
    userId,
    mapped.map((r) => ({
      id: r.id,
      kaitenChatHasLabMention: r.kaitenChatHasLabMention,
      kaitenLabMentionSignalAt: r.kaitenLabMentionSignalAt,
    })),
  );
  const mentionById = new Map(
    withMention.map((r) => [r.id, r.listKaitenLabMentionHighlight]),
  );
  const withHighlight = mapped.map((r) => ({
    ...r,
    listKaitenLabMentionHighlight: mentionById.get(r.id) ?? false,
  }));

  const withInbox = await hydrateListPendingProstheticsFromInbox(
    db,
    await hydrateListPendingChatCorrectionsFromInbox(db, withHighlight),
  );

  const stopped = await loadStoppedLinkedOrderIdSet(tenantId);
  return withInbox.map((r) => ({
    ...r,
    kaitenColumnTitle: overlayCrmStopColumnTitle(
      r.id,
      r.kaitenColumnTitle,
      stopped,
    ),
  }));
}

function emptyFinanceOfficePage(
  page: number,
  pageSize: number,
): FinanceOfficeOrdersPage {
  return {
    orders: [],
    totalCount: 0,
    page,
    pageSize,
    truncated: false,
  };
}

/**
 * Список ФинОтдела: индекс (до INDEX_CAP id + ключи сортировки) → срез страницы →
 * полная гидрация только этой страницы. Пилюли считают весь scope отдельно
 * (`countFinanceOfficeQuickFilterChips`). Выгрузка по `ids` — без пагинации.
 */
export async function fetchFinanceOfficeOrders(
  db: PrismaClient,
  tenantId: string,
  opts: {
    listTag?: string | null;
    search?: string | null;
    mode?: "all" | "actual" | "period";
    fromYmd?: string | null;
    toYmd?: string | null;
    userId?: string | null;
    appointment?: FinanceOfficeAppointmentFilter | null;
    invoiceIssued?: FinanceOfficeInvoiceIssuedFilter | null;
    /** Явный набор id (выгрузка выбранных) — без окна фильтра списка. */
    ids?: readonly string[] | null;
    page?: number | null;
    pageSize?: number | null;
  } = {},
): Promise<FinanceOfficeOrdersPage> {
  const selectedIds = [
    ...new Set((opts.ids ?? []).map((id) => id.trim()).filter(Boolean)),
  ].slice(0, 500);
  const parsedTag = opts.listTag?.trim() ? parseListTagParam(opts.listTag) : null;
  const mode = opts.mode ?? "all";
  const pageSize =
    selectedIds.length > 0
      ? selectedIds.length
      : parseFinanceOfficePageSize(
          opts.pageSize != null ? String(opts.pageSize) : null,
        );
  const requestedPage =
    selectedIds.length > 0 ? 1 : parseOrdersListPage(String(opts.page ?? 1));
  const tagOverridesCalculated = financeOfficeTagOverridesCalculated(opts.listTag);
  const parts: Prisma.OrderWhereInput[] =
    selectedIds.length > 0
      ? [{ tenantId, archivedAt: null }, { id: { in: selectedIds } }]
      : [
          financeOfficeScopeWhere(tenantId, {
            search: opts.search,
            mode,
            fromYmd: opts.fromYmd,
            toYmd: opts.toYmd,
            actualNotCalculatedOnly: !tagOverridesCalculated,
            appointment: opts.appointment,
            invoiceIssued: opts.invoiceIssued,
          }),
        ];
  if (selectedIds.length === 0 && parsedTag) {
    if (
      parsedTag.kind === "edo" ||
      parsedTag.kind === "noEdo" ||
      parsedTag.kind === "edoPaper"
    ) {
      // Точный отбор по каналу ЭДО/бумдоки (в т.ч. ИП врача) — после гидрации клиник.
    } else {
      parts.push(
        parsedTag.kind === "orderAttention"
          ? orderAttentionListSupersetWhere()
          : listTagWhere(parsedTag),
      );
    }
  }

  if (selectedIds.length > 0) {
    const raw = await db.order.findMany({
      where: { AND: parts },
      orderBy: [{ createdAt: "desc" }, { orderNumber: "desc" }],
      take: selectedIds.length,
      select: financeOfficeOrderSelect,
    });
    const hydrated = await hydrateFinanceOfficeRawRows(
      db,
      tenantId,
      opts.userId,
      raw,
    );
    const ordered = sortFinanceOfficeIndex(hydrated);
    return {
      orders: ordered,
      totalCount: ordered.length,
      page: 1,
      pageSize: ordered.length || pageSize,
      truncated: false,
    };
  }

  const needConstructions = parsedTag?.kind === "orderAttention";
  const indexRows = (await db.order.findMany({
    where: { AND: parts },
    orderBy: [{ createdAt: "desc" }, { orderNumber: "desc" }],
    take: FINANCE_OFFICE_INDEX_CAP,
    select: needConstructions
      ? financeOfficeIndexAttentionSelect
      : financeOfficeIndexSelect,
  })) as FinanceOfficeIndexRow[];
  const truncated = indexRows.length >= FINANCE_OFFICE_INDEX_CAP;
  const rankedIds = await rankFinanceOfficeIndexIds(
    db,
    indexRows,
    parsedTag,
    opts.userId,
  );
  const sliced = sliceFinanceOfficePage(rankedIds, requestedPage, pageSize);
  if (sliced.slice.length === 0) {
    return {
      ...emptyFinanceOfficePage(sliced.page, pageSize),
      totalCount: rankedIds.length,
      truncated,
    };
  }

  const pageRaw = await db.order.findMany({
    where: { id: { in: sliced.slice } },
    select: financeOfficeOrderSelect,
  });
  const hydrated = await hydrateFinanceOfficeRawRows(
    db,
    tenantId,
    opts.userId,
    pageRaw,
  );
  const byId = new Map(hydrated.map((r) => [r.id, r]));
  const orders = sliced.slice
    .map((id) => byId.get(id))
    .filter((r): r is FinanceOfficeOrderRow => r != null);
  return {
    orders,
    totalCount: rankedIds.length,
    page: sliced.page,
    pageSize,
    truncated,
  };
}
