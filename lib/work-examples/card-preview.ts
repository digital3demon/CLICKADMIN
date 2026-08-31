/**
 * Превью плитки портфолио: не оригинал.
 * Канон в URL: ?preview=card. На диске/S3 — соседний файл *.card.jpg.
 * Timezone не используется. Без превью отдаём оригинал.
 */

export const WORK_EXAMPLE_CARD_PREVIEW_QUERY = "preview";
export const WORK_EXAMPLE_CARD_PREVIEW_VALUE = "card";
export const WORK_EXAMPLE_CARD_PREVIEW_SUFFIX = ".card.jpg";
/** Карточка ~30rem, 2x ≈ 960; 720 — запас без тяжёлого JPEG. */
export const WORK_EXAMPLE_CARD_PREVIEW_MAX_EDGE = 720;

export function isWorkExampleCardPreviewRequest(
  search: URLSearchParams | string | null | undefined,
): boolean {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search ?? new URLSearchParams();
  return params.get(WORK_EXAMPLE_CARD_PREVIEW_QUERY) === WORK_EXAMPLE_CARD_PREVIEW_VALUE;
}

export function workExampleCardPreviewRelPath(diskRelPath: string): string {
  const rel = String(diskRelPath || "").trim();
  if (!rel || rel.endsWith(WORK_EXAMPLE_CARD_PREVIEW_SUFFIX)) return rel;
  return `${rel}${WORK_EXAMPLE_CARD_PREVIEW_SUFFIX}`;
}

export function workExampleFileHref(
  exampleId: string,
  fileId: string,
  opts?: { preview?: boolean },
): string {
  const base = `/api/work-examples/${encodeURIComponent(exampleId)}/files/${encodeURIComponent(fileId)}`;
  return opts?.preview
    ? `${base}?${WORK_EXAMPLE_CARD_PREVIEW_QUERY}=${WORK_EXAMPLE_CARD_PREVIEW_VALUE}`
    : base;
}

export function withWorkExampleCardPreview(href: string): string {
  const raw = String(href || "").trim();
  if (!raw) return raw;
  const q = raw.indexOf("?");
  const path = q >= 0 ? raw.slice(0, q) : raw;
  const params = new URLSearchParams(q >= 0 ? raw.slice(q + 1) : "");
  params.set(WORK_EXAMPLE_CARD_PREVIEW_QUERY, WORK_EXAMPLE_CARD_PREVIEW_VALUE);
  return `${path}?${params.toString()}`;
}
