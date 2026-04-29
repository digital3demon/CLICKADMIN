import { NextResponse } from "next/server";
import type { OrderStatus } from "@prisma/client";
import {
  getClientsPrisma,
  getOrdersPrisma,
  getPricingPrisma,
} from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { createOrderFromBody } from "@/lib/order-create-service";
import { syncNewOrderToKaiten } from "@/lib/kaiten-order-sync";
import {
  combineAppointmentDateTime,
  correctionTrackFromText,
  hasProstheticsKeywords,
  normalizeLookup,
  parseYesNo,
  parseExcelDate,
  resolveClinicId,
  resolveDoctorId,
  resolvePriceListItemsForText,
  type ImportRowInput,
} from "@/lib/order-import-export";

type ImportRequestRow = ImportRowInput;

type ImportRowResult = {
  rowNumber: number;
  orderNumber: string;
  ok: boolean;
  orderId?: string;
  createdOrderNumber?: string;
  errors: string[];
};

const STATUS_MAP: Array<[string, OrderStatus]> = [
  ["на проверке", "REVIEW"],
  ["планирование", "PLANNING"],
  ["в работе", "IN_PROGRESS"],
  ["в доставке", "IN_DELIVERY"],
  ["доставлен", "DELIVERED"],
  ["отменен", "CANCELLED"],
  ["отменён", "CANCELLED"],
];

function orderStatusFromLabel(label: string): OrderStatus | null {
  const norm = normalizeLookup(label);
  if (!norm) return null;
  for (const [key, val] of STATUS_MAP) {
    if (norm === key) return val;
  }
  return null;
}

function parseRows(value: unknown): ImportRequestRow[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((r) => (typeof r === "object" && r != null ? (r as ImportRequestRow) : null))
    .filter((r): r is ImportRequestRow => r != null);
}

function hasCorrectionInvoicedText(value: string): boolean {
  return /коррекц|передел/i.test(String(value ?? ""));
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await requireSessionTenantId(session);

  let body: { rows?: unknown };
  try {
    body = (await req.json()) as { rows?: unknown };
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const rows = parseRows(body.rows);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Нет строк для импорта" }, { status: 400 });
  }

  const [ordersPrisma, clientsPrisma, pricingPrisma] = await Promise.all([
    getOrdersPrisma(),
    getClientsPrisma(),
    getPricingPrisma(),
  ]);
  const [doctors, clinics] = await Promise.all([
    clientsPrisma.doctor.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, fullName: true },
    }),
    clientsPrisma.clinic.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, name: true },
    }),
  ]);
  const priceItems = await pricingPrisma.priceListItem.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const results: ImportRowResult[] = [];

  for (const row of rows) {
    const errors: string[] = [];
    const doctorId = resolveDoctorId(row.doctorName, doctors);
    if (!doctorId) errors.push("!Доктор не найден");

    const clinicId = row.clinicName ? resolveClinicId(row.clinicName, clinics) : null;
    if (row.clinicName.trim() && !clinicId) {
      errors.push("клиника не найдена");
    }
    const invoicedMatches = resolvePriceListItemsForText(row.invoicedText, priceItems);
    const invoicedAllMatched =
      invoicedMatches.length === 0 || invoicedMatches.every((m) => Boolean(m.item?.id));
    if (row.invoicedText.trim() && !invoicedAllMatched) {
      errors.push("Проверьте что выставлено");
    }
    if (hasCorrectionInvoicedText(row.invoicedText) && !correctionTrackFromText(row.correctionTrackText)) {
      errors.push("Выберите коррекцию (Ортопедия/Ортодонтия/Переделка)");
    }

    const dueToAdminsAt = combineAppointmentDateTime(
      row.appointmentDateText,
      row.appointmentTimeText,
    );
    if (!dueToAdminsAt) {
      errors.push("Не распознана дата приема (колонка «Прием»)");
    }
    const dueDate = row.dueDateText ? parseExcelDate(row.dueDateText) : null;
    if (row.dueDateText.trim() && !dueDate) {
      errors.push("Некорректная дата в колонке «Дата»");
    }
    const workReceivedAt = row.workReceivedAtText
      ? parseExcelDate(row.workReceivedAtText)
      : null;
    if (row.workReceivedAtText.trim() && !workReceivedAt) {
      errors.push("Некорректная дата в колонке «Зашла»");
    }

    if (errors.length > 0 || !doctorId || !dueToAdminsAt) {
      results.push({
        rowNumber: row.rowNumber,
        orderNumber: row.orderNumber,
        ok: false,
        errors,
      });
      continue;
    }

    const created = await createOrderFromBody(
      { ordersPrisma, clientsPrisma, pricingPrisma },
      {
        doctorId,
        clinicId,
        patientName: row.patientName || null,
        comments: row.notes || null,
        clientOrderText: row.clientOrderText || null,
        additionalSourceNotes: row.additionalSourceNotesText || null,
        dueDate: dueDate ? dueDate.toISOString() : null,
        dueToAdminsAt: dueToAdminsAt.toISOString(),
        workReceivedAt: workReceivedAt ? workReceivedAt.toISOString() : null,
        correctionTrack: correctionTrackFromText(row.correctionTrackText),
        kaitenDecideLater: true,
      },
      { tenantId, allowPastDates: true },
    );

    if (!created.ok) {
      results.push({
        rowNumber: row.rowNumber,
        orderNumber: row.orderNumber,
        ok: false,
        errors: [created.error],
      });
      continue;
    }

    try {
      const status = orderStatusFromLabel(row.statusLabel);
      const prostheticsOrdered =
        parseYesNo(row.prostheticsText) || hasProstheticsKeywords(row.invoicedText);
      await ordersPrisma.order.update({
        where: { id: created.order.id },
        data: {
          ...(status ? { status } : {}),
          prostheticsOrdered,
          shippedDescription: row.shippedDescription?.trim() || null,
          invoiceParsedSummaryText:
            invoicedMatches.length > 0 && invoicedAllMatched
              ? invoicedMatches
                  .map((m) => (m.item ? m.item.name : m.token))
                  .join("; ")
              : row.invoicedText?.trim() || null,
        },
      });
    } catch {
      // вторичный апдейт не валит весь импорт
    }

    if (row.createKaitenCard) {
      const kaiten = await syncNewOrderToKaiten(created.order.id);
      if (!kaiten.ok) {
        errors.push(`Карточка Kaiten не создана: ${kaiten.error}`);
      }
    }

    results.push({
      rowNumber: row.rowNumber,
      orderNumber: row.orderNumber,
      ok: errors.length === 0,
      orderId: created.order.id,
      createdOrderNumber: created.order.orderNumber,
      errors,
    });
  }

  const createdCount = results.filter((r) => r.orderId).length;
  const failedCount = results.filter((r) => !r.orderId).length;
  return NextResponse.json({
    total: results.length,
    createdCount,
    failedCount,
    results,
  });
}
