import "server-only";

import { createCanvas, loadImage } from "@napi-rs/canvas";
import jsQR from "jsqr";

const SCANNER_MAX_DECODE_EDGE = 2000;

export type ImageMagicKind = "jpeg" | "png" | "webp" | "tiff" | "gif" | null;

export function detectImageMagic(buf: Buffer): ImageMagicKind {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "png";
  }
  if (
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38
  ) {
    return "gif";
  }
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "webp";
  }
  // TIFF little/big endian
  if (
    (buf[0] === 0x49 && buf[1] === 0x49 && buf[2] === 0x2a && buf[3] === 0x00) ||
    (buf[0] === 0x4d && buf[1] === 0x4d && buf[2] === 0x00 && buf[3] === 0x2a)
  ) {
    return "tiff";
  }
  return null;
}

export function mimeForImageMagic(kind: ImageMagicKind): string {
  switch (kind) {
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "tiff":
      return "image/tiff";
    case "gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

function decodeQrFromRgba(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): string | null {
  const result = jsQR(data, width, height, {
    inversionAttempts: "attemptBoth",
  });
  const text = result?.data?.trim() ?? "";
  return text || null;
}

/**
 * Декодирует QR с изображения сканера (документ обычно в верхней половине).
 * TIFF через canvas может не открыться — тогда null.
 */
export async function decodeQrFromImageBuffer(
  buf: Buffer,
): Promise<string | null> {
  const kind = detectImageMagic(buf);
  if (!kind || kind === "tiff") {
    // @napi-rs/canvas обычно не декодирует TIFF; клиент (Python) уже мог прочитать QR
    if (kind === "tiff") return null;
    if (!kind) return null;
  }

  let img;
  try {
    img = await loadImage(buf);
  } catch {
    return null;
  }

  const srcW = Math.max(1, Math.round(img.width));
  const srcH = Math.max(1, Math.round(img.height));
  const scale = Math.min(1, SCANNER_MAX_DECODE_EDGE / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const full = createCanvas(w, h);
  const ctx = full.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  const fullData = ctx.getImageData(0, 0, w, h);
  const fromFull = decodeQrFromRgba(
    fullData.data as unknown as Uint8ClampedArray,
    w,
    h,
  );
  if (fromFull) return fromFull;

  // Верхняя половина — наряд/этикетка на книжных сканах
  const topH = Math.max(1, Math.floor(h / 2));
  const top = createCanvas(w, topH);
  const tctx = top.getContext("2d");
  tctx.drawImage(full, 0, 0, w, topH, 0, 0, w, topH);
  const topData = tctx.getImageData(0, 0, w, topH);
  const fromTop = decodeQrFromRgba(
    topData.data as unknown as Uint8ClampedArray,
    w,
    topH,
  );
  if (fromTop) return fromTop;

  // Правый верх (QR на печатном наряде обычно справа)
  const qx = Math.floor(w * 0.45);
  const qw = Math.max(1, w - qx);
  const qh = Math.max(1, Math.floor(h * 0.45));
  const corner = createCanvas(qw, qh);
  const cctx = corner.getContext("2d");
  cctx.drawImage(full, qx, 0, qw, qh, 0, 0, qw, qh);
  const cornerData = cctx.getImageData(0, 0, qw, qh);
  return decodeQrFromRgba(
    cornerData.data as unknown as Uint8ClampedArray,
    qw,
    qh,
  );
}
