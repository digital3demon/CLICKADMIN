/** Какие вложения попадают в дамп CRM: только картинки. PDF/документы — нет. */

const IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
]);

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp)$/i;

export function isCrmDumpImageAttachment(params: {
  mimeType?: string | null;
  fileName?: string | null;
}): boolean {
  const mime = String(params.mimeType ?? "")
    .trim()
    .toLowerCase()
    .split(";")[0]!
    .trim();
  if (mime.startsWith("image/") && IMAGE_MIME.has(mime)) return true;
  if (mime.startsWith("image/") && !mime.includes("svg")) return true;
  const name = String(params.fileName ?? "").trim();
  if (IMAGE_EXT.test(name) && !/\.pdf$/i.test(name)) return true;
  return false;
}

/** Расширение файла в zip вложений дампа. */
export function crmDumpAttachmentExt(mimeType: string, fileName: string): string {
  const mime = mimeType.toLowerCase();
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (/\.png$/i.test(fileName)) return "png";
  if (/\.webp$/i.test(fileName)) return "webp";
  return "jpg";
}
