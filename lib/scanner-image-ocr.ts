import "server-only";

import { createCanvas, loadImage } from "@napi-rs/canvas";
import { pickBestOrderNumberFromOcr } from "@/lib/scanner-ocr-order-parse";

const MAX_OCR_EDGE = 1200;
/** Жёсткий потолок: иначе nginx отдаёт 502, пока tesseract думает. */
const OCR_TIMEOUT_MS = Number(process.env.SCANNER_OCR_TIMEOUT_MS) || 18_000;
const OCR_ENABLED =
  String(process.env.SCANNER_OCR_ENABLED ?? "1").trim() !== "0";

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`${label}_TIMEOUT_${ms}`));
    }, ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/**
 * OCR верхней части скана (там наряд) → номер YYMM-NNN или null.
 * Использует tesseract.js (rus+eng), как bank-import.
 * Карта: буфер → jpeg верх → recognize с таймаутом → pickBestOrderNumber.
 */
export async function ocrOrderNumberFromScanImage(
  buf: Buffer,
): Promise<{ orderNumber: string | null; textPreview: string; ocrMs: number }> {
  const t0 = Date.now();
  if (!OCR_ENABLED) {
    return { orderNumber: null, textPreview: "", ocrMs: 0 };
  }
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
    workBuf = Buffer.from(canvas.toBuffer("image/jpeg", 80));
  } catch {
    workBuf = buf;
  }

  try {
    const { recognize } = await import("tesseract.js");
    const result = await withTimeout(
      recognize(workBuf, "rus+eng", {
        logger: () => undefined,
      }),
      OCR_TIMEOUT_MS,
      "SCANNER_OCR",
    );
    const text = String(result.data?.text ?? "");
    const orderNumber = pickBestOrderNumberFromOcr(text);
    return {
      orderNumber,
      textPreview: text.replace(/\s+/g, " ").trim().slice(0, 200),
      ocrMs: Date.now() - t0,
    };
  } catch (e) {
    console.warn("[scanner-ocr]", e instanceof Error ? e.message : e);
    return { orderNumber: null, textPreview: "", ocrMs: Date.now() - t0 };
  }
}
