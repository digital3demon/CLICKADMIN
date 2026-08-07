import "server-only";

import { createCanvas, loadImage } from "@napi-rs/canvas";
import {
  pickBestOrderNumberFromOcr,
  pickKaitenCardIdFromOcr,
} from "@/lib/scanner-ocr-order-parse";

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

export type ScannerOcrResult = {
  orderNumber: string | null;
  kaitenCardId: number | null;
  textPreview: string;
  ocrMs: number;
};

/**
 * OCR верхней части скана → номер YYMM-NNN и/или ID Kaiten.
 * Сначала eng (быстрее для цифр/URL), при нужде — rus+eng.
 */
export async function ocrOrderNumberFromScanImage(
  buf: Buffer,
): Promise<ScannerOcrResult> {
  const t0 = Date.now();
  const empty = (): ScannerOcrResult => ({
    orderNumber: null,
    kaitenCardId: null,
    textPreview: "",
    ocrMs: Date.now() - t0,
  });
  if (!OCR_ENABLED) return empty();

  let workBuf: Buffer = buf;
  try {
    const img = await loadImage(buf);
    const srcW = Math.max(1, Math.round(img.width));
    const srcH = Math.max(1, Math.round(img.height));
    const scale = Math.min(1, MAX_OCR_EDGE / Math.max(srcW, srcH));
    const w = Math.max(1, Math.round(srcW * scale));
    const h = Math.max(1, Math.round(srcH * scale));
    // Верхние ~40% — заголовок наряда / шапка Kaiten (номер + QR-зона)
    const topH = Math.max(1, Math.floor(h * 0.4));
    const canvas = createCanvas(w, topH);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, w, h, 0, 0, w, topH);
    workBuf = Buffer.from(canvas.toBuffer("image/jpeg", 78));
  } catch {
    workBuf = buf;
  }

  const budget = OCR_TIMEOUT_MS;
  let text = "";
  try {
    const { recognize } = await import("tesseract.js");
    // eng быстрее и лучше для 2607-390 / kaiten.ru/…
    const eng = await withTimeout(
      recognize(workBuf, "eng", { logger: () => undefined }),
      Math.min(12_000, budget),
      "SCANNER_OCR_ENG",
    );
    text = String(eng.data?.text ?? "");
    let orderNumber = pickBestOrderNumberFromOcr(text);
    let kaitenCardId = pickKaitenCardIdFromOcr(text);
    if (orderNumber || kaitenCardId) {
      return {
        orderNumber,
        kaitenCardId,
        textPreview: text.replace(/\s+/g, " ").trim().slice(0, 200),
        ocrMs: Date.now() - t0,
      };
    }
    const left = budget - (Date.now() - t0);
    if (left > 4000) {
      const rus = await withTimeout(
        recognize(workBuf, "rus+eng", { logger: () => undefined }),
        left,
        "SCANNER_OCR_RUS",
      );
      text = `${text}\n${String(rus.data?.text ?? "")}`;
      orderNumber = pickBestOrderNumberFromOcr(text);
      kaitenCardId = pickKaitenCardIdFromOcr(text);
    }
    return {
      orderNumber,
      kaitenCardId,
      textPreview: text.replace(/\s+/g, " ").trim().slice(0, 200),
      ocrMs: Date.now() - t0,
    };
  } catch (e) {
    console.warn("[scanner-ocr]", e instanceof Error ? e.message : e);
    return {
      orderNumber: pickBestOrderNumberFromOcr(text) || null,
      kaitenCardId: pickKaitenCardIdFromOcr(text) || null,
      textPreview: text.replace(/\s+/g, " ").trim().slice(0, 200),
      ocrMs: Date.now() - t0,
    };
  }
}
