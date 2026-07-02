/** Исходник с телефона/камеры — сжимаем на клиенте перед отправкой на сервер. */
export const REPLY_TEMPLATE_IMAGE_MAX_INPUT_BYTES = 30 * 1024 * 1024;

const INLINE_MAX_EDGE_PX = 800;
const INLINE_JPEG_QUALITY = 0.82;
const INLINE_MAX_BYTES = 120_000;

const UPLOAD_MAX_EDGE_PX = 1200;
const UPLOAD_JPEG_QUALITY = 0.85;
/** Запас до серверного лимита 5 МБ для INLINE_IMAGE. */
const UPLOAD_TARGET_BYTES = 900_000;

function assertImageFile(file: File): void {
  if (!file.type.startsWith("image/")) {
    throw new Error("Можно загрузить только изображение");
  }
}

function assertInputSize(file: File, maxBytes: number): void {
  if (file.size > maxBytes) {
    throw new Error(
      `Файл слишком большой (макс. ${Math.round(maxBytes / (1024 * 1024))} МБ)`,
    );
  }
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

async function renderScaledJpeg(
  file: File,
  maxEdgePx: number,
  initialQuality: number,
  targetBytes: number,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdgePx / Math.max(bitmap.width, bitmap.height));
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

  let quality = initialQuality;
  let blob = await canvasToJpegBlob(canvas, quality);
  while (blob.size > targetBytes && quality > 0.35) {
    quality -= 0.08;
    blob = await canvasToJpegBlob(canvas, quality);
  }
  return blob;
}

export function replyTemplateImageOutputName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").trim() || "image";
  return `${base}.jpg`;
}

/** Сжимает картинку для вставки в HTML-шаблон письма (data URL). */
export async function compressImageForEmail(file: File): Promise<string> {
  assertImageFile(file);
  assertInputSize(file, REPLY_TEMPLATE_IMAGE_MAX_INPUT_BYTES);

  const blob = await renderScaledJpeg(
    file,
    INLINE_MAX_EDGE_PX,
    INLINE_JPEG_QUALITY,
    INLINE_MAX_BYTES,
  );
  if (blob.size > INLINE_MAX_BYTES) {
    throw new Error("Изображение слишком большое даже после сжатия — уменьшите файл");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Не удалось прочитать изображение"));
    };
    reader.onerror = () => reject(new Error("Не удалось прочитать изображение"));
    reader.readAsDataURL(blob);
  });
}

/** Сжимает фото перед загрузкой в assets шаблона автоответа (hero/image/лого). */
export async function compressImageForReplyTemplateUpload(file: File): Promise<File> {
  assertImageFile(file);
  assertInputSize(file, REPLY_TEMPLATE_IMAGE_MAX_INPUT_BYTES);

  const blob = await renderScaledJpeg(
    file,
    UPLOAD_MAX_EDGE_PX,
    UPLOAD_JPEG_QUALITY,
    UPLOAD_TARGET_BYTES,
  );
  if (blob.size > 5 * 1024 * 1024) {
    throw new Error("Изображение слишком большое даже после сжатия — уменьшите файл");
  }

  return new File([blob], replyTemplateImageOutputName(file.name), {
    type: "image/jpeg",
  });
}
