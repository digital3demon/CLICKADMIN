/**
 * Превью вложений наряда для чата канбана / сетки.
 * Query: ?thumb=1. Оригинал без параметра (скачать / полноэкран).
 */

export const ORDER_ATTACHMENT_THUMB_QUERY = "thumb";
export const ORDER_ATTACHMENT_THUMB_VALUE = "1";
/** Ячейка чата ~1/3 колонки; 480 — запас под retina без оригинала с камеры. */
export const ORDER_ATTACHMENT_THUMB_MAX_EDGE = 480;

export function isOrderAttachmentThumbRequest(
  search: URLSearchParams | string | null | undefined,
): boolean {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search ?? new URLSearchParams();
  const v = params.get(ORDER_ATTACHMENT_THUMB_QUERY);
  return v === ORDER_ATTACHMENT_THUMB_VALUE || v === "true" || v === "yes";
}

/** Добавляет ?thumb=1 к URL `/attachments/` или `/kaiten/files/`; data: не трогает. */
export function withOrderAttachmentThumb(href: string): string {
  const raw = String(href || "").trim();
  if (!raw || raw.startsWith("data:")) return raw;
  if (!raw.includes("/attachments/") && !raw.includes("/kaiten/files/")) {
    return raw;
  }
  const q = raw.indexOf("?");
  const path = q >= 0 ? raw.slice(0, q) : raw;
  const params = new URLSearchParams(q >= 0 ? raw.slice(q + 1) : "");
  params.set(ORDER_ATTACHMENT_THUMB_QUERY, ORDER_ATTACHMENT_THUMB_VALUE);
  return `${path}?${params.toString()}`;
}
