import type { ConstructionCategory, JawArch } from "@prisma/client";
import { getPrisma } from "@/lib/get-prisma";
import {
  formatConstructionDescription,
  lineAllocatedTotalRub,
} from "@/lib/format-order-construction";
import { formatDateDdMmYyMsk } from "@/lib/clinic-reconciliation-pdf-format";
import { cleanLegalFullName } from "@/lib/document-workflow-markers";
import { orderLinesIncludedInReconciliationExport } from "@/lib/order-reconciliation-export";
import { orderUrgentPriceMultiplier } from "@/lib/order-urgency";
import { orderWhereReconciliationPeriod } from "@/lib/clinic-reconciliation-period";
import { loadOrderSentAtByIds } from "@/lib/clinic-finance";
import { prostheticWorkTotalRub } from "@/lib/inventory/sale-unit-price";
import {
  aggregateReconciliationSummaryWithoutDiscount,
  defaultReconciliationLabLegalName,
  modeNonEmptyLabel,
  reconciliationVatIncluded5,
} from "@/lib/clinic-reconciliation-math";

export type ReconciliationPdfSummaryLine = {
  label: string;
  quantity: number;
  unitRub: number;
  totalRub: number;
};

export type ReconciliationPdfDetailLine = {
  /** Первая строка группы наряда — показываем даты, номер, пациента, врача */
  showOrderColumns: boolean;
  zashla: string;
  otpr: string;
  orderNumber: string;
  patient: string;
  doctor: string;
  description: string;
  quantity: number;
  /** Цена за ед. (как в наряде); null — «—» */
  unitRub: number | null;
  /** Стоимость без скидки (цена * кол-во, с учетом срочности). */
  baseTotalRub: number;
  lineTotalRub: number;
  /** Скидка в %; если нет — null (пустая ячейка). */
  discountPercent: number | null;
};

export type ClinicReconciliationPdfPayload = {
  labLegalName: string;
  clinicTitleLine: string;
  periodFromLabel: string;
  periodToLabel: string;
  summary: ReconciliationPdfSummaryLine[];
  yellowRow: {
    /** Суммарное кол-во единиц по строкам детализации. */
    totalUnits: number;
    totalLineCount: number;
    /** Итого до скидок. */
    baseTotalRub: number;
    /** Итого с учётом скидок (= всего к оплате). */
    discountedTotalRub: number;
    /** НДС 5% внутри цены. */
    vatRub: number;
  };
  detail: ReconciliationPdfDetailLine[];
};

function pdfConstructionLabel(input: {
  category: ConstructionCategory;
  constructionType: { name: string } | null;
  priceListItem: { code: string; name: string } | null;
  material: { name: string } | null;
  shade: string | null;
  teethFdi: unknown;
  bridgeFromFdi: string | null;
  bridgeToFdi: string | null;
  arch: JawArch | null;
}): string {
  if (input.category === "PRICE_LIST" && input.priceListItem) {
    const code = input.priceListItem.code?.trim();
    const name = input.priceListItem.name?.trim() || "Позиция прайса";
    return code ? `${code} ${name}` : name;
  }
  return formatConstructionDescription({
    category: input.category,
    constructionType: input.constructionType,
    priceListItem: input.priceListItem,
    material: input.material,
    shade: input.shade,
    teethFdi: input.teethFdi,
    bridgeFromFdi: input.bridgeFromFdi,
    bridgeToFdi: input.bridgeToFdi,
    arch: input.arch,
  }).replace(/\s*·\s*/g, " ");
}

type DateRangeUtc = { from: Date; to: Date };

/**
 * Общий payload сверки (PDF + Excel по шаблону).
 */
