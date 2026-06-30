/** Картинка во вложениях наряда: MIME или расширение (HEIC часто без корректного MIME). */
export function isOrderAttachmentImageFile(file: Pick<File, "type" | "name">): boolean {
  const t = (file.type || "").trim().toLowerCase();
  if (t.startsWith("image/")) return true;
  const n = (file.name || "").trim();
  return /\.(jpe?g|png|gif|webp|bmp|tif|tiff|heic|heif)$/i.test(n);
}

export function isHeicLikeOrderImage(file: Pick<File, "type" | "name">): boolean {
  const t = (file.type || "").trim().toLowerCase();
  if (t.includes("heic") || t.includes("heif")) return true;
  return /\.heic$|\.heif$/i.test((file.name || "").trim());
}
