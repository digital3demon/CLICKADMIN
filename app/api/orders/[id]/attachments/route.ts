import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { extractInvoiceNumberFromPdfBuffer } from "@/lib/extract-invoice-number-from-pdf";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { buildInvoiceCaptionRuFromFileName } from "@/lib/format-invoice-number-ru";
import {
  extractInvoiceNumberFromFileName,
  isProbablyPdf,
} from "@/lib/invoice-number-extract";
import {
  pushAttachmentToKaiten,
  removeAttachmentFromKaitenIfAny,
} from "@/lib/kaiten-sync";
import {
  deleteOrderAttachmentFile,
  newOrderAttachmentId,
  readOrderAttachmentBytes,
  writeOrderAttachmentToDisk,
} from "@/lib/order-attachment-storage";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const UPLOAD_BODY_TIMEOUT_MS = 60_000;

type Ctx = { params: Promise<{ id: string }> };

type ParsedUpload = {
  fileName: string;
  mimeType: string;
  data: Buffer;
  asInvoiceRaw: string | null;
};

async function parseRawUpload(
  req: Request,
  timeoutMs: number,
): Promise<ParsedUpload> {
  const fileNameHeader = req.headers.get("x-upload-filename") ?? "";
  const rawMime = req.headers.get("x-upload-mime")?.trim();
  const asInvoiceRaw = req.headers.get("x-as-invoice");
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

async function sleepMs(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(_req: Request, ctx: Ctx) {
  const prisma = await getOrdersPrisma();
  try {
    const { id: orderId } = await ctx.params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, invoiceAttachmentId: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
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
      },
    });
    const invId = order.invoiceAttachmentId;
    return NextResponse.json(
      invId ? rows.filter((r) => r.id !== invId) : rows,
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось загрузить список файлов" },
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
            "Ожидается загрузка как application/octet-stream (сырое тело файла + заголовки x-upload-filename, при необходимости x-as-invoice)",
        },
        { status: 415 },
      );
    }

    const parsed = await parseRawUpload(req, UPLOAD_BODY_TIMEOUT_MS);
    const prisma = await getOrdersPrisma();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
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

    const buf = Uint8Array.from(parsed.data);
    const mimeType = parsed.mimeType;
    const fileName = parsed.fileName;

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
      const prevOrder = await prisma.order.findUnique({
        where: { id: orderId },
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
    let diskRelPath: string;
    try {
      diskRelPath = await writeOrderAttachmentToDisk(
        orderId,
        attachmentId,
        Buffer.from(buf),
      );
    } catch (e) {
      console.error("[attachments POST] disk write", e);
      return NextResponse.json(
        { error: "Не удалось сохранить файл на диск" },
        { status: 500 },
      );
    }

    let row: {
      id: string;
      fileName: string;
      size: number;
      uploadedToKaitenAt: Date | null;
    };
    try {
      row = await prisma.orderAttachment.create({
        data: {
          id: attachmentId,
          orderId,
          fileName,
          mimeType,
          size: buf.byteLength,
          data: new Uint8Array(0),
          diskRelPath,
        },
        select: {
          id: true,
          fileName: true,
          size: true,
          createdAt: true,
          uploadedToKaitenAt: true,
        },
      });
    } catch (e) {
      await deleteOrderAttachmentFile(diskRelPath).catch(() => {});
      throw e;
    }

    try {
      if (asInvoice) {
        await prisma.order.update({
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
        });
      }
    } catch (e) {
      await prisma.orderAttachment
        .delete({ where: { id: row.id } })
        .catch(() => {});
      await deleteOrderAttachmentFile(diskRelPath).catch(() => {});
      throw e;
    }

    const invoiceSnapshot = asInvoice
      ? await prisma.order.findUnique({
          where: { id: orderId },
          select: { invoiceNumber: true, invoiceIssued: true },
        })
      : null;

    const withInvoice = <T extends Record<string, unknown>>(base: T) =>
      asInvoice && invoiceSnapshot
        ? { ...base, ...invoiceSnapshot }
        : base;

    const deferredKaitenHint = prevInvoiceForKaiten;
    const deferredOrderId = orderId;
    const deferredAttachmentId = row.id;
    /** Счёт хранится в CRM и не дублируется в Kaiten / канбане. */
    const deferredSkipKaitenPush = asInvoice;
    const deferredTryPdfInvoice =
      asInvoice &&
      fromName == null &&
      isProbablyPdf(mimeType, fileName);
    const deferredMime = mimeType;
    const deferredFileName = fileName;
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
      if (!deferredSkipKaitenPush) {
        try {
          await pushAttachmentToKaiten(
            deferredOrderId,
            deferredAttachmentId,
            db,
          );
        } catch (e) {
          console.error("[attachments deferred] Kaiten push attachment", e);
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

    return NextResponse.json(withInvoice({ ...row }), {
      status: 201,
    });
  } catch (e) {
    console.error("[attachments POST]", e);
    const details = errorMessage(e);
    const locked = isSqliteBusyError(e);
    const bodyReadTimeout = details.startsWith("BODY_READ_TIMEOUT:");
    const tooLarge = details.includes("FILE_TOO_LARGE");
    const emptyFile = details.includes("EMPTY_FILE");
    const emptyBody = details.includes("EMPTY_REQUEST_BODY");
    return NextResponse.json(
      {
        error: bodyReadTimeout
          ? "Загрузка файла не завершилась вовремя, попробуйте снова"
          : tooLarge
            ? "Файл больше 10 МБ"
            : emptyFile
              ? "Пустой файл"
              : emptyBody
                ? "Пустое тело запроса"
                : locked
                  ? "База данных занята, попробуйте через несколько секунд"
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
              : 500,
      },
    );
  }
}
