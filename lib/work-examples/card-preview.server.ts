import "server-only";

import { createCanvas, loadImage } from "@napi-rs/canvas";
import {
  WORK_EXAMPLE_CARD_PREVIEW_MAX_EDGE,
  workExampleCardPreviewRelPath,
} from "@/lib/work-examples/card-preview";
import {
  readWorkExampleFileBytes,
  writeWorkExampleBytesAtRel,
} from "@/lib/work-examples/storage";

/**
 * JPEG для плитки. Не декодируется (HEIC/TIFF) → null, роут отдаст оригинал.
 */
export async function buildWorkExampleCardPreviewJpeg(
  bytes: Buffer,
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
  const scale = Math.min(1, WORK_EXAMPLE_CARD_PREVIEW_MAX_EDGE / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  return Buffer.from(canvas.toBuffer("image/jpeg", 78));
}

export async function readOrCreateWorkExampleCardPreview(
  diskRelPath: string,
): Promise<Buffer | null> {
  const previewRel = workExampleCardPreviewRelPath(diskRelPath);
  const cached = await readWorkExampleFileBytes(previewRel);
  if (cached && cached.length > 32) return cached;

  const original = await readWorkExampleFileBytes(diskRelPath);
  if (!original) return null;
  const started = Date.now();
  const jpeg = await buildWorkExampleCardPreviewJpeg(original);
  if (!jpeg) return null;
  try {
    await writeWorkExampleBytesAtRel(previewRel, jpeg, "image/jpeg");
  } catch (e) {
    console.warn(
      JSON.stringify({
        evt: "work_example_card_preview_write_fail",
        details: e instanceof Error ? e.message.slice(0, 160) : "write",
      }),
    );
  }
  console.info(
    JSON.stringify({
      evt: "work_example_card_preview_build",
      srcBytes: original.length,
      previewBytes: jpeg.length,
      ms: Date.now() - started,
    }),
  );
  return jpeg;
}

export async function ensureWorkExampleCardPreview(diskRelPath: string): Promise<void> {
  try {
    await readOrCreateWorkExampleCardPreview(diskRelPath);
  } catch {
    /* плитка соберёт при GET */
  }
}
