/**
 * POST /api/finance-office/invoice-import/apply
 *
 * Multipart: files[] + rows JSON. Пишем вложение и invoiceIssued; оплату не трогаем.
 * Accept: application/x-ndjson — поток progress (unpack → row → done).
 * Разбор позиций PDF — after(), UI не ждёт. SQLITE_BUSY: короткие записи по наряду.
 */
import { after, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import type {
  FinanceInvoiceImportApplyRow,
  FinanceInvoiceImportProgressEvent,
} from "@/lib/finance-office-invoice-import";
import {
  FINANCE_INVOICE_IMPORT_MAX_FILE_BYTES,
  applyFinanceInvoiceImport,
  expandFinanceInvoiceUploadFiles,
  parseAttachedInvoicesInBackground,
} from "@/lib/finance-office-invoice-import-server";
import { recordOrderRevision } from "@/lib/record-order-revision";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const runtime = "nodejs";

function parseRows(raw: unknown): FinanceInvoiceImportApplyRow[] {
  if (!Array.isArray(raw)) return [];
  const out: FinanceInvoiceImportApplyRow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    out.push({
      key: String(o.key || "").trim(),
      fileName: String(o.fileName || "").trim(),
      sourceArchive:
        o.sourceArchive == null || o.sourceArchive === ""
          ? null
          : String(o.sourceArchive),
      orderNumber: String(o.orderNumber || "").trim(),
      invoiceNumberRaw: String(o.invoiceNumberRaw || "").trim(),
      apply: o.apply === true,
    });
  }
  return out.filter((r) => r.key);
}

function wantsNdjson(req: Request): boolean {
  return (req.headers.get("accept") || "").includes("application/x-ndjson");
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  const tenantId = session ? await getTenantIdForSession(session) : null;
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const form = await req.formData();
  let rows: FinanceInvoiceImportApplyRow[] = [];
  try {
    rows = parseRows(JSON.parse(String(form.get("rows") || "[]")));
  } catch {
    return NextResponse.json({ error: "Некорректный список строк" }, { status: 400 });
  }
  if (!rows.length) {
    return NextResponse.json({ error: "Нет строк для сохранения" }, { status: 400 });
  }

  const raw = form.getAll("files").concat(form.getAll("file"));
  const files = raw.filter((x): x is File => x instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Повторно приложите файлы счетов" }, { status: 400 });
  }

  const buffers: Array<{ name: string; mime: string; buf: Buffer }> = [];
  for (const file of files) {
    if (file.size > FINANCE_INVOICE_IMPORT_MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `Файл слишком большой: ${file.name} (макс. 20 МБ)` },
        { status: 413 },
      );
    }
    buffers.push({
      name: file.name,
      mime: file.type,
      buf: Buffer.from(await file.arrayBuffer()),
    });
  }

  const prisma = await getOrdersPrisma();
  const stream = wantsNdjson(req);

  if (!stream) {
    const expanded = await expandFinanceInvoiceUploadFiles(buffers);
    if (expanded.error) {
      return NextResponse.json({ error: expanded.error }, { status: 400 });
    }
    const { results, parseOrderIds } = await applyFinanceInvoiceImport({
      prisma,
      tenantId,
      rows,
      pdfs: expanded.pdfs,
    });
    after(() =>
      Promise.allSettled([
        parseAttachedInvoicesInBackground(prisma, parseOrderIds),
        ...parseOrderIds.map((id) => recordOrderRevision(id, { kind: "SAVE" })),
      ]).then(() => undefined),
    );
    return NextResponse.json(
      {
        ok: true,
        applied: results.filter((r) => r.ok).length,
        skipped: results.filter((r) => !r.ok).length,
        results,
        orderNumbers: results.filter((r) => r.ok).map((r) => r.orderNumber),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  let resolveBg: (ids: string[]) => void = () => {};
  const bgIds = new Promise<string[]>((resolve) => {
    resolveBg = resolve;
  });
  after(() =>
    bgIds.then((parseOrderIds) =>
      Promise.allSettled([
        parseAttachedInvoicesInBackground(prisma, parseOrderIds),
        ...parseOrderIds.map((id) => recordOrderRevision(id, { kind: "SAVE" })),
      ]).then(() => undefined),
    ),
  );

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: FinanceInvoiceImportProgressEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(ev)}\n`));
      };
      try {
        send({ type: "phase", phase: "unpack" });
        const expanded = await expandFinanceInvoiceUploadFiles(buffers);
        if (expanded.error) {
          send({ type: "error", error: expanded.error });
          resolveBg([]);
          controller.close();
          return;
        }
        const workTotal = rows.filter((r) => r.apply).length;
        send({ type: "phase", phase: "attach" });
        send({ type: "start", total: workTotal });
        const { results, parseOrderIds } = await applyFinanceInvoiceImport({
          prisma,
          tenantId,
          rows,
          pdfs: expanded.pdfs,
          onRow: ({ done, total, result }) => {
            send({ type: "row", done, total, result });
          },
        });
        resolveBg(parseOrderIds);
        send({
          type: "done",
          results,
          applied: results.filter((r) => r.ok).length,
          skipped: results.filter((r) => !r.ok).length,
        });
        controller.close();
      } catch (e) {
        send({
          type: "error",
          error:
            e instanceof Error ? e.message : "Не удалось прикрепить счета",
        });
        resolveBg([]);
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
