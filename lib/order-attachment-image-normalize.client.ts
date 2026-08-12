/**
 * Сжатие/конвертация фото перед загрузкой в наряд.
 * Большие JPEG с камеры и HEIC (после конвертации) — меньше сбой на прокси и стабильнее превью в CRM.
 */
import {
  isHeicLikeOrderImage,
  isOrderAttachmentImageFile,
} from "@/lib/order-attachment-image-kind";

/** Скриншоты обычно меньше — не трогаем. */
export const ORDER_IMAGE_NORMALIZE_MIN_BYTES = Math.round(1.5 * 1024 * 1024);

/** Согласовано с scripts/nginx-dental-lab-crm.example.conf (client_max_body_size 50m). */
export const ORDER_IMAGE_MAX_INPUT_BYTES = 50 * 1024 * 1024;

const MAX_EDGE_PX = 2400;
const JPEG_QUALITY = 0.86;
/** Запас под nginx и быструю загрузку; качество для зубных фото достаточное. */
const TARGET_BYTES = 3 * 1024 * 1024;

export function shouldNormalizeOrderAttachmentImage(
  file: Pick<File, "type" | "name" | "size">,
): boolean {
  if (!isOrderAttachmentImageFile(file)) return false;
  if (isHeicLikeOrderImage(file)) return true;
  const t = (file.type || "").toLowerCase();
  if (t === "image/jpeg" && /\.jpe?g$/i.test(file.name) && file.size <= TARGET_BYTES) {
    return false;
  }
  return file.size > ORDER_IMAGE_NORMALIZE_MIN_BYTES;
}

export function orderAttachmentImageOutputName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim() || "photo";
  return `${base}.jpg`;
}

/** Не даём UI зависнуть на «Загрузка…», если decode/toBlob не отвечает. */
const NORMALIZE_STEP_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label}_TIMEOUT`));
    }, ms);
    promise.then(
      (v) => {
        window.clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        window.clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Не удалось сжать изображение")),
      "image/jpeg",
      quality,
    );
  });
}

export async function normalizeOrderAttachmentImage(file: File): Promise<File> {
  if (!shouldNormalizeOrderAttachmentImage(file)) return file;
  if (file.size > ORDER_IMAGE_MAX_INPUT_BYTES) {
    throw new Error(
      `Файл слишком большой (макс. ${Math.round(ORDER_IMAGE_MAX_INPUT_BYTES / (1024 * 1024))} МБ)`,
    );
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await withTimeout(
      createImageBitmap(file),
      NORMALIZE_STEP_TIMEOUT_MS,
      "IMAGE_DECODE",
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "IMAGE_DECODE_TIMEOUT") {
      // Браузер завис на decode — лучше отдать оригинал, чем крутить спиннер вечно.
      return file;
    }
    if (isHeicLikeOrderImage(file)) {
      throw new Error(
        "Формат HEIC не открывается в этом браузере. Сохраните фото как JPEG или вставьте скриншот.",
      );
    }
    throw new Error("Не удалось прочитать изображение — попробуйте JPEG или PNG");
  }

  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Не удалось обработать изображение");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  try {
    let quality = JPEG_QUALITY;
    let blob = await withTimeout(
      canvasToJpegBlob(canvas, quality),
      NORMALIZE_STEP_TIMEOUT_MS,
      "IMAGE_ENCODE",
    );
    while (blob.size > TARGET_BYTES && quality > 0.4) {
      quality -= 0.07;
      blob = await withTimeout(
        canvasToJpegBlob(canvas, quality),
        NORMALIZE_STEP_TIMEOUT_MS,
        "IMAGE_ENCODE",
      );
    }

    return new File([blob], orderAttachmentImageOutputName(file.name), {
      type: "image/jpeg",
      lastModified: file.lastModified || Date.now(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "IMAGE_ENCODE_TIMEOUT") return file;
    throw e;
  }
}

export async function normalizeOrderAttachmentImages(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const file of files) {
    out.push(await normalizeOrderAttachmentImage(file));
  }
  return out;
}
