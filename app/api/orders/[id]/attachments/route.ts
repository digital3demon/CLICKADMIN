import { OrderAttachmentScope, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import { extractInvoiceNumberFromPdfBuffer } from "@/lib/extract-invoice-number-from-pdf";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";
import {
  isKanbanAttachmentUploadRequest,
  isOrderAttachmentUploadAllowed,
} from "@/lib/role-module-paths";
import { buildInvoiceCaptionRuFromFileName } from "@/lib/format-invoice-number-ru";
import {
  extractInvoiceNumberFromFileName,
  isProbablyPdf,
} from "@/lib/invoice-number-extract";
import {
  removeAttachmentFromKaitenIfAny,
  syncUnpushedOrderAttachmentsToKaiten,
} from "@/lib/kaiten-sync";
import {
  deleteOrderAttachmentFile,
  isOrderAttachmentS3Enabled,
  newOrderAttachmentId,
  readOrderAttachmentBytes,
  writeOrderAttachmentToDisk,
  writeOrderAttachmentToS3,
} from "@/lib/order-attachment-storage";
import {
  CRM_UPLOAD_MAX_BYTES,
  CRM_UPLOAD_TOO_LARGE_MESSAGE,
} from "@/lib/crm-upload-limits";
import { isOrderWorkAttachment } from "@/lib/order-work-attachments";
import { importMissingKaitenFilesForOrder } from "@/lib/kaiten-files-import";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const runtime = "nodejs";
/** Auth здесь, не в middleware: matcher исключает этот путь, чтобы Next не буферил файл. */

const MAX_BYTES = CRM_UPLOAD_MAX_BYTES;
/** Согласовано с `maxDuration` (5 мин) — крупные вложения до 1 ГБ. */
const UPLOAD_BODY_TIMEOUT_MS = 300_000;

type Ctx = { params: Promise<{ id: string }> };

type ParsedUpload = {
  fileName: string;
  mimeType: string;
  data: Buffer;
  asInvoiceRaw: string | null;
  attachmentScopeRaw: string | null;
};

async function parseRawUpload(
  req: Request,
  timeoutMs: number,
): Promise<ParsedUpload> {
  const fileNameHeader = req.headers.get("x-upload-filename") ?? "";
  const rawMime = req.headers.get("x-upload-mime")?.trim();
  const asInvoiceRaw = req.headers.get("x-as-invoice");
  const attachmentScopeRaw = req.headers.get("x-attachment-scope");
  let fileName = "file";
  if (fileNameHeader.trim()) {
    try {
      fileName = decodeURIComponent(fileNameHeader).trim() || "file";
    } catch {
      fileName = fileNameHeader.trim() || "file";
    }
  }
  const mimeType = rawMime || "application/octet-stream";

  if (!req.body) {
    throw new Error("EMPTY_REQUEST_BODY");
  }
  const reader = req.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  const deadline = Date.now() + timeoutMs;
  try {
    while (true) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        throw new Error(`BODY_READ_TIMEOUT:${timeoutMs}`);
      }
      const part = await Promise.race([
        reader.read(),
        sleepMs(remaining).then(() => {
          throw new Error(`BODY_READ_TIMEOUT:${timeoutMs}`);
        }),
      ]);
      if (part.done) break;
      const value = part.value;
      if (!value || value.byteLength === 0) continue;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        throw new Error("FILE_TOO_LARGE");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* no-op */
    }
  }
  const buf = Buffer.concat(chunks, total);

  if (buf.length <= 0) {
    throw new Error("EMPTY_FILE");
  }
  if (buf.length > MAX_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }
  return {
    fileName,
    mimeType,
    data: buf,
    asInvoiceRaw,
    attachmentScopeRaw,
  };
}

function scheduleDeferredAttachmentWork(fn: () => Promise<void>): void {
  const run = () => {
    void fn().catch((e) => {
      console.error("[attachments] deferred work", e);
    });
  };
  if (typeof setImmediate === "function") {
    setImmediate(run);
    return;
  }
  queueMicrotask(run);
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  ) {
    return (e as { message: string }).message;
  }
  return String(e);
}

function isSqliteBusyError(e: unknown): boolean {
  const msg = errorMessage(e).toLowerCase();
  return (
    msg.includes("database is locked") ||
    msg.includes("database table is locked") ||
    msg.includes("sqlite_busy")
  );
}

/** PostgreSQL / высокая конкуренция — повтор записи. */
function isTransientWriteConflict(e: unknown): boolean {
  const msg = errorMessage(e);
  const lower = msg.toLowerCase();
  if (
    lower.includes("serialization failure") ||
    lower.includes("deadlock detected") ||
    /p2034\b/i.test(msg)
  ) {
    return true;
  }
  return isSqliteBusyError(e);
}

