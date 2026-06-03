/** PDF — сохранить как файл счёта (бух-логика, разбор номера и т.д.). */
export function looksLikePdfFile(file: File): boolean {
  if ((file.type || "").trim().toLowerCase() === "application/pdf") {
    return true;
  }
  return /\.pdf$/i.test((file.name || "").trim());
}

/** Изображение платёжки (скрин, фото экрана) — без разбора PDF. */
export function looksLikePaymentSlipImageFile(file: File): boolean {
  const t = (file.type || "").trim().toLowerCase();
  if (t.startsWith("image/")) return true;
  const n = (file.name || "").trim();
  return /\.(jpe?g|png|gif|webp|bmp|tif|heic|heif)$/i.test(n);
}

/** Платёжка: скрин/фото или PDF банковской выписки (без разбора как счёт). */
export function looksLikePaymentSlipFile(file: File): boolean {
  return looksLikePaymentSlipImageFile(file) || looksLikePdfFile(file);
}
