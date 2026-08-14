import "server-only";

import { createCanvas, loadImage } from "@napi-rs/canvas";
import jsQR from "jsqr";
import { pickPreferredScannerQr } from "@/lib/scanner-qr-parse";

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

  const found: string[] = [];
  const pushCrop = (sx: number, sy: number, sw: number, sh: number) => {
    const cw = Math.max(1, sw);
    const ch = Math.max(1, sh);
    const c = createCanvas(cw, ch);
    const cctx = c.getContext("2d");
    cctx.drawImage(full, sx, sy, cw, ch, 0, 0, cw, ch);
    const data = cctx.getImageData(0, 0, cw, ch);
    const text = decodeQrFromRgba(
      data.data as unknown as Uint8ClampedArray,
      cw,
      ch,
    );
    if (text) found.push(text);
  };

  pushCrop(0, 0, w, h);
  // Книжный скан: шапка сверху; фото отгрузки: этикетка часто справа снизу
  const topH = Math.max(1, Math.floor(h / 2));
  pushCrop(0, 0, w, topH);
  pushCrop(0, topH, w, h - topH);
  const qx = Math.floor(w * 0.45);
  const qw = Math.max(1, w - qx);
  pushCrop(qx, 0, qw, Math.max(1, Math.floor(h * 0.45)));
  pushCrop(qx, Math.floor(h * 0.45), qw, Math.max(1, h - Math.floor(h * 0.45)));

  return pickPreferredScannerQr(found);
}