async function withTransientWriteRetry<T>(
  fn: () => Promise<T>,
  label: string,
): Promise<T> {
  const max = 10;
  let last: unknown;
  for (let i = 0; i < max; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isTransientWriteConflict(e)) throw e;
      await sleepMs(45 * (i + 1) + Math.floor(Math.random() * 60));
    }
  }
  console.error(`[attachments] ${label}: retries exhausted`);
  throw last;
}

async function sleepMs(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const prisma = await getOrdersPrisma();
    const { id: orderId } = await ctx.params;
    const session = await getSessionFromCookies();
    const tenantId = await orderTenantIdForSession(session);
    if (!tenantId) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { id: true, invoiceAttachmentId: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }
    try {
      await importMissingKaitenFilesForOrder(orderId, { prisma, limit: 6 });
    } catch (e) {
      console.warn("[attachments GET] kaiten file import", e);
    }
    const rows = await prisma.orderAttachment.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        size: true,
        createdAt: true,
        uploadedToKaitenAt: true,
        scope: true,
      },
    });
    const invId = order.invoiceAttachmentId;
    const visible = rows.filter((r) => isOrderWorkAttachment(r, invId));
    if (visible.some((r) => r.uploadedToKaitenAt == null)) {
      void syncUnpushedOrderAttachmentsToKaiten(orderId, prisma).catch((e) => {
        console.warn("[attachments GET] kaiten push leftover", e);
      });
    }
    return NextResponse.json(visible);
  } catch (e) {
    console.error("[attachments GET]", e);
    const details = errorMessage(e);
    return NextResponse.json(
      {
        error: "Не удалось загрузить список файлов",
        details: details.slice(0, 500),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { id: orderIdRaw } = await ctx.params;
    const orderId = orderIdRaw?.trim() ?? "";
    if (!orderId) {
      return NextResponse.json({ error: "Некорректный id наряда" }, { status: 400 });
    }

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/octet-stream")) {
      return NextResponse.json(
        {
          error:
            "Ожидается загрузка как application/octet-stream (сырое тело файла + заголовки x-upload-filename, при необходимости x-as-invoice или x-attachment-scope: payment-slip)",
        },
        { status: 415 },
      );
    }

    const parsed = await parseRawUpload(req, UPLOAD_BODY_TIMEOUT_MS);
    const prisma = await getOrdersPrisma();
    const session = await getSessionFromCookies();
    const tenantId = await orderTenantIdForSession(session);
    if (!session || !tenantId) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    if (
      !session.demo &&
      !isSingleUserPortable() &&
      session.role !== "OWNER"
    ) {
      const access = await getEffectiveModuleAccess(tenantId, session.role);
      const pathname = new URL(req.url).pathname;
      if (
        !isOrderAttachmentUploadAllowed(access, pathname, "POST", req.headers)
      ) {
        const fromKanban = isKanbanAttachmentUploadRequest(req.headers);
        return NextResponse.json(
          {
            error: fromKanban
              ? "Нет права прикреплять файлы в канбане"
              : "Нет права добавлять файлы к наряду",
          },
          { status: 403 },
        );
      }
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { id: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }

    const asInvoiceRaw = parsed.asInvoiceRaw;
    const asInvoice =
      asInvoiceRaw === "1" ||
      asInvoiceRaw === "true" ||
      String(asInvoiceRaw ?? "").toLowerCase() === "on";

    const scopeNorm = String(parsed.attachmentScopeRaw ?? "")
      .trim()
      .toLowerCase()
      .replace(/_/g, "-");
    const isPaymentSlipScope = scopeNorm === "payment-slip";
    const rawScopeTrimmed = String(parsed.attachmentScopeRaw ?? "").trim();
    if (rawScopeTrimmed !== "" && !isPaymentSlipScope) {
      return NextResponse.json(
        {
          error:
            'Недопустимый x-attachment-scope. Допускается только "payment-slip".',
        },
        { status: 400 },
      );
    }
    if (asInvoice && isPaymentSlipScope) {
      return NextResponse.json(
        {
          error:
            "Загрузка счёта (x-as-invoice) не сочетается с payment-slip для одного файла",
        },
        { status: 400 },
      );
    }
    const attachmentScope = isPaymentSlipScope
      ? OrderAttachmentScope.PAYMENT_SLIP
      : OrderAttachmentScope.GENERAL;

    const fileBuf = parsed.data;
    const mimeType = parsed.mimeType;
    const fileName = parsed.fileName;
    const fileSize = fileBuf.byteLength;

    const fromName = extractInvoiceNumberFromFileName(fileName);
    const extractedInvoiceNumber =
      buildInvoiceCaptionRuFromFileName(fileName);

    let prevInvoiceForKaiten: {
      orderId: string;
      fileName: string;
      uploadedToKaitenAt: Date | null;
      kaitenFileId: number | null;
    } | null = null;
    let replacedInvoiceAttachmentId: string | null = null;

    if (asInvoice) {
      const prevOrder = await prisma.order.findFirst({
        where: { id: orderId, tenantId },
        select: { invoiceAttachmentId: true },
      });
      const prevId = prevOrder?.invoiceAttachmentId ?? null;
      replacedInvoiceAttachmentId = prevId;
      if (prevId) {
        const prevRow = await prisma.orderAttachment.findUnique({
          where: { id: prevId },
          select: {
            orderId: true,
            fileName: true,
            uploadedToKaitenAt: true,
            kaitenFileId: true,
          },
        });
        if (prevRow) {
          prevInvoiceForKaiten = {
            orderId: prevRow.orderId,
            fileName: prevRow.fileName,
            uploadedToKaitenAt: prevRow.uploadedToKaitenAt,
            kaitenFileId: prevRow.kaitenFileId,
          };
        }
      }
    }

    const attachmentId = newOrderAttachmentId();
    const shouldUseS3Storage = isOrderAttachmentS3Enabled();
    let diskRelPath: string | null = null;
    let dataForDb = fileBuf;
    let storageWarning: string | null = null;
    if (shouldUseS3Storage) {
      try {
        diskRelPath = await writeOrderAttachmentToS3(
          orderId,
          attachmentId,
          fileBuf,
          mimeType,
        );
        dataForDb = Buffer.alloc(0);
      } catch (e) {
        console.error("[attachments POST] S3 write failed, trying disk", e);
        try {
          diskRelPath = await writeOrderAttachmentToDisk(
            orderId,
            attachmentId,
            fileBuf,
          );
          dataForDb = Buffer.alloc(0);
          storageWarning =
            "S3 временно недоступен, файл сохранён на диск CRM";
        } catch (diskErr) {
          console.error("[attachments POST] disk write failed", diskErr);
          return NextResponse.json(
            {
              error: "Не удалось сохранить файл в хранилище (S3 и диск)",
              details: errorMessage(diskErr).slice(0, 500),
            },
            { status: 503 },
          );
        }
      }
    } else {
      // Без S3 — только диск. BYTEA в Postgres на больших файлах даёт OOM → HTML 500.
      try {
        diskRelPath = await writeOrderAttachmentToDisk(
          orderId,
          attachmentId,
          fileBuf,
        );
        dataForDb = Buffer.alloc(0);
      } catch (diskErr) {
        console.error("[attachments POST] disk write failed", diskErr);
        return NextResponse.json(
          {
            error:
              "Не удалось сохранить файл на диск. Включите S3 или проверьте ORDER_ATTACHMENT_STORAGE_DIR / права записи.",
            details: errorMessage(diskErr).slice(0, 500),
          },
          { status: 503 },
        );
      }
    }

    console.info("[attachments POST] store", {
      orderId,
      attachmentId,
      size: fileSize,
      s3: shouldUseS3Storage,
      diskRelPath: diskRelPath ? "yes" : "no",
      dbBytes: dataForDb.byteLength,
    });

    const row = await withTransientWriteRetry(
      () =>
        prisma.orderAttachment.create({
          data: {
            id: attachmentId,
            orderId,
            scope: attachmentScope,
            fileName,
            mimeType,
            size: fileSize,
            data: new Uint8Array(dataForDb),
            diskRelPath,
          },
          select: {
            id: true,
            fileName: true,
            size: true,
            createdAt: true,
            uploadedToKaitenAt: true,
          },
        }),
      "orderAttachment.create",
    );

    try {
      if (asInvoice) {
        await withTransientWriteRetry(
          () =>
            prisma.order.update({
              where: { id: orderId },
              data: {
                invoiceAttachmentId: row.id,
                invoiceIssued: true,
                invoiceParsedLines: Prisma.DbNull,
                invoiceParsedTotalRub: null,
                invoiceParsedSummaryText: null,
                ...(extractedInvoiceNumber
                  ? { invoiceNumber: extractedInvoiceNumber }
                  : {}),
              },
            }),
          "order.update invoice",
        );
      }
    } catch (e) {
      if (diskRelPath) {
        await deleteOrderAttachmentFile(diskRelPath).catch(() => {});
      }
      await prisma.orderAttachment
        .delete({ where: { id: row.id } })
        .catch(() => {});
      throw e;
    }

    const invoiceSnapshot = asInvoice
      ? await prisma.order.findFirst({
          where: { id: orderId, tenantId },
          select: { invoiceNumber: true, invoiceIssued: true },
        })
      : null;

    const withInvoice = <T extends Record<string, unknown>>(base: T) =>
      asInvoice && invoiceSnapshot
        ? { ...base, ...invoiceSnapshot }
        : base;

    const deferredKaitenHint = prevInvoiceForKaiten;
    const deferredTryPdfInvoice =
      asInvoice &&
      fromName == null &&
      isProbablyPdf(mimeType, fileName);
    const deferredMime = mimeType;
    const deferredFileName = fileName;
    const deferredAttachmentId = row.id;
    const deferredOrderId = orderId;
    const prismaForAfter = prisma;
    const deferredDeleteOldId =
      replacedInvoiceAttachmentId &&
      replacedInvoiceAttachmentId !== row.id
        ? replacedInvoiceAttachmentId
        : null;

    scheduleDeferredAttachmentWork(async () => {
      const db = prismaForAfter;
      if (deferredKaitenHint) {
        try {
          await removeAttachmentFromKaitenIfAny(
            deferredKaitenHint,
            db,
          );
        } catch (e) {
          console.error("[attachments deferred] Kaiten remove old invoice", e);
        }
      }
      if (deferredDeleteOldId) {
        try {
          const doomed = await db.orderAttachment.findUnique({
            where: { id: deferredDeleteOldId },
            select: { diskRelPath: true },
          });
          await db.orderAttachment.deleteMany({
            where: { id: deferredDeleteOldId },
          });
          await deleteOrderAttachmentFile(doomed?.diskRelPath ?? null);
        } catch (e) {
          console.error(
            "[attachments deferred] delete replaced invoice row",
            e,
          );
        }
      }
      if (!deferredTryPdfInvoice) return;
      try {
        const att = await db.orderAttachment.findUnique({
          where: { id: deferredAttachmentId },
          select: { data: true, diskRelPath: true },
        });
        if (!att) return;
        const pdfBuf = await readOrderAttachmentBytes(att);
        const n = await extractInvoiceNumberFromPdfBuffer(
          pdfBuf,
          deferredMime,
          deferredFileName,
        );
        if (!n) return;
        const ord = await db.order.findUnique({
          where: { id: deferredOrderId },
          select: { invoiceNumber: true, invoiceAttachmentId: true },
        });
        if (ord?.invoiceAttachmentId !== deferredAttachmentId) return;
        if ((ord.invoiceNumber ?? "").trim() !== "") return;
        await db.order.update({
          where: { id: deferredOrderId },
          data: { invoiceNumber: n },
        });
      } catch (e) {
        console.error("[attachments deferred] PDF invoice number", e);
      }
    });

    return NextResponse.json(
      withInvoice({
        ...row,
        ...(storageWarning ? { warning: storageWarning } : {}),
      }),
      { status: 201 },
    );
  } catch (e) {
    console.error("[attachments POST]", e);
    const details = errorMessage(e);
    const locked = isSqliteBusyError(e);
    const bodyReadTimeout = details.startsWith("BODY_READ_TIMEOUT:");
    const tooLarge = details.includes("FILE_TOO_LARGE");
    const emptyFile = details.includes("EMPTY_FILE");
    const emptyBody = details.includes("EMPTY_REQUEST_BODY");
    const enumScope =
      /invalid input value for enum/i.test(details) &&
      /OrderAttachmentScope|SCANNER/i.test(details);
    return NextResponse.json(
      {
        error: bodyReadTimeout
          ? "Загрузка файла не завершилась вовремя, попробуйте снова"
          : tooLarge
            ? CRM_UPLOAD_TOO_LARGE_MESSAGE
            : emptyFile
              ? "Пустой файл"
              : emptyBody
                ? "Пустое тело запроса"
                : locked
                  ? "База данных занята, попробуйте через несколько секунд"
                  : enumScope
                    ? "Схема БД устарела (нет scope SCANNER). На сервере: npm run db:migrate:deploy"
                    : "Не удалось сохранить файл",
        details: details.slice(0, 500),
      },
      {
        status: bodyReadTimeout
          ? 408
          : tooLarge || emptyFile || emptyBody
            ? 400
            : locked
              ? 503
              : enumScope
                ? 503
                : 500,
      },
    );
  }
}
