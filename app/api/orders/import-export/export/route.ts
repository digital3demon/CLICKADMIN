import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getOrdersPrisma, getPricingPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { ORDER_STATUS_LABELS } from "@/lib/order-status-labels";
import { ORDER_CORRECTION_TRACK_LABELS } from "@/lib/order-correction-track";
import { prostheticsFromDb } from "@/lib/order-prosthetics";
import {
  buildExportWorkbookRows,
  makeTemplateFileName,
  ORDER_IMPORT_EXPORT_HEADERS,
} from "@/lib/order-import-export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await requireSessionTenantId(session);
  const prisma = await getOrdersPrisma();
  const pricingPrisma = await getPricingPrisma();

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const fromDate = from ? new Date(`${from}T00:00:00`) : null;
  const toDate = to ? new Date(`${to}T23:59:59.999`) : null;

  if (fromDate && Number.isNaN(fromDate.getTime())) {
    return NextResponse.json({ error: "Некорректная дата from" }, { status: 400 });
  }
  if (toDate && Number.isNaN(toDate.getTime())) {
    return NextResponse.json({ error: "Некорректная дата to" }, { status: 400 });
  }

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      archivedAt: null,
      ...(fromDate || toDate
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: {
      orderNumber: true,
      patientName: true,
      doctor: { select: { fullName: true } },
      clinic: { select: { name: true, worksWithReconciliation: true } },
      status: true,
      prostheticsOrdered: true,
      prosthetics: true,
      registeredByLabel: true,
      workReceivedAt: true,
      createdAt: true,
      clientOrderText: true,
      notes: true,
      additionalSourceNotes: true,
      dueDate: true,
      appointmentDate: true,
      correctionTrack: true,
      shippedDescription: true,
      excludeFromReconciliation: true,
      payment: true,
      kaitenCardId: true,
      invoiceParsedSummaryText: true,
      invoiceParsedTotalRub: true,
      constructions: { select: { id: true } },
    },
  });

  const itemIds = new Set<string>();
  for (const o of orders) {
    const p = prostheticsFromDb(o.prosthetics);
    for (const row of p.ourLines) {
      const id = String(row.inventoryItemId ?? "").trim();
      if (id) itemIds.add(id);
    }
  }
  const inv = itemIds.size
    ? await pricingPrisma.inventoryItem.findMany({
        where: { id: { in: Array.from(itemIds) } },
        select: { id: true, name: true },
      })
    : [];
  const invNameById = new Map(inv.map((x) => [x.id, x.name]));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "dental-lab-crm";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Занесение");
  sheet.addRow([...ORDER_IMPORT_EXPORT_HEADERS]);

  const rows = buildExportWorkbookRows(
    orders.map((o) => ({
      orderNumber: o.orderNumber,
      patientName: o.patientName,
      doctorName: o.doctor.fullName,
      clinicName: o.clinic?.name ?? null,
      statusLabel: ORDER_STATUS_LABELS[o.status],
      prostheticsText: (() => {
        const p = prostheticsFromDb(o.prosthetics);
        const parts: string[] = [];
        for (const line of p.clientProvided) {
          const d = String(line.description ?? "").trim();
          if (!d) continue;
          const q = Number(line.quantity);
          parts.push(q > 1 ? `${d} *${q}*` : d);
        }
        for (const line of p.ourLines) {
          const name = invNameById.get(line.inventoryItemId) ?? String(line.inventoryItemId ?? "").trim();
          if (!name) continue;
          const q = Number(line.quantity);
          parts.push(q > 1 ? `${name} *${q}*` : name);
        }
        if (parts.length > 0) return parts.join("; ");
        if (o.prostheticsOrdered) return "протетика";
        return null;
      })(),
      registeredByLabel: o.registeredByLabel,
      workReceivedAt: o.workReceivedAt,
      createdAt: o.createdAt,
      clientOrderText: o.clientOrderText,
      notes: o.notes,
      additionalSourceNotesText: o.additionalSourceNotes,
      dueDate: o.dueDate,
      appointmentDate: o.appointmentDate,
      correctionTrack: o.correctionTrack
        ? ORDER_CORRECTION_TRACK_LABELS[o.correctionTrack]
        : null,
      shippedDescription: o.shippedDescription,
      reconciliationLabel:
        o.clinic?.worksWithReconciliation === true ? "Да" : "Нет",
      paymentLabel: o.payment,
      kaitenCardCreated: o.kaitenCardId != null,
      invoiceParsedSummaryText: o.invoiceParsedSummaryText,
      invoiceParsedTotalRub: o.invoiceParsedTotalRub,
      constructionsCount: o.constructions.length,
    })),
  );
  for (const row of rows) sheet.addRow(row);

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.columns.forEach((col) => {
    col.width = 20;
  });

  const buf = await workbook.xlsx.writeBuffer();
  const fileName = makeTemplateFileName({ from, to });
  return new NextResponse(buf, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}
