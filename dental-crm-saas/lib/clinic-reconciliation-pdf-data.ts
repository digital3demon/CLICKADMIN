import type { ConstructionCategory, JawArch } from "@prisma/client";
import { getPrisma } from "@/lib/get-prisma";
import {
  formatConstructionDescription,
  lineAmountRub,
} from "@/lib/format-order-construction";
import { formatDateDdMmYyMsk } from "@/lib/clinic-reconciliation-pdf-format";
import { orderLinesIncludedInReconciliationExport } from "@/lib/order-reconciliation-export";
import { orderUrgentPriceMultiplier } from "@/lib/order-urgency";

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
  lineTotalRub: number;
  /** Нарастающий итог по наряду после этой строки */
  jobRunningTotalRub: number;
};

export type ClinicReconciliationPdfPayload = {
  labLegalName: string;
  clinicTitleLine: string;
  periodFromLabel: string;
  periodToLabel: string;
  summary: ReconciliationPdfSummaryLine[];
  yellowRow: {
    totalLineCount: number;
    grandTotalRub: number;
    /** В образце второе поле суммы — «р.0» */
    secondTotalRub: number;
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

export async function buildClinicReconciliationPdfPayload(
  clinicId: string,
  range: DateRangeUtc,
): Promise<ClinicReconciliationPdfPayload> {
  const labLegalName =
    process.env.RECONCILIATION_LAB_LEGAL_NAME?.trim() || "ООО «КЛИКЛаб»";

  const clinic = await (await getPrisma()).clinic.findUnique({
    where: { id: clinicId },
    select: {
      name: true,
      legalFullName: true,
      inn: true,
    },
  });
  if (!clinic) {
    throw new Error("Clinic not found");
  }

  /** Жёлтая строка: как в Excel-образце — «ООО … ИНН …». */
  const legal = clinic.legalFullName?.trim() || clinic.name.trim() || "—";
  const inn = clinic.inn?.trim();
  const clinicTitleLine = inn ? `${legal} ИНН ${inn}` : legal;

  const periodFromLabel = formatDateDdMmYyMsk(range.from);
  const periodToLabel = formatDateDdMmYyMsk(range.to);

  const rows = await (await getPrisma()).orderConstruction.findMany({
    where: {
      order: {
        clinicId,
        createdAt: { gte: range.from, lte: range.to },
      },
    },
    orderBy: [{ order: { createdAt: "asc" } }, { sortOrder: "asc" }],
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          createdAt: true,
          patientName: true,
          dueDate: true,
          updatedAt: true,
          adminShippedOtpr: true,
          isUrgent: true,
          urgentCoefficient: true,
          excludeFromReconciliation: true,
          excludeFromReconciliationUntil: true,
          doctor: { select: { fullName: true } },
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

  /** Ключ: одна строка сводки = подпись + «цена за ед.» (разные цены — разные строки). */
  const summaryMap = new Map<
    string,
    { label: string; quantity: number; totalRub: number }
  >();

  function addSummary(
    label: string,
    quantity: number,
    lineTotalRub: number,
    unitPriceKey: string,
  ) {
    const key = `${label}\u0001${unitPriceKey}`;
    const prev = summaryMap.get(key);
    if (prev) {
      prev.quantity += quantity;
      prev.totalRub += lineTotalRub;
    } else {
      summaryMap.set(key, { label, quantity, totalRub: lineTotalRub });
    }
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
            item: { select: { id: true, name: true } },
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
    const cost = m.totalCostRub != null && Number.isFinite(m.totalCostRub) ? m.totalCostRub : 0;
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

  for (const l of includedRows) {
    const q = l.quantity > 0 ? l.quantity : 1;
    const mult = orderUrgentPriceMultiplier(
      l.order.isUrgent,
      l.order.urgentCoefficient,
    );
    const lineTotal =
      Math.round(lineAmountRub(q, l.unitPrice) * mult * 100) / 100;
    const label = pdfConstructionLabel({
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
    const unitKey =
      l.unitPrice != null && Number.isFinite(l.unitPrice)
        ? String(Math.round(l.unitPrice * 100) / 100)
        : "null";
    addSummary(label, q, lineTotal, unitKey);
  }

  for (const [, plist] of prostheticByOrder) {
    for (const p of plist) {
      const unit =
        p.qty > 0 ? Math.round((p.totalRub / p.qty) * 100) / 100 : 0;
      addSummary(
        p.name,
        p.qty,
        Math.round(p.totalRub * 100) / 100,
        `stock:${p.itemId}:${unit}`,
      );
    }
  }

  const summaryList: ReconciliationPdfSummaryLine[] = [];
  for (const v of summaryMap.values()) {
    const qty = v.quantity;
    const totalRub = Math.round(v.totalRub * 100) / 100;
    const unitRub =
      qty > 0 ? Math.round((totalRub / qty) * 100) / 100 : totalRub;
    summaryList.push({ label: v.label, quantity: qty, unitRub, totalRub });
  }
  summaryList.sort((a, b) => a.label.localeCompare(b.label, "ru"));

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
      patientName: true,
      dueDate: true,
      updatedAt: true,
      adminShippedOtpr: true,
      isUrgent: true,
      urgentCoefficient: true,
      doctor: { select: { fullName: true } },
    },
  });

  const detail: ReconciliationPdfDetailLine[] = [];

  for (const ord of ordersOrdered) {
    const oid = ord.id;
    const list = byOrder.get(oid) ?? [];
    if (!list.length && !(prostheticByOrder.get(oid)?.length)) continue;
    const ord0 = list[0]?.order ?? ord;
    const zashla = formatDateDdMmYyMsk(ord0.createdAt);
    let otpr = "—";
    if (ord0.adminShippedOtpr) {
      const shipDate = ord0.dueDate ?? ord0.updatedAt;
      otpr = formatDateDdMmYyMsk(shipDate);
    }
    const patient = ord0.patientName?.trim() || "—";
    const doctor = ord0.doctor.fullName.trim();
    const orderNumber = ord0.orderNumber;
    let running = 0;
    let first = true;

    for (const l of list) {
      const q = l.quantity > 0 ? l.quantity : 1;
      const mult = orderUrgentPriceMultiplier(
        l.order.isUrgent,
        l.order.urgentCoefficient,
      );
      const lineTotal =
        Math.round(lineAmountRub(q, l.unitPrice) * mult * 100) / 100;
      running = Math.round((running + lineTotal) * 100) / 100;
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
        unitRub: l.unitPrice,
        lineTotalRub: lineTotal,
        jobRunningTotalRub: running,
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
      running = Math.round((running + lineTotal) * 100) / 100;
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
        lineTotalRub: lineTotal,
        jobRunningTotalRub: running,
      });
      first = false;
    }
  }

  let grandTotal = 0;
  for (const l of includedRows) {
    const q = l.quantity > 0 ? l.quantity : 1;
    const mult = orderUrgentPriceMultiplier(
      l.order.isUrgent,
      l.order.urgentCoefficient,
    );
    grandTotal += lineAmountRub(q, l.unitPrice) * mult;
  }
  for (const [, plist] of prostheticByOrder) {
    for (const p of plist) {
      grandTotal += p.totalRub;
    }
  }
  grandTotal = Math.round(grandTotal * 100) / 100;

  return {
    labLegalName,
    clinicTitleLine,
    periodFromLabel,
    periodToLabel,
    summary: summaryList,
    yellowRow: {
      totalLineCount: detail.length,
      grandTotalRub: grandTotal,
      secondTotalRub: 0,
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
