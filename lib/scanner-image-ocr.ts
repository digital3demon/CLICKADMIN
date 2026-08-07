import "server-only";

import { createCanvas, loadImage } from "@napi-rs/canvas";
import { pickBestOrderNumberFromOcr } from "@/lib/scanner-ocr-order-parse";

const MAX_OCR_EDGE = 1800;

/**
 * OCR верхней части скана (там наряд) → номер YYMM-NNN или null.
 * Использует tesseract.js (rus+eng), как bank-import.
 */
export async function ocrOrderNumberFromScanImage(
  buf: Buffer,
): Promise<{ orderNumber: string | null; textPreview: string; ocrMs: number }> {
  const t0 = Date.now();
  let workBuf: Buffer = buf;
  try {
    const img = await loadImage(buf);
    const srcW = Math.max(1, Math.round(img.width));
    const srcH = Math.max(1, Math.round(img.height));
    const scale = Math.min(1, MAX_OCR_EDGE / Math.max(srcW, srcH));
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));
    // Верхние ~55% — лист с текстом наряда
    const topH = Math.max(1, Math.floor(h * 0.55));
    const canvas = createCanvas(w, topH);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h, 0, 0, w, topH);
    workBuf = Buffer.from(canvas.toBuffer("image/jpeg", 85));
  } catch {
    // TIFF / сбой canvas — OCR по исходному буферу
    workBuf = buf;
  }

  try {
    const { recognize } = await import("tesseract.js");
    const result = await recognize(workBuf, "rus+eng");
    const text = String(result.data?.text ?? "");
    const orderNumber = pickBestOrderNumberFromOcr(text);
    return {
      orderNumber,
      textPreview: text.replace(/\s+/g, " ").trim().slice(0, 200),
      ocrMs: Date.now() - t0,
    };
  } catch (e) {
    console.warn("[scanner-ocr]", e);
    return { orderNumber: null, textPreview: "", ocrMs: Date.now() - t0 };
  }
}
