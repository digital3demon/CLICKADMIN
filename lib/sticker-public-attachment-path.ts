/** Публичные фото наряда по QR этикетки (image/*; без платёжек). */

export function isPublicStickerHubImageMime(mimeType: string | null | undefined): boolean {
  const m = String(mimeType || "")
    .trim()
    .toLowerCase();
  return m.startsWith("image/");
}

/**
 * Вложения для блока «Приняли и Отправили»:
 * — SCANNER (книжный сканер);
 * — GENERAL (фото с телефона / канбана — часто тоже «приём/отправка»).
 * PAYMENT_SLIP и прочее — нет.
 */
export function isPublicStickerHubAttachmentScope(
  scope: string | null | undefined,
): boolean {
  const s = String(scope || "").trim().toUpperCase();
  return s === "SCANNER" || s === "GENERAL";
}

/** @deprecated Используйте isPublicStickerHubAttachmentScope */
export function isPublicStickerHubScannerScope(
  scope: string | null | undefined,
): boolean {
  return isPublicStickerHubAttachmentScope(scope);
}

export function stickerPublicAttachmentPath(
  tenantSlug: string,
  token: string,
  attachmentId: string,
): string {
  const s = encodeURIComponent(String(tenantSlug || "").trim());
  const t = encodeURIComponent(String(token || "").trim());
  const a = encodeURIComponent(String(attachmentId || "").trim());
  return `/api/public/sticker/${s}/${t}/attachments/${a}`;
}
