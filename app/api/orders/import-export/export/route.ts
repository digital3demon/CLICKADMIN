import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import {
  getClientsPrisma,
  getOrdersPrisma,
  getPricingPrisma,
} from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { prostheticsFromDb } from "@/lib/order-prosthetics";
import {
  makeTemplateFileName,
  ORDER_EXPORT_V2_HEADERS,
} from "@/lib/order-import-export";
import {
  mapOrderToExportV2Row,
  ORDER_EXPORT_V2_COLUMN_WIDTHS,
  ORDER_EXPORT_V2_HEADER_FILLS,
  ORDER_EXPORT_V2_HEADER_ROW_HEIGHT,
  type OrderExportV2Construction,
  type OrderExportV2Input,
} from "@/lib/order-export-v2";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function thinBorder(): Partial<ExcelJS.Borders> {
  const side = { style: "thin" as const };
  return { top: side, left: side, bottom: side, right: side };
}

function buildProstheticsText(
  prosthetics: unknown,
  prostheticsOrdered: boolean,
  invNameById: Map<string, string>,
): string | null {
  const p = prostheticsFromDb(prosthetics);
  const parts: string[] = [];
  for (const line of p.clientProvided) {
    const d = String(line.description ?? "").trim();
    if (!d) continue;
    const q = Number(line.quantity);
    parts.push(q > 1 ? `${d} *${q}*` : d);
  }
  for (const line of p.ourLines) {
    const name =
      invNameById.get(line.inventoryItemId) ??
      String(line.inventoryItemId ?? "").trim();
    if (!name) continue;
    const q = Number(line.quantity);
    parts.push(q > 1 ? `${name} *${q}*` : name);
  }
  if (parts.length > 0) return parts.join("; ");
  if (prostheticsOrdered) return "протетика";
  return null;
}

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await requireSessionTenantId(session);
  const prisma = await getOrdersPrisma();
  const pricingPrisma = await getPricingPrisma();
  const clientsPrisma = await getClientsPrisma();

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
      id: true,
      orderNumber: true,
      patientName: true,
      clinicId: true,
      doctorId: true,
      doctor: { select: { fullName: true } },
      prostheticsOrdered: true,
      prosthetics: true,
      registeredByLabel: true,
      workReceivedAt: true,
      createdAt: true,
      clientOrderText: true,
      notes: true,
      hasCt: true,
      hasMri: true,
      hasPhoto: true,
      hasScans: true,
      additionalSourceNotes: true,
      dueDate: true,
      appointmentDate: true,
      dueToAdminsHasTime: true,
      adminShippedOtpr: true,
      payment: true,
      invoiceNumber: true,
      invoiceAttachmentId: true,
      isUrgent: true,
      urgentCoefficient: true,
      compositionDiscountPercent: true,
      kaitenCardId: true,
      demoKanbanColumn: true,
      constructions: {
        orderBy: { sortOrder: "asc" },
        select: {
          sortOrder: true,
          category: true,
          quantity: true,
          unitPrice: true,
          lineDiscountPercent: true,
          constructionTypeId: true,
          priceListItemId: true,
          materialId: true,
          shade: true,
          teethFdi: true,
          bridgeFromFdi: true,
          bridgeToFdi: true,
          arch: true,
        },
      },
      revisions: {
        orderBy: { createdAt: "asc" },
        select: { createdAt: true, snapshot: true },
      },
    },
  });

  if (orders.length === 0) {
    return NextResponse.json(
      { error: "Нет нарядов за выбранный период" },
      { status: 404 },
    );
  }

  const clinicIds = Array.from(
    new Set(orders.map((o) => o.clinicId).filter(Boolean)),
  ) as string[];
  const doctorIdsForPrivate = Array.from(
    new Set(orders.filter((o) => !o.clinicId).map((o) => o.doctorId)),
  );
  const constructionTypeIds = Array.from(
    new Set(
      orders.flatMap((o) =>
        o.constructions.map((c) => c.constructionTypeId).filter(Boolean),
      ),
    ),
  ) as string[];
  const priceListItemIds = Array.from(
    new Set(
      orders.flatMap((o) =>
        o.constructions.map((c) => c.priceListItemId).filter(Boolean),
      ),
    ),
  ) as string[];
  const materialIds = Array.from(
    new Set(
      orders.flatMap((o) =>
        o.constructions.map((c) => c.materialId).filter(Boolean),
      ),
    ),
  ) as string[];
  const invoiceAttachmentIds = Array.from(
    new Set(orders.map((o) => o.invoiceAttachmentId).filter(Boolean)),
  ) as string[];

  const itemIds = new Set<string>();
  for (const o of orders) {
    const p = prostheticsFromDb(o.prosthetics);
    for (const row of p.ourLines) {
      const id = String(row.inventoryItemId ?? "").trim();
      if (id) itemIds.add(id);
    }
  }

  const [
    clinics,
    doctorsIp,
    constructionTypes,
    priceItems,
    materials,
    inv,
    attachments,
  ] = await Promise.all([
    clinicIds.length
      ? clientsPrisma.clinic.findMany({
          where: { id: { in: clinicIds }, deletedAt: null },
          select: {
            id: true,
            name: true,
            worksWithReconciliation: true,
            legalFullName: true,
            inn: true,
          },
        })
      : Promise.resolve([]),
    doctorIdsForPrivate.length
      ? clientsPrisma.doctor.findMany({
          where: { id: { in: doctorIdsForPrivate } },
          select: {
            id: true,
            ipClinicAsSource: {
              select: { legalFullName: true, inn: true, deletedAt: true },
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
    materialIds.length
      ? pricingPrisma.material.findMany({
          where: { id: { in: materialIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    itemIds.size
      ? pricingPrisma.inventoryItem.findMany({
          where: { id: { in: Array.from(itemIds) } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    invoiceAttachmentIds.length
      ? prisma.orderAttachment.findMany({
          where: { id: { in: invoiceAttachmentIds } },
          select: { id: true, createdAt: true },
        })
      : Promise.resolve([]),
  ]);

  const clinicById = new Map(clinics.map((c) => [c.id, c]));
  const privateReqByDoctorId = new Map(
    doctorsIp.map((d) => {
      const ip = d.ipClinicAsSource;
      if (!ip || ip.deletedAt != null) return [d.id, null] as const;
      return [d.id, { legalFullName: ip.legalFullName, inn: ip.inn }] as const;
    }),
  );
  const constructionTypeById = new Map(constructionTypes.map((x) => [x.id, x]));
  const priceItemById = new Map(priceItems.map((x) => [x.id, x]));
  const materialById = new Map(materials.map((x) => [x.id, x]));
  const invNameById = new Map(inv.map((x) => [x.id, x.name]));
  const attachmentCreatedAtById = new Map(
    attachments.map((a) => [a.id, a.createdAt]),
  );

  const exportInputs: OrderExportV2Input[] = orders.map((o) => {
    const clinic = o.clinicId ? clinicById.get(o.clinicId) : null;
    const requisites = clinic
      ? { legalFullName: clinic.legalFullName, inn: clinic.inn }
      : (privateReqByDoctorId.get(o.doctorId) ?? null);

    const hydratedConstructions: OrderExportV2Construction[] = o.constructions.map(
      (c) => ({
        sortOrder: c.sortOrder,
        category: c.category,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        lineDiscountPercent: c.lineDiscountPercent,
        constructionType: c.constructionTypeId
          ? (constructionTypeById.get(c.constructionTypeId) ?? null)
          : null,
        priceListItem: c.priceListItemId
          ? (priceItemById.get(c.priceListItemId) ?? null)
          : null,
        material: c.materialId ? (materialById.get(c.materialId) ?? null) : null,
        shade: c.shade,
        teethFdi: c.teethFdi,
        bridgeFromFdi: c.bridgeFromFdi,
        bridgeToFdi: c.bridgeToFdi,
        arch: c.arch,
      }),
    );

    return {
      orderNumber: o.orderNumber,
      patientName: o.patientName,
      doctor: o.doctor,
      clinic: clinic
        ? {
            name: clinic.name,
            worksWithReconciliation: clinic.worksWithReconciliation,
          }
        : null,
      clientOrderText: o.clientOrderText,
      prostheticsText: buildProstheticsText(
        o.prosthetics,
        o.prostheticsOrdered,
        invNameById,
      ),
      registeredByLabel: o.registeredByLabel,
      workReceivedAt: o.workReceivedAt,
      createdAt: o.createdAt,
      notes: o.notes,
      hasCt: o.hasCt,
      hasMri: o.hasMri,
      hasPhoto: o.hasPhoto,
      hasScans: o.hasScans,
      additionalSourceNotes: o.additionalSourceNotes,
      dueDate: o.dueDate,
      appointmentDate: o.appointmentDate,
      dueToAdminsHasTime: o.dueToAdminsHasTime,
      adminShippedOtpr: o.adminShippedOtpr,
      payment: o.payment,
      invoiceNumber: o.invoiceNumber,
      invoiceAttachmentCreatedAt: o.invoiceAttachmentId
        ? (attachmentCreatedAtById.get(o.invoiceAttachmentId) ?? null)
        : null,
      isUrgent: o.isUrgent,
      urgentCoefficient: o.urgentCoefficient,
      compositionDiscountPercent: o.compositionDiscountPercent,
      kaitenCardId: o.kaitenCardId,
      demoKanbanColumn: o.demoKanbanColumn,
      constructions: hydratedConstructions,
      requisites,
      revisions: o.revisions,
    };
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "dental-lab-crm";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Занесение");
  sheet.addRow([...ORDER_EXPORT_V2_HEADERS]);

  const headerRow = sheet.getRow(1);
  headerRow.height = ORDER_EXPORT_V2_HEADER_ROW_HEIGHT;
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  for (let col = 1; col <= ORDER_EXPORT_V2_HEADERS.length; col++) {
    const cell = headerRow.getCell(col);
    cell.border = thinBorder();
    const fillArgb = ORDER_EXPORT_V2_HEADER_FILLS[col - 1];
    if (fillArgb) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: fillArgb },
      };
    }
  }

  for (const input of exportInputs) {
    const rowValues = mapOrderToExportV2Row(input);
    const row = sheet.addRow(rowValues);
    row.alignment = { vertical: "top", wrapText: true };
    for (let col = 1; col <= rowValues.length; col++) {
      row.getCell(col).border = thinBorder();
    }
  }

  sheet.views = [{ state: "frozen", ySplit: 1, activeCell: "A2" }];
  sheet.columns.forEach((col, idx) => {
    col.width = ORDER_EXPORT_V2_COLUMN_WIDTHS[idx] ?? 16;
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
