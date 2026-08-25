/**
 * POST /api/finance-office/invoice-print
 * Body: { orderIds: string[] }. Склеивает PDF счетов выбранных нарядов.
 * SQLITE_BUSY: короткие чтения. Лимит размера пачки — FINANCE_OFFICE_INVOICE_PRINT_MAX.
 */
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { readOrderAttachmentBytes } from "@/lib/order-attachment-storage";
import {
  FINANCE_OFFICE_INVOICE_PRINT_MAX,
  mergeInvoicePdfBuffers,
} from "@/lib/finance-office-merge-invoice-pdfs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function parseOrderIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const id = String(item || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= 250) break;
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
  const docsRaw =
    body && typeof body === "object"
      ? String((body as { documents?: unknown }).documents || "invoices")
      : "invoices";
  const documents =
    docsRaw === "upd" || docsRaw === "both" ? docsRaw : "invoices";
  const orderIds = parseOrderIds(
    body && typeof body === "object"
      ? (body as { orderIds?: unknown }).orderIds
      : null,
  );
  if (orderIds.length === 0) {
    return NextResponse.json({ error: "Не выбраны наряды" }, { status: 400 });
  }

  const prisma = await getOrdersPrisma();
  const rows = await prisma.order.findMany({
    where: {
      tenantId,
      id: { in: orderIds },
      archivedAt: null,
      OR:
        documents === "upd"
          ? [{ updAttachmentId: { not: null } }]
          : documents === "both"
            ? [
                { invoiceAttachmentId: { not: null } },
                { updAttachmentId: { not: null } },
              ]
            : [{ invoiceAttachmentId: { not: null } }],
    },
    select: {
      id: true,
      invoiceAttachmentId: true,
      updAttachmentId: true,
    },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = orderIds
    .map((id) => byId.get(id))
    .filter((r): r is (typeof rows)[number] => Boolean(r));
  const skippedNoFile = orderIds.length - ordered.length;
  const capped = ordered.slice(0, FINANCE_OFFICE_INVOICE_PRINT_MAX);
  const truncated = ordered.length - capped.length;

  const attIds = capped.flatMap((r) => {
    const ids: string[] = [];
    if (documents !== "upd" && r.invoiceAttachmentId) ids.push(r.invoiceAttachmentId);
    if (documents !== "invoices" && r.updAttachmentId) ids.push(r.updAttachmentId);
    return ids;
  });
  const attachments = attIds.length
    ? await prisma.orderAttachment.findMany({
        where: { id: { in: attIds } },
        select: {
          id: true,
          data: true,
          diskRelPath: true,
        },
      })
    : [];
  const attById = new Map(attachments.map((a) => [a.id, a]));

  const buffers: Uint8Array[] = [];
  const printedIds: string[] = [];
  for (const order of capped) {
    const ids: string[] = [];
    if (documents !== "upd" && order.invoiceAttachmentId) {
      ids.push(order.invoiceAttachmentId);
    }
    if (documents !== "invoices" && order.updAttachmentId) {
      ids.push(order.updAttachmentId);
    }
    let any = false;
    for (const attId of ids) {
      const att = attById.get(attId);
      if (!att) continue;
      try {
        const buf = await readOrderAttachmentBytes(att);
        buffers.push(new Uint8Array(buf));
        any = true;
      } catch {
        /* нет байтов — пропускаем */
      }
    }
    if (any) printedIds.push(order.id);
  }

  if (printedIds.length === 0) {
    return NextResponse.json(
      {
        error:
          documents === "upd"
            ? "У выбранных нарядов нет файла УПД"
            : documents === "both"
              ? "У выбранных нарядов нет файла счёта или УПД"
              : "У выбранных нарядов нет файла счёта",
      },
      { status: 400 },
    );
  }

  try {
    const pdf = await mergeInvoicePdfBuffers(buffers);
    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          documents === "upd"
            ? "inline; filename=\"upd.pdf\""
            : documents === "both"
              ? "inline; filename=\"invoices-upd.pdf\""
              : "inline; filename=\"invoices.pdf\"",
        "X-Invoice-Print-Documents": documents,
        "Cache-Control": "private, no-store",
        "X-Invoice-Print-Order-Ids": printedIds.join(","),
        "X-Invoice-Print-Skipped": String(skippedNoFile),
        "X-Invoice-Print-Truncated": String(truncated),
      },
    });
  } catch (e) {
    console.error("[finance-office/invoice-print]", e);
    return NextResponse.json(
      { error: "Не удалось склеить PDF счетов" },
      { status: 500 },
    );
  }
}
