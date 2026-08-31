/**
 * Что считаем фото при импорте из облака.
 * Расширение — хвост после точки, не \\b: кириллица в имени не ломает матч.
 * В папке может быть что угодно (архив, КТ, pdf) — берём только картинки со своим названием.
 */

const PHOTO_EXT_RE = /\.(jpe?g|png|gif|webp|heic|heif|bmp|tif|tiff)$/iu;
/** Стем похож на Drive id, не на IMG_3480 / «кт до». */
const DRIVE_LIKE_STEM_RE = /^[A-Za-z0-9_-]{16,}$/u;
/** Не фото, даже если MIME вдруг image/*. */
const NOT_PHOTO_EXT_RE =
  /\.(zip|rar|7z|tar|gz|tgz|dcm|dicom|pdf|stl|ply|obj|3mf|drc|html?|docx?|xlsx?|exe)$/iu;

export function isCloudFolderPhoto(input: { name?: string; mime?: string }): boolean {
  const name = String(input.name || "");
  if (NOT_PHOTO_EXT_RE.test(name)) return false;
  const mime = String(input.mime || "").trim().toLowerCase();
  if (mime.startsWith("image/") && !mime.includes("svg")) return true;
  return PHOTO_EXT_RE.test(name);
}

/** Картинка с настоящим именем: архивы/КТ/pdf в той же папке пропускаем. */
export function shouldImportCloudFolderPhoto(input: { name?: string; mime?: string }): boolean {
  return hasCloudFolderPhotoName(input.name) && isCloudFolderPhoto(input);
}

/** Есть настоящее имя файла-фото, не пустышка и не id облака. */
export function hasCloudFolderPhotoName(name: unknown): boolean {
  const raw = String(name ?? "").replace(/[/\\]+/g, " ").trim();
  if (!raw || !PHOTO_EXT_RE.test(raw)) return false;
  const stem = raw.replace(PHOTO_EXT_RE, "").trim();
  if (!stem || stem.toLowerCase() === "фото") return false;
  if (DRIVE_LIKE_STEM_RE.test(stem)) return false;
  return true;
}

/** Подпись на витрине: кириллица в стеме, расширение не показываем. */
export function workExamplePhotoCaption(fileName: unknown): string {
  const raw = String(fileName ?? "").replace(/[/\\]+/g, " ").trim();
  if (!raw) return "";
  const stem = raw.replace(PHOTO_EXT_RE, "").trim();
  return (stem || raw).slice(0, 160);
}

export function cloudFolderPhotoFileName(raw: string, fallback: string): string {
  const name = String(raw || "").replace(/[/\\]+/g, "_").trim() || fallback;
  return name.slice(0, 240);
}

export function uniqueCloudFolderFileName(name: string, usedLower: Set<string>): string {
  const base = cloudFolderPhotoFileName(name, "фото.jpg");
  const lower = base.toLowerCase();
  if (!usedLower.has(lower)) {
    usedLower.add(lower);
    return base;
  }
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";
  for (let n = 2; n < 200; n += 1) {
    const next = `${stem}-${n}${ext}`.slice(0, 240);
    const key = next.toLowerCase();
    if (!usedLower.has(key)) {
      usedLower.add(key);
      return next;
    }
  }
  const last = `${stem}-${Date.now()}${ext}`.slice(0, 240);
  usedLower.add(last.toLowerCase());
  return last;
}
