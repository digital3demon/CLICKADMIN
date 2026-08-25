import type { Prisma, PrismaClient } from "@prisma/client";
import { getClientsPrisma, getPricingPrisma } from "@/lib/get-domain-prisma";
import {
  financeOfficeChipCountScopeWhere,
  financeOfficeChipDueWindowScopeWhere,
  financeOfficeScopeWhere,
  financeOfficeTagOverridesCalculated,
} from "@/lib/finance-office-list-scope";
import {
  compareOrdersByEffectiveFinanceRecord,
} from "@/lib/finance-office-list-filter";
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
import { clinicDocChannel } from "@/lib/clinic-doc-channel";
import { orderInvoiceCompositionMismatch, uniqueAttentionOrderCount } from "@/lib/order-invoice-composition-mismatch";

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
  invoiceNumber: true,
  invoicePrinted: true,
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
  "constructions" | "chatCorrections" | "prostheticsRequests" | "clinicId" | "doctorId"
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
    mode?: "actual" | "period" | null;
    fromYmd?: string | null;
    toYmd?: string | null;
    listTag?: string | null;
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
              { prostheticsOrdered: false },
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
  };
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
    mode?: "actual" | "period";
    fromYmd?: string | null;
    toYmd?: string | null;
    userId?: string | null;
  } = {},
): Promise<FinanceOfficeOrderRow[]> {
  const parsedTag = opts.listTag?.trim() ? parseListTagParam(opts.listTag) : null;
  const mode = opts.mode ?? "actual";
  const tagOverridesCalculated = financeOfficeTagOverridesCalculated(opts.listTag);
  const parts: Prisma.OrderWhereInput[] = [
    financeOfficeScopeWhere(tenantId, {
      search: opts.search,
      mode,
      fromYmd: opts.fromYmd,
      toYmd: opts.toYmd,
      actualNotCalculatedOnly: !tagOverridesCalculated,
    }),
  ];
  if (parsedTag) {
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

  const stageFiltered = await db.order.findMany({
    where: { AND: parts },
    orderBy: [{ createdAt: "desc" }, { orderNumber: "desc" }],
    take: 500,
    select: financeOfficeOrderSelect,
  });

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

  const exact =
    parsedTag?.kind === "edo" ||
    parsedTag?.kind === "noEdo" ||
    parsedTag?.kind === "edoPaper"
      ? mapped.filter((r) => {
          const ch = clinicDocChannel(
            r.clinicWorksWithEdo,
            r.clinicUsesPaperDocs,
          );
          if (parsedTag.kind === "edo") return ch === "edo";
          if (parsedTag.kind === "edoPaper") return ch === "edoPaper";
          return ch === "paper";
        })
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

  const withInbox = await hydrateListPendingProstheticsFromInbox(
    db,
    await hydrateListPendingChatCorrectionsFromInbox(db, withHighlight),
  );

  const filtered =
    parsedTag?.kind === "orderAttention"
      ? withInbox.filter(
          (r) => r.listCompositionMismatch || r.listPendingChatCorrections,
        )
      : parsedTag?.kind === "kaitenLabMention"
        ? withInbox.filter((r) => r.listKaitenLabMentionHighlight)
        : withInbox;

  return filtered.sort((a, b) => {
    const pr = financePriority(a) - financePriority(b);
    if (pr !== 0) return pr;
    return compareOrdersByEffectiveFinanceRecord(a, b);
  });
}
