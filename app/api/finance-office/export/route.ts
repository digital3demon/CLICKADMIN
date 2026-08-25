import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { fetchFinanceOfficeOrders, type FinanceOfficeOrderRow } from "@/lib/fetch-finance-office-orders";
import { cleanLegalFullName } from "@/lib/format-counterparty-requisites-summary";
import { isReconciliationPaymentStatus } from "@/lib/order-clinic-client-fields";
import { parseFinanceOfficeMode } from "@/lib/finance-office-list-filter";
import { parseFinanceOfficeInvoiceIssuedParams } from "@/lib/finance-office-list-query";
import { parseOrdersShipmentParams } from "@/lib/orders-shipment-list-query";
import {
  parseYmdOrNull,
} from "@/lib/shipments-date-range";
import { parseListTagParam } from "@/lib/order-list-tag-filter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_RANGE_DAYS = 366;

function rangeDaySpan(fromYmd: string, toYmd: string): number {
  const [y1, m1, d1] = fromYmd.split("-").map(Number);
  const [y2, m2, d2] = toYmd.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / (24 * 60 * 60 * 1000));
}

function parseTab(raw: string | null): "actual" | "period" {
  return parseFinanceOfficeMode(raw);
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function lineBaseTotal(row: FinanceOfficeOrderRow["constructions"][number]): number {
  const qty = Number.isFinite(row.quantity) ? row.quantity : 0;
  const unit = row.unitPrice ?? 0;
  return qty * unit;
}

function lineDiscountedTotal(row: FinanceOfficeOrderRow["constructions"][number]): number {
  const pct = Number.isFinite(row.lineDiscountPercent) ? row.lineDiscountPercent : 0;
  return lineBaseTotal(row) * (1 - Math.max(0, Math.min(100, pct)) / 100);
}

function orderTotals(order: FinanceOfficeOrderRow): {
  total: number;
  discountLabel: string;
  discountedTotal: number;
} {
  const total = order.constructions.reduce((sum, row) => sum + lineBaseTotal(row), 0);
  const afterLineDiscounts = order.constructions.reduce((sum, row) => sum + lineDiscountedTotal(row), 0);
  const orderDiscountPct = Math.max(
    0,
    Math.min(100, Number.isFinite(order.compositionDiscountPercent) ? order.compositionDiscountPercent : 0),
  );
  const discountedTotal = afterLineDiscounts * (1 - orderDiscountPct / 100);
  const parts: string[] = [];
  const lineDiscounts = order.constructions
    .map((row) => Number(row.lineDiscountPercent) || 0)
    .filter((pct) => pct > 0);
  if (lineDiscounts.length > 0) {
    const uniq = Array.from(new Set(lineDiscounts.map((pct) => `${money(pct)}%`)));
    parts.push(`позиции: ${uniq.join(", ")}`);
  }
  if (orderDiscountPct > 0) parts.push(`общая: ${money(orderDiscountPct)}%`);
  const discountRub = total - discountedTotal;
  if (discountRub > 0) parts.push(`-${money(discountRub)} ₽`);
  return {
    total: money(total),
    discountLabel: parts.join("; "),
    discountedTotal: money(discountedTotal),
  };
}

function constructionLabel(row: FinanceOfficeOrderRow["constructions"][number]): string {
  const code = row.priceListItem?.code?.trim();
  const name =
    row.priceListItem?.name?.trim() ||
    row.constructionType?.name?.trim() ||
    "Позиция состава";
  return code ? `${code} - ${name}` : name;
}

function orderLegalName(order: FinanceOfficeOrderRow): string {
  return (
    cleanLegalFullName(order.clinic?.legalFullName) ||
    order.counterpartyRequisitesText?.trim() ||
    cleanLegalFullName(order.legalEntity) ||
    ""
  );
}

function lineDiscountLabel(
  order: FinanceOfficeOrderRow,
  row: FinanceOfficeOrderRow["constructions"][number],
): string {
  const parts: string[] = [];
  const linePct = Number(row.lineDiscountPercent) || 0;
  const orderPct = Number(order.compositionDiscountPercent) || 0;
  if (linePct > 0) parts.push(`${money(linePct)}%`);
  if (orderPct > 0) parts.push(`общая ${money(orderPct)}%`);
  return parts.join("; ");
}

function isPrivatePersonWithoutDoctorRequisites(order: FinanceOfficeOrderRow): boolean {
  return !order.clinic && !order.counterpartyRequisitesText?.trim();
}

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  const tenantId = session ? await getTenantIdForSession(session) : null;
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const mode = parseTab(sp.get("tab"));
  const fromRaw = parseYmdOrNull(sp.get("from"));
  const toRaw = parseYmdOrNull(sp.get("to"));
  const rawTag = sp.get("tag")?.trim() || null;
  const parsedTag = rawTag ? parseListTagParam(rawTag) : null;
  const q = sp.get("q")?.trim() || "";
  const shipParsed = parseOrdersShipmentParams({
    ship: sp.get("ship"),
    shipFrom: sp.get("shipFrom"),
    shipTo: sp.get("shipTo"),
  });
  const appointment =
    shipParsed.mode && !shipParsed.periodError
      ? {
          mode: shipParsed.mode,
          shipFrom: shipParsed.shipFrom,
          shipTo: shipParsed.shipTo,
        }
      : null;
  const invParsed = parseFinanceOfficeInvoiceIssuedParams({
    invFrom: sp.get("invFrom"),
    invTo: sp.get("invTo"),
  });
  const invoiceIssued =
    invParsed.toYmd && !invParsed.error
      ? { fromYmd: invParsed.fromYmd, toYmd: invParsed.toYmd }
      : null;

  if (invParsed.error) {
    return NextResponse.json({ error: invParsed.error }, { status: 400 });
  }
  if (!invoiceIssued && shipParsed.periodError) {
    return NextResponse.json({ error: shipParsed.periodError }, { status: 400 });
  }

  let periodLabel = "";
  if (invoiceIssued) {
    if (
      invoiceIssued.fromYmd &&
      rangeDaySpan(invoiceIssued.fromYmd, invoiceIssued.toYmd) > MAX_RANGE_DAYS
    ) {
      return NextResponse.json(
        { error: `Максимальный период — ${MAX_RANGE_DAYS} дней` },
        { status: 400 },
      );
    }
    periodLabel = invoiceIssued.fromYmd
      ? `schet_${invoiceIssued.fromYmd}_${invoiceIssued.toYmd}`
      : `schet_to_${invoiceIssued.toYmd}`;
  } else if (appointment) {
    periodLabel = `zapis_${appointment.mode}`;
  } else if (mode === "actual") {
    periodLabel = "actual";
  } else {
    if (!toRaw) {
      return NextResponse.json({ error: "Для периода укажите to (from необязателен)" }, { status: 400 });
    }
    if (fromRaw && fromRaw > toRaw) {
      return NextResponse.json({ error: "Дата «с» не может быть позже даты «по»" }, { status: 400 });
    }
    if (fromRaw && rangeDaySpan(fromRaw, toRaw) > MAX_RANGE_DAYS) {
      return NextResponse.json({ error: `Максимальный период — ${MAX_RANGE_DAYS} дней` }, { status: 400 });
    }
    periodLabel = fromRaw ? `${fromRaw}_${toRaw}` : `to_${toRaw}`;
  }

  const orders = (await fetchFinanceOfficeOrders(await getOrdersPrisma(), tenantId, {
    listTag: parsedTag ? rawTag : null,
    search: q,
    mode,
    fromYmd:
      invoiceIssued || appointment ? null : mode === "period" ? fromRaw : null,
    toYmd:
      invoiceIssued || appointment ? null : mode === "period" ? toRaw : null,
    appointment: invoiceIssued ? null : appointment,
    invoiceIssued,
  })).filter(
    (order) =>
      !isReconciliationPaymentStatus(order.payment) &&
      !isPrivatePersonWithoutDoctorRequisites(order),
  );

  const wb = new ExcelJS.Workbook();
  wb.creator = "dental-lab-crm";
  wb.created = new Date();
  const ws = wb.addWorksheet("ФинОтдел");
  ws.columns = [
    { header: "Номер наряда", key: "orderNumber", width: 14 },
    { header: "ООО клиники", key: "clinicLegalName", width: 34 },
    { header: "Клиника", key: "clinic", width: 28 },
    { header: "Доктор", key: "doctor", width: 24 },
    { header: "Пациент", key: "patient", width: 24 },
    { header: "Состав заказа", key: "construction", width: 56 },
    { header: "Количество", key: "quantity", width: 12 },
    { header: "Стоимость", key: "unitPrice", width: 14 },
    { header: "Сумма", key: "lineTotal", width: 14 },
    { header: "Скидка", key: "discount", width: 18 },
    { header: "Сумма со скидкой", key: "discountedTotal", width: 18 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  for (const order of orders) {
    const totals = orderTotals(order);
    const constructions =
      order.constructions.length > 0
        ? order.constructions
        : [null];
    constructions.forEach((construction, index) => {
      const isFirstOrderLine = index === 0;
      const quantity = construction && Number.isFinite(construction.quantity)
        ? construction.quantity
        : null;
      const unitPrice = construction?.unitPrice ?? null;
      const lineTotal = construction ? money(lineBaseTotal(construction)) : null;
      ws.addRow({
        orderNumber: isFirstOrderLine ? order.orderNumber : "",
        clinicLegalName: isFirstOrderLine ? orderLegalName(order) : "",
        clinic: isFirstOrderLine ? (order.clinic?.name ?? "Частное лицо") : "",
        doctor: isFirstOrderLine ? order.doctor.fullName : "",
        patient: isFirstOrderLine ? (order.patientName ?? "") : "",
        construction: construction ? constructionLabel(construction) : "",
        quantity,
        unitPrice: unitPrice == null ? null : money(unitPrice),
        lineTotal,
        discount: construction ? lineDiscountLabel(order, construction) : totals.discountLabel,
        discountedTotal: isFirstOrderLine ? totals.discountedTotal : null,
      });
    });
  }

  for (const row of ws.getRows(2, Math.max(0, ws.rowCount - 1)) ?? []) {
    row.alignment = { vertical: "top", wrapText: true };
  }
  for (const colKey of ["unitPrice", "lineTotal", "discountedTotal"]) {
    ws.getColumn(colKey).numFmt = '#,##0.00';
  }
  for (const colKey of ["quantity", "unitPrice", "lineTotal", "discountedTotal"]) {
    ws.getColumn(colKey).alignment = { horizontal: "center", vertical: "top" };
  }
  ws.eachRow((row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFBFBFBF" } },
        left: { style: "thin", color: { argb: "FFBFBFBF" } },
        bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
        right: { style: "thin", color: { argb: "FFBFBFBF" } },
      };
    });
  });
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ws.columnCount },
  };

  const buf = await wb.xlsx.writeBuffer();
  const filename = `finance-office-${periodLabel}.xlsx`;
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
