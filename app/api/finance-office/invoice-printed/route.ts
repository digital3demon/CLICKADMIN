/**
 * POST /api/finance-office/invoice-printed
 * После печати пачки: invoicePrinted = true у нарядов, чьи счета вошли в PDF.
 */
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { FINANCE_OFFICE_INVOICE_PRINT_MAX } from "@/lib/finance-office-invoice-print-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseOrderIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const id = String(item || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= FINANCE_OFFICE_INVOICE_PRINT_MAX) break;
  }
  return out;
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  const tenantId = session ? await getTenantIdForSession(session) : null;
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const orderIds = parseOrderIds(
    body && typeof body === "object"
      ? (body as { orderIds?: unknown }).orderIds
      : null,
  );
  if (orderIds.length === 0) {
    return NextResponse.json({ error: "Не выбраны наряды" }, { status: 400 });
  }

  const prisma = await getOrdersPrisma();
  const markRaw =
    body && typeof body === "object"
      ? String((body as { mark?: unknown }).mark || "invoice")
      : "invoice";
  const data =
    markRaw === "upd"
      ? { updPrinted: true }
      : markRaw === "both"
        ? { invoicePrinted: true, updPrinted: true }
        : { invoicePrinted: true };
  const result = await prisma.order.updateMany({
    where: { tenantId, id: { in: orderIds } },
    data,
  });
  return NextResponse.json({ ok: true, updated: result.count });
}
