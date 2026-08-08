/** Публичные фото наряда по QR этикетки (только image/* от книжного сканера). */

export function isPublicStickerHubImageMime(mimeType: string | null | undefined): boolean {
  const m = String(mimeType || "")
    .trim()
    .toLowerCase();
  return m.startsWith("image/");
}

/** Вложения для блока «Приняли и Отправили» — только scope SCANNER. */
export function isPublicStickerHubScannerScope(
  scope: string | null | undefined,
): boolean {
  return String(scope || "").trim().toUpperCase() === "SCANNER";
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
