import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import {
  buildFinanceInvoiceNumber,
  normalizeFinanceBankApplyRow,
  type FinanceBankImportApplyRow,
} from "@/lib/finance-office-bank-import";
import { ORDER_PAYMENT_PAID } from "@/lib/order-clinic-client-fields";
import { recordOrderRevision } from "@/lib/record-order-revision";

export const dynamic = "force-dynamic";

type Body = { rows?: unknown };

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  const tenantId = session ? await getTenantIdForSession(session) : null;
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const rawRows = Array.isArray(body.rows) ? (body.rows as FinanceBankImportApplyRow[]) : [];
  if (!rawRows.length) {
    return NextResponse.json({ error: "Нет строк для сохранения" }, { status: 400 });
  }

  const normalized = rawRows.map(normalizeFinanceBankApplyRow);
  const toApply = normalized.filter((r) => r.apply && r.errors.length === 0);
  const duplicateNumbers = new Set<string>();
  const seen = new Set<string>();
  for (const row of toApply) {
    if (seen.has(row.orderNumber)) duplicateNumbers.add(row.orderNumber);
    seen.add(row.orderNumber);
  }
  const prisma = await getOrdersPrisma();
  const orders = toApply.length
    ? await prisma.order.findMany({
        where: {
          tenantId,
          archivedAt: null,
          orderNumber: { in: Array.from(new Set(toApply.map((r) => r.orderNumber))) },
        },
        select: { id: true, orderNumber: true, payment: true, invoiceNumber: true },
      })
    : [];
  const byNumber = new Map(orders.map((o) => [o.orderNumber, o]));

  const results: Array<{
    sourceRow: number;
    orderNumber: string;
    ok: boolean;
    message: string;
  }> = [];
  const changedIds: string[] = [];
  for (const row of normalized) {
    if (!row.apply) {
      results.push({
        sourceRow: row.sourceRow,
        orderNumber: row.orderNumber,
        ok: false,
        message: row.errors[0] ?? "Строка пропущена пользователем",
      });
      continue;
    }
    if (row.errors.length > 0) {
      results.push({
        sourceRow: row.sourceRow,
        orderNumber: row.orderNumber,
        ok: false,
        message: row.errors.join("; "),
      });
      continue;
    }
    if (duplicateNumbers.has(row.orderNumber)) {
      results.push({
        sourceRow: row.sourceRow,
        orderNumber: row.orderNumber,
        ok: false,
        message: "Конфликт: в импорте несколько строк с этим номером заказа",
      });
      continue;
    }
    const order = byNumber.get(row.orderNumber);
    if (!order) {
      results.push({
        sourceRow: row.sourceRow,
        orderNumber: row.orderNumber,
        ok: false,
        message: "Заказ с таким номером не найден",
      });
      continue;
    }
    const invoiceNumber = buildFinanceInvoiceNumber(row.invoiceNumberRaw, row.invoiceDate);
    await prisma.order.update({
      where: { id: order.id },
      data: {
        payment: ORDER_PAYMENT_PAID,
        paymentPartialRub: null,
        invoiceNumber,
      },
    });
    changedIds.push(order.id);
    results.push({
      sourceRow: row.sourceRow,
      orderNumber: row.orderNumber,
      ok: true,
      message: `Оплачено, ${invoiceNumber}`,
    });
  }

  await Promise.allSettled(
    changedIds.map((id) => recordOrderRevision(id, { kind: "SAVE" })),
  );

  return NextResponse.json(
    {
      ok: true,
      applied: results.filter((r) => r.ok).length,
      skipped: results.filter((r) => !r.ok).length,
      results,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
