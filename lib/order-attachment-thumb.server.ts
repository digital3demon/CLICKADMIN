import "server-only";

import { createCanvas, loadImage } from "@napi-rs/canvas";
import { ORDER_ATTACHMENT_THUMB_MAX_EDGE } from "@/lib/order-attachment-thumb";

/**
 * JPEG-превью для чата. HEIC/битый буфер → null (роут отдаст оригинал).
 */
export async function buildOrderAttachmentThumbJpeg(
  bytes: Buffer,
  maxEdge = ORDER_ATTACHMENT_THUMB_MAX_EDGE,
): Promise<Buffer | null> {
  if (!bytes.length) return null;
  let img;
  try {
    img = await loadImage(bytes);
  } catch {
    return null;
  }
  const srcW = Math.max(1, Math.round(img.width));
  const srcH = Math.max(1, Math.round(img.height));
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  if (scale >= 0.98 && bytes.length < 180_000) {
    /* Уже мелкое — не гоняем canvas. */
    return null;
  }
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  return Buffer.from(canvas.toBuffer("image/jpeg", 72));
}
