import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import {
  parseFinanceBankText,
  parseFinanceBankWorkbook,
} from "@/lib/finance-office-bank-import";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  const tenantId = session ? await getTenantIdForSession(session) : null;
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Загрузите файл выгрузки" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Файл слишком большой, максимум 10 МБ" }, { status: 413 });
  }

  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());
  let rows;
  if (name.endsWith(".xls") || name.endsWith(".xlsx")) {
    rows = parseFinanceBankWorkbook(buffer);
  } else if (name.endsWith(".pdf") || mime.includes("pdf")) {
    const { extractPdfPlainText } = await import("@/lib/extract-pdf-plain-text");
    const extracted = await extractPdfPlainText(buffer);
    if (extracted.error) {
      return NextResponse.json({ error: extracted.error }, { status: 400 });
    }
    rows = parseFinanceBankText(extracted.text);
  } else if (mime.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(name)) {
    const { recognize } = await import("tesseract.js");
    const result = await recognize(buffer, "rus+eng");
    rows = parseFinanceBankText(result.data.text ?? "");
  } else {
    return NextResponse.json(
      { error: "Поддерживаются .xls, .xlsx, .pdf и изображения PNG/JPG/WebP" },
      { status: 400 },
    );
  }
  const orderNumbers = Array.from(new Set(rows.map((r) => r.orderNumber).filter(Boolean)));
  const prisma = await getOrdersPrisma();
  const orders = orderNumbers.length
    ? await prisma.order.findMany({
        where: { tenantId, archivedAt: null, orderNumber: { in: orderNumbers } },
        select: { id: true, orderNumber: true, patientName: true, doctor: { select: { fullName: true } } },
      })
    : [];
  const byNumber = new Map(orders.map((o) => [o.orderNumber, o]));
  const previewRows = rows.map((r) => {
    const order = r.orderNumber ? byNumber.get(r.orderNumber) : null;
    const errors = [...r.errors];
    if (r.orderNumber && !order) {
      errors.push("Строка не распознана: заказ с таким номером не найден");
    }
    return {
      ...r,
      apply: r.apply && Boolean(order),
      errors,
      orderId: order?.id ?? null,
      orderLabel: order
        ? `${order.orderNumber} · ${order.patientName ?? "без пациента"} · ${order.doctor.fullName}`
        : null,
    };
  });

  return NextResponse.json(
    { rows: previewRows },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