export async function buildClinicReconciliationPdfPayload(
  clinicId: string | string[],
  range: DateRangeUtc,
  selectedOrderIds?: string[] | null,
): Promise<ClinicReconciliationPdfPayload> {
  const clinicIds = (Array.isArray(clinicId) ? clinicId : [clinicId])
    .map((x) => String(x || "").trim())
    .filter(Boolean);
  if (clinicIds.length === 0) {
    throw new Error("Clinic not found");
  }

  const clinics = await (await getPrisma()).clinic.findMany({
    where: { id: { in: clinicIds } },
    select: {
      id: true,
      name: true,
      legalFullName: true,
      inn: true,
    },
  });
  if (clinics.length === 0) {
    throw new Error("Clinic not found");
  }

  const primary =
    clinics.find((c) => c.inn?.trim()) ?? clinics[0]!;
  const legal =
    cleanLegalFullName(primary.legalFullName) || primary.name.trim() || "—";
  const inn = primary.inn?.trim();
  const extraNames = clinics
    .map((c) => c.name.trim())
    .filter((n) => n && n !== legal);
  const clinicDisplay =
    extraNames.length > 1
      ? `${legal} (${extraNames.join(", ")})`
      : extraNames.length === 1 && extraNames[0] !== legal
        ? `${legal} (${extraNames[0]})`
        : legal;
  const clinicTitleLine = inn ? `${clinicDisplay} ИНН ${inn}` : clinicDisplay;

  const periodFromLabel = formatDateDdMmYyMsk(range.from);
  const periodToLabel = formatDateDdMmYyMsk(range.to);

  const selected = new Set(
    (selectedOrderIds ?? [])
      .map((x) => String(x || "").trim())
      .filter(Boolean),
  );
  const selectedList = [...selected];

  const rows = await (await getPrisma()).orderConstruction.findMany({
    where: {
      ...(selectedList.length > 0 ? { orderId: { in: selectedList } } : {}),
      order: {
        clinicId: clinicIds.length === 1 ? clinicIds[0] : { in: clinicIds },
        ...orderWhereReconciliationPeriod(range),
      },
    },
    orderBy: [{ order: { createdAt: "asc" } }, { sortOrder: "asc" }],
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          workReceivedAt: true,
          patientName: true,
          updatedAt: true,
          adminShippedOtpr: true,
          legalEntity: true,
          isUrgent: true,
          urgentCoefficient: true,
          compositionDiscountPercent: true,
          excludeFromReconciliation: true,
          excludeFromReconciliationUntil: true,
          doctor: { select: { fullName: true } },
          constructions: {
            select: {
              quantity: true,
              unitPrice: true,
              lineDiscountPercent: true,
            },
          },
        },
      },
      constructionType: { select: { name: true } },
      priceListItem: { select: { code: true, name: true } },
      material: { select: { name: true } },
    },
  });

  type RowIn = (typeof rows)[number];

  const includedRows: RowIn[] = [];
  for (const l of rows) {
    const inc = orderLinesIncludedInReconciliationExport(
      l.order.excludeFromReconciliation,
      l.order.excludeFromReconciliationUntil,
      range.to,
    );
    if (inc) includedRows.push(l);
  }

  const orderIds = [...new Set(includedRows.map((r) => r.orderId))];

  const stockRows =
    orderIds.length === 0
      ? []
      : await (await getPrisma()).stockMovement.findMany({
          where: {
            orderId: { in: orderIds },
            kind: "SALE_ISSUE",
          },
          select: {
            orderId: true,
            quantity: true,
            totalCostRub: true,
            item: { select: { id: true, name: true, saleUnitPriceRub: true } },
          },
        });

  const prostheticByOrder = new Map<
    string,
    { itemId: string; name: string; qty: number; totalRub: number }[]
  >();
  for (const m of stockRows) {
    const oid = m.orderId;
    if (!oid) continue;
    const name = m.item.name.trim() || "Позиция склада";
    const qty = m.quantity;
    const cost = prostheticWorkTotalRub({
      quantity: qty,
      saleUnitPriceRub: m.item.saleUnitPriceRub,
      fallbackTotalRub: m.totalCostRub,
    });
    const list = prostheticByOrder.get(oid) ?? [];
    const existing = list.find((x) => x.itemId === m.item.id);
    if (existing) {
      existing.qty += qty;
      existing.totalRub += cost;
    } else {
      list.push({
        itemId: m.item.id,
        name,
        qty,
        totalRub: cost,
      });
    }
    prostheticByOrder.set(oid, list);
  }

  const byOrder = new Map<string, RowIn[]>();
  for (const l of includedRows) {
    const arr = byOrder.get(l.orderId) ?? [];
    arr.push(l);
    byOrder.set(l.orderId, arr);
  }

  const allOrderIds = new Set<string>([
    ...orderIds,
    ...prostheticByOrder.keys(),
  ]);

  const ordersOrdered = await (await getPrisma()).order.findMany({
    where: { id: { in: [...allOrderIds] } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      workReceivedAt: true,
      patientName: true,
      updatedAt: true,
      adminShippedOtpr: true,
      legalEntity: true,
      isUrgent: true,
      urgentCoefficient: true,
      doctor: { select: { fullName: true } },
    },
  });

  const sentAtById = await loadOrderSentAtByIds([...allOrderIds]);

  const labLegalName =
    modeNonEmptyLabel(ordersOrdered.map((o) => o.legalEntity)) ??
    defaultReconciliationLabLegalName();

  const detail: ReconciliationPdfDetailLine[] = [];

  for (const ord of ordersOrdered) {
    const oid = ord.id;
    const list = byOrder.get(oid) ?? [];
    if (!list.length && !(prostheticByOrder.get(oid)?.length)) continue;
    const ord0 = list[0]?.order ?? ord;
    const zashla = formatDateDdMmYyMsk(
      ord0.workReceivedAt ?? ord0.createdAt,
    );
    const sentAt = sentAtById.get(oid) ?? null;
    const otpr = sentAt ? formatDateDdMmYyMsk(sentAt) : "—";
    const patient = ord0.patientName?.trim() || "—";
    const doctor = ord0.doctor.fullName.trim();
    const orderNumber = ord0.orderNumber;
    let first = true;

    for (const l of list) {
      const q = l.quantity > 0 ? l.quantity : 1;
      const mult = orderUrgentPriceMultiplier(
        l.order.isUrgent,
        l.order.urgentCoefficient,
      );
      const compLines = l.order.constructions.map((c) => ({
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        lineDiscountPercent: c.lineDiscountPercent,
      }));
      const lineTotal = lineAllocatedTotalRub(
        {
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineDiscountPercent: l.lineDiscountPercent,
        },
        compLines,
        l.order.compositionDiscountPercent,
        mult,
      );
      const unitRub = l.unitPrice;
      const baseTotalRub =
        unitRub != null && Number.isFinite(unitRub)
          ? Math.round(q * unitRub * mult * 100) / 100
          : 0;
      const discountPercent =
        baseTotalRub > 0 && lineTotal < baseTotalRub
          ? Math.round((1 - lineTotal / baseTotalRub) * 10000) / 100
          : null;
      const desc = pdfConstructionLabel({
        category: l.category,
        constructionType: l.constructionType,
        priceListItem: l.priceListItem,
        material: l.material,
        shade: l.shade,
        teethFdi: l.teethFdi,
        bridgeFromFdi: l.bridgeFromFdi,
        bridgeToFdi: l.bridgeToFdi,
        arch: l.arch,
      });
      detail.push({
        showOrderColumns: first,
        zashla,
        otpr,
        orderNumber,
        patient,
        doctor,
        description: desc,
        quantity: q,
        unitRub,
        baseTotalRub,
        lineTotalRub: lineTotal,
        discountPercent,
      });
      first = false;
    }

    const prost = (prostheticByOrder.get(oid) ?? []).slice().sort((a, b) =>
      a.name.localeCompare(b.name, "ru"),
    );
    for (const p of prost) {
      const lineTotal = Math.round(p.totalRub * 100) / 100;
      const unitRub =
        p.qty > 0 ? Math.round((lineTotal / p.qty) * 100) / 100 : 0;
      detail.push({
        showOrderColumns: first,
        zashla,
        otpr,
        orderNumber,
        patient,
        doctor,
        description: p.name,
        quantity: Math.round(p.qty * 100) / 100,
        unitRub,
        baseTotalRub: lineTotal,
        lineTotalRub: lineTotal,
        discountPercent: null,
      });
      first = false;
    }
  }

  const summaryList = aggregateReconciliationSummaryWithoutDiscount(
    detail.map((d) => ({
      label: d.description,
      quantity: d.quantity,
      unitRub: d.unitRub,
      baseTotalRub: d.baseTotalRub,
    })),
  );

  const discountedTotal =
    Math.round(
      detail.reduce((acc, line) => acc + line.lineTotalRub, 0) * 100,
    ) / 100;
  const baseTotal =
    Math.round(
      detail.reduce((acc, line) => acc + line.baseTotalRub, 0) * 100,
    ) / 100;
  const totalUnits =
    Math.round(detail.reduce((acc, line) => acc + line.quantity, 0) * 100) /
    100;
  const vatRub = reconciliationVatIncluded5(discountedTotal);

  return {
    labLegalName,
    clinicTitleLine,
    periodFromLabel,
    periodToLabel,
    summary: summaryList,
    yellowRow: {
      totalUnits,
      totalLineCount: detail.length,
      baseTotalRub: baseTotal,
      discountedTotalRub: discountedTotal,
      vatRub,
    },
    detail,
  };
}

/** Для заголовка Content-Disposition */
export function reconciliationPdfFileNameBase(
  clinicName: string,
  fromStr: string,
  toStr: string,
): string {
  const short = clinicName.slice(0, 60).trim() || "clinic";
  return `Сверка_${short}_${fromStr}_${toStr}`;
}
