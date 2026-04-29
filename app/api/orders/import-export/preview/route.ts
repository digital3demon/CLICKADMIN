import { NextResponse } from "next/server";
import { getClientsPrisma, getPricingPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import {
  combineAppointmentDateTime,
  correctionTrackFromText,
  getMissingHeaderMessages,
  parseExcelDate,
  parseWorkbookImportRows,
  resolveClinicId,
  resolveDoctorId,
  resolvePriceListItemsForText,
  type ImportRowInput,
  templateHeaderWithLetters,
} from "@/lib/order-import-export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PreviewIssue = { field: string; message: string };

type PreviewRow = ImportRowInput & {
  doctorId: string | null;
  clinicId: string | null;
  invoicedMatches: Array<{
    token: string;
    itemId: string | null;
    itemLabel: string | null;
  }>;
  issues: PreviewIssue[];
};

function hasCorrectionInvoicedText(value: string): boolean {
  return /коррекц|передел/i.test(String(value ?? ""));
}

function rowIssues(
  row: ImportRowInput,
  refs: {
    doctorId: string | null;
    clinicId: string | null;
    invoicedAllMatched: boolean;
  },
): PreviewIssue[] {
  const issues: PreviewIssue[] = [];
  if (!row.doctorName.trim()) {
    issues.push({ field: "doctorName", message: "Не указан доктор" });
  } else if (!refs.doctorId) {
    issues.push({ field: "doctorName", message: "!Доктор не найден" });
  }
  if (!row.patientName.trim()) {
    issues.push({ field: "patientName", message: "Не указан пациент" });
  }
  const appointment = combineAppointmentDateTime(
    row.appointmentDateText,
    row.appointmentTimeText,
  );
  if (!appointment) {
    issues.push({
      field: "appointmentDateText",
      message: "Не распознана дата приема (колонка «Прием»)",
    });
  }
  if (row.clinicName.trim() && !refs.clinicId) {
    issues.push({ field: "clinicName", message: "клиника не найдена" });
  }
  if (row.dueDateText.trim() && !parseExcelDate(row.dueDateText)) {
    issues.push({ field: "dueDateText", message: "Некорректная дата в колонке «Дата»" });
  }
  if (row.workReceivedAtText.trim() && !parseExcelDate(row.workReceivedAtText)) {
    issues.push({
      field: "workReceivedAtText",
      message: "Некорректная дата в колонке «Зашла»",
    });
  }
  if (row.invoicedText.trim() && !refs.invoicedAllMatched) {
    issues.push({ field: "invoicedText", message: "Проверьте что выставлено" });
  }
  if (
    hasCorrectionInvoicedText(row.invoicedText) &&
    !correctionTrackFromText(row.correctionTrackText)
  ) {
    issues.push({
      field: "correctionTrackText",
      message: "Выберите коррекцию (Ортопедия/Ортодонтия/Переделка)",
    });
  }
  return issues;
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await requireSessionTenantId(session);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Ожидается multipart/form-data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Поле file обязательно" }, { status: 400 });
  }
  const ab = await file.arrayBuffer();
  const buffer = Buffer.from(ab);

  const headerErrors = await getMissingHeaderMessages(buffer);
  if (headerErrors.length > 0) {
    return NextResponse.json(
      {
        error: "Шаблон таблицы не распознан",
        headerErrors,
        template: templateHeaderWithLetters(),
      },
      { status: 400 },
    );
  }

  const { rows, sheetName } = await parseWorkbookImportRows(buffer);
  const [clientsPrisma, pricingPrisma] = await Promise.all([
    getClientsPrisma(),
    getPricingPrisma(),
  ]);
  const [doctors, clinics, priceItems] = await Promise.all([
    clientsPrisma.doctor.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, fullName: true },
    }),
    clientsPrisma.clinic.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, name: true },
    }),
    pricingPrisma.priceListItem.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  const previewRows: PreviewRow[] = rows.map((row) => {
    const doctorId = resolveDoctorId(row.doctorName, doctors);
    const clinicId = row.clinicName ? resolveClinicId(row.clinicName, clinics) : null;
    const invoicedMatches = resolvePriceListItemsForText(row.invoicedText, priceItems);
    const invoicedAllMatched =
      invoicedMatches.length === 0 || invoicedMatches.every((m) => Boolean(m.item?.id));
    return {
      ...row,
      doctorId,
      clinicId,
      invoicedMatches: invoicedMatches.map((m) => ({
        token: m.token,
        itemId: m.item?.id ?? null,
        itemLabel: m.item ? `${m.item.code} ${m.item.name}` : null,
      })),
      issues: rowIssues(row, {
        doctorId,
        clinicId,
        invoicedAllMatched,
      }),
    };
  });

  const withIssues = previewRows.filter((r) => r.issues.length > 0).length;
  return NextResponse.json({
    sheetName,
    totalRows: previewRows.length,
    rowsWithIssues: withIssues,
    rows: previewRows,
    refs: {
      doctors: doctors.map((d) => ({ id: d.id, name: d.fullName })),
      clinics: clinics.map((c) => ({ id: c.id, name: c.name })),
      priceItems: priceItems.map((p) => ({
        id: p.id,
        label: `${p.code} ${p.name}`,
      })),
    },
  });
}
