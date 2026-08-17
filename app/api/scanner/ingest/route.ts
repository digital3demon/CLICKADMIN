/**
 * POST /api/scanner/ingest
 *
 * Чеклист перед тяжёлой записью:
 * - лимит размера SCANNER_INGEST_MAX_BYTES (40 МБ);
 * - таймаут чтения тела UPLOAD_BODY_TIMEOUT_MS;
 * - SQLITE_BUSY / write conflict — withTransientWriteRetry;
 * - auth: Bearer TenantApiKey + scope scanner.ingest (без user-session);
 * - заказ: x-scanner-order-number или QR (пиксели / x-scanner-qr); без серверного OCR;
 * - успех = OrderAttachment (CRM-канбан подтянет через linked-orders);
 * - тихий фоновый sync в Kaiten при наличии карточки — не критерий успеха.
 */
import { OrderAttachmentScope } from "@prisma/client";
import { NextResponse } from "next/server";
import { syncUnpushedOrderAttachmentsToKaiten } from "@/lib/kaiten-sync";
import {
  isOrderAttachmentS3Enabled,
  newOrderAttachmentId,
  writeOrderAttachmentToDisk,
  writeOrderAttachmentToS3,
} from "@/lib/order-attachment-storage";
import {
  decodeQrFromImageBuffer,
  detectImageMagic,
  mimeForImageMagic,
} from "@/lib/scanner-image-qr-decode";
import { pickPreferredScannerQr } from "@/lib/scanner-qr-parse";
import {
  resolveOrderFromOrderNumber,
  resolveOrderFromScannerQr,
} from "@/lib/scanner-qr-resolve";
import { orderPathById } from "@/lib/order-public-ref";
import { rateLimitAllow } from "@/lib/server/rate-limit-edge";
import {
  bearerTokenFromAuthorizationHeader,
  resolveTenantApiKey,
  safeScopeIncludes,
  TENANT_API_KEY_SCOPE_SCANNER_INGEST,
} from "@/lib/tenant-api-keys";
import { resolveTenantPrismaClient } from "@/lib/tenant-prisma-resolver";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export const runtime = "nodejs";

const SCANNER_MAX_BYTES = Math.min(
  40 * 1024 * 1024,
  Number(process.env.SCANNER_INGEST_MAX_BYTES) || 40 * 1024 * 1024,
);
const UPLOAD_BODY_TIMEOUT_MS = 300_000;
const RATE_LIMIT_PER_KEY = Number(process.env.SCANNER_INGEST_RATE_PER_KEY) || 180;
const RATE_LIMIT_PER_IP = Number(process.env.SCANNER_INGEST_RATE_PER_IP) || 300;

