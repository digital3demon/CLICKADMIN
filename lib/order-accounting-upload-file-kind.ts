/** PDF — сохранить как файл счёта (бух-логика, разбор номера и т.д.). */
export function looksLikePdfFile(file: File): boolean {
  const t = (file.type || "").trim().toLowerCase();
  if (
    t === "application/pdf" ||
    t === "application/x-pdf" ||
    t.includes("pdf")
  ) {
    return true;
  }
  return /\.pdf$/i.test((file.name || "").trim());
}

/** Сигнатура %PDF — банковские выписки часто идут как octet-stream без .pdf в имени. */
export async function looksLikePdfFileDeep(file: File): Promise<boolean> {
  if (looksLikePdfFile(file)) return true;
  try {
    const buf = await file.slice(0, 5).arrayBuffer();
    const head = new TextDecoder("ascii").decode(new Uint8Array(buf));
    return head.startsWith("%PDF");
  } catch {
    return false;
  }
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

export async function looksLikePaymentSlipFileDeep(
  file: File,
): Promise<boolean> {
  if (looksLikePaymentSlipImageFile(file)) return true;
  return looksLikePdfFileDeep(file);
}
