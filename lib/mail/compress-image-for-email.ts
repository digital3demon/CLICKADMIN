const MAX_EDGE_PX = 800;
const JPEG_QUALITY = 0.82;
const MAX_BYTES = 120_000;

/** Сжимает картинку для вставки в HTML-шаблон письма (data URL). */
export async function compressImageForEmail(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Можно вставить только изображение");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Файл слишком большой (макс. 5 МБ)");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Не удалось обработать изображение");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = JPEG_QUALITY;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > MAX_BYTES * 1.37 && quality > 0.35) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrl.length > MAX_BYTES * 1.37) {
    throw new Error("Изображение слишком большое даже после сжатия — уменьшите файл");
  }
  return dataUrl;
}