function sleepMs(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
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
  console.error(`[scanner/ingest] ${label}: retries exhausted`);
  throw last;
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (xff) return xff;
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

async function readBody(req: Request, timeoutMs: number): Promise<Buffer> {
  if (!req.body) throw new Error("EMPTY_REQUEST_BODY");
  const reader = req.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  const deadline = Date.now() + timeoutMs;
  try {
    while (true) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error(`BODY_READ_TIMEOUT:${timeoutMs}`);
      let settled = false;
      const part = await Promise.race([
        reader.read().then((v) => {
          settled = true;
          return v;
        }),
        sleepMs(remaining).then(() => {
          if (!settled) throw new Error(`BODY_READ_TIMEOUT:${timeoutMs}`);
          return { done: true as const, value: undefined };
        }),
      ]);
      if (part.done) break;
      const value = part.value;
      if (!value || value.byteLength === 0) continue;
      total += value.byteLength;
      if (total > SCANNER_MAX_BYTES) throw new Error("FILE_TOO_LARGE");
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
  if (buf.length <= 0) throw new Error("EMPTY_FILE");
  return buf;
}

export async function POST(req: Request) {
  const t0 = Date.now();
  try {
    const plain = bearerTokenFromAuthorizationHeader(
      req.headers.get("authorization"),
    );
    const apiKey = await resolveTenantApiKey(plain);
    if (!apiKey) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (
      !safeScopeIncludes(apiKey.scopes, TENANT_API_KEY_SCOPE_SCANNER_INGEST)
    ) {
      return NextResponse.json(
        { error: "forbidden_scope", need: TENANT_API_KEY_SCOPE_SCANNER_INGEST },
        { status: 403 },
      );
    }

    const ip = clientIp(req);
    if (!rateLimitAllow(`scanner-ingest:key:${apiKey.keyId}`, RATE_LIMIT_PER_KEY)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    if (!rateLimitAllow(`scanner-ingest:ip:${ip}`, RATE_LIMIT_PER_IP)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/octet-stream")) {
      return NextResponse.json(
        {
          error:
            "unsupported_type: ожидается application/octet-stream (сырое тело файла)",
        },
        { status: 415 },
      );
    }

    let fileBuf: Buffer;
    try {
      fileBuf = await readBody(req, UPLOAD_BODY_TIMEOUT_MS);
    } catch (e) {
      const msg = errorMessage(e);
      if (msg === "FILE_TOO_LARGE") {
        return NextResponse.json({ error: "file_too_large" }, { status: 413 });
      }
      if (msg.startsWith("BODY_READ_TIMEOUT")) {
        return NextResponse.json({ error: "body_timeout" }, { status: 408 });
      }
      return NextResponse.json({ error: "empty_file" }, { status: 400 });
    }

    const contentLengthRaw = req.headers.get("content-length");
    const contentLength = contentLengthRaw ? Number(contentLengthRaw) : NaN;
    if (
      Number.isFinite(contentLength) &&
      contentLength > 0 &&
      fileBuf.length !== contentLength
    ) {
      console.info("[scanner/ingest]", {
        step: "body_incomplete",
        keyId: apiKey.keyId,
        expected: contentLength,
        got: fileBuf.length,
        ms: Date.now() - t0,
      });
      return NextResponse.json(
        {
          error: "body_incomplete",
          detail: "Тело обрезано по пути (прокси/сеть)",
          expected: contentLength,
          bytes: fileBuf.length,
        },
        { status: 408 },
      );
    }

    const magic = detectImageMagic(fileBuf);
    if (!magic) {
      console.info("[scanner/ingest]", {
        step: "unsupported_type",
        keyId: apiKey.keyId,
        bytes: fileBuf.length,
        contentLength: Number.isFinite(contentLength) ? contentLength : null,
        head: fileBuf.subarray(0, 8).toString("hex"),
        ms: Date.now() - t0,
      });
      return NextResponse.json(
        {
          error: "unsupported_type",
          detail: "not_image",
          bytes: fileBuf.length,
        },
        { status: 415 },
      );
    }

    const fileNameHeader = req.headers.get("x-upload-filename") ?? "";
    let fileName = "scan.jpg";
    if (fileNameHeader.trim()) {
      try {
        fileName = decodeURIComponent(fileNameHeader).trim() || fileName;
      } catch {
        fileName = fileNameHeader.trim() || fileName;
      }
    }
    const mimeType =
      req.headers.get("x-upload-mime")?.trim() || mimeForImageMagic(magic);

    const tDecode = Date.now();
    /** Ручная корректировка: номер наряда с клиента, без QR/OCR. */
    const forcedOrderNumber =
      req.headers.get("x-scanner-order-number")?.trim() || "";

    let decodeMs = 0;
    let resolved:
      | Awaited<ReturnType<typeof resolveOrderFromScannerQr>>
      | Awaited<ReturnType<typeof resolveOrderFromOrderNumber>>;

    if (forcedOrderNumber) {
      resolved = await resolveOrderFromOrderNumber(
        forcedOrderNumber,
        apiKey.tenantId,
      );
      if (!resolved.ok) {
        return NextResponse.json(
          {
            error: "order_not_found",
            orderNumber: forcedOrderNumber,
            detail: `Заказ ${forcedOrderNumber} не найден`,
          },
          { status: 404 },
        );
      }
    } else {
      // Разбор номера/QR — на ПК. Здесь только QR с картинки или x-scanner-qr.
      const qrFromImage = await decodeQrFromImageBuffer(fileBuf);
      decodeMs = Date.now() - tDecode;

      const hintRaw = req.headers.get("x-scanner-qr")?.trim() || "";
      let hint = hintRaw;
      if (hintRaw) {
        try {
          hint = decodeURIComponent(hintRaw);
        } catch {
          hint = hintRaw;
        }
      }
      const usefulQr =
        pickPreferredScannerQr(
          [qrFromImage, hint].filter((value): value is string => Boolean(value)),
        ) ?? "";

      if (!usefulQr) {
        console.info("[scanner/ingest]", {
          step: "client_hint_required",
          keyId: apiKey.keyId,
          bytes: fileBuf.length,
          decodeMs,
          ms: Date.now() - t0,
        });
        return NextResponse.json(
          {
            error: "client_hint_required",
            detail:
              "Нужен номер наряда или QR с клиента (серверный OCR отключён)",
          },
          { status: 422 },
        );
      }

      resolved = await resolveOrderFromScannerQr(usefulQr, apiKey.tenantId);
      if (!resolved.ok) {
        console.info("[scanner/ingest]", {
          step: "qr_order_missing",
          keyId: apiKey.keyId,
          reason: resolved.reason,
          decodeMs,
          ms: Date.now() - t0,
        });
        if (resolved.reason === "unknown_qr") {
          return NextResponse.json(
            {
              error: "client_hint_required",
              detail:
                "QR на фото не от наряда (часто этикетка производителя). Укажите номер вручную",
            },
            { status: 422 },
          );
        }
        return NextResponse.json(
          {
            error: "order_not_found",
            detail: "QR распознан, но заказ не найден",
          },
          { status: 404 },
        );
      }
      if (!qrFromImage && hint) {
        console.info("[scanner/ingest]", {
          step: "qr_hint",
          keyId: apiKey.keyId,
        });
      }
    }

    // Здесь resolved всегда ok:true — все fail-ветки выше уже вернули ответ.

    const ordersDb = await resolveTenantPrismaClient(apiKey.tenantId);
    const attachmentId = newOrderAttachmentId();
    const shouldUseS3 = isOrderAttachmentS3Enabled();
    let diskRelPath: string | null = null;
    let dataForDb = fileBuf;
    if (shouldUseS3) {
      try {
        diskRelPath = await writeOrderAttachmentToS3(
          resolved.orderId,
          attachmentId,
          fileBuf,
          mimeType,
        );
        dataForDb = Buffer.alloc(0);
      } catch (e) {
        console.error("[scanner/ingest] S3 failed, disk fallback", e);
        diskRelPath = await writeOrderAttachmentToDisk(
          resolved.orderId,
          attachmentId,
          fileBuf,
        );
        dataForDb = Buffer.alloc(0);
      }
    } else {
      try {
        diskRelPath = await writeOrderAttachmentToDisk(
          resolved.orderId,
          attachmentId,
          fileBuf,
        );
        dataForDb = Buffer.alloc(0);
      } catch (e) {
        console.error("[scanner/ingest] disk write failed, DB blob", e);
        diskRelPath = null;
        dataForDb = fileBuf;
      }
    }

    const safeName = fileName.replace(/[^\w.\-() а-яА-ЯёЁ]+/gi, "_").slice(0, 180);

    const row = await withTransientWriteRetry(
      () =>
        ordersDb.orderAttachment.create({
          data: {
            id: attachmentId,
            orderId: resolved.orderId,
            scope: OrderAttachmentScope.SCANNER,
            fileName: safeName || "scan.jpg",
            mimeType,
            size: fileBuf.byteLength,
            data: new Uint8Array(dataForDb),
            diskRelPath,
          },
          select: { id: true, fileName: true, size: true, createdAt: true },
        }),
      "orderAttachment.create",
    );

    // CRM-канбан берёт файлы из OrderAttachment через linked-orders.
    // Kaiten — тихий побочный sync, не критерий успеха.
    try {
      await syncUnpushedOrderAttachmentsToKaiten(resolved.orderId, ordersDb);
    } catch (e) {
      console.warn("[scanner/ingest] kaiten sync failed", e);
    }

    console.info("[scanner/ingest]", {
      step: "ok",
      keyId: apiKey.keyId,
      keyName: apiKey.name,
      orderId: resolved.orderId,
      orderNumber: resolved.orderNumber,
      attachmentId: row.id,
      qrKind: resolved.qrKind,
      bytes: fileBuf.length,
      decodeMs,
      ms: Date.now() - t0,
      actor: `api:${apiKey.name}`,
    });

    return NextResponse.json({
      ok: true,
      orderId: resolved.orderId,
      orderNumber: resolved.orderNumber,
      patientName: resolved.patientName,
      doctorName: resolved.doctorName,
      orderPath: orderPathById(resolved.orderId),
      attachmentId: row.id,
      qrKind: resolved.qrKind,
      actor: apiKey.name,
    });
  } catch (e) {
    console.error("[scanner/ingest]", e);
    return NextResponse.json(
      {
        error: "server_error",
        details: errorMessage(e).slice(0, 500),
      },
      { status: 500 },
    );
  }
}
