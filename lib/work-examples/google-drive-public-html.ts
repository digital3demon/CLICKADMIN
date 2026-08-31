/**
 * Разбор публичной страницы папки Google Drive (embeddedfolderview / folders).
 * Имена с кириллицей — из title/текста ссылки, не из \\b.
 */

export type GoogleDrivePublicHtmlEntry = {
  id: string;
  name: string;
  kind: "file" | "folder";
};

const DRIVE_ID = "[A-Za-z0-9_-]{16,80}";

function decodeHtml(raw: string): string {
  return raw
    .replace(/&amp;/giu, "&")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;/giu, "'")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">");
}

function push(
  out: GoogleDrivePublicHtmlEntry[],
  seen: Set<string>,
  id: string,
  name: string,
  kind: "file" | "folder",
) {
  if (seen.has(id)) {
    const prev = out.find((x) => x.id === id);
    if (prev && (!prev.name || prev.name === id) && name && name !== id) prev.name = name;
    return;
  }
  seen.add(id);
  out.push({ id, name: name || id, kind });
}

export function parseGoogleDrivePublicListingHtml(html: string): GoogleDrivePublicHtmlEntry[] {
  const text = String(html || "");
  const out: GoogleDrivePublicHtmlEntry[] = [];
  const seen = new Set<string>();

  const fileHref = new RegExp(
    `href=["']https?:\\/\\/drive\\.google\\.com\\/file\\/d\\/(${DRIVE_ID})[^"']*["']([^>]*)>([^<]*)<`,
    "giu",
  );
  let m: RegExpExecArray | null;
  while ((m = fileHref.exec(text))) {
    const id = m[1]!;
    const attrs = m[2] || "";
    const body = decodeHtml((m[3] || "").trim());
    const title = /title=["']([^"']+)["']/iu.exec(attrs);
    const name = decodeHtml(title?.[1] || "") || body || id;
    push(out, seen, id, name, "file");
  }

  const fileOnly = new RegExp(`\\/file\\/d\\/(${DRIVE_ID})`, "gu");
  while ((m = fileOnly.exec(text))) {
    push(out, seen, m[1]!, m[1]!, "file");
  }

  const folderHref = new RegExp(`\\/drive\\/folders\\/(${DRIVE_ID})`, "gu");
  while ((m = folderHref.exec(text))) {
    push(out, seen, m[1]!, m[1]!, "folder");
  }

  const flip = new RegExp(
    `id=["']entry-(${DRIVE_ID})["'][^>]*title=["']([^"']+)["']`,
    "giu",
  );
  while ((m = flip.exec(text))) {
    push(out, seen, m[1]!, decodeHtml(m[2] || ""), "file");
  }

  const titledFile = new RegExp(
    `title=["']([^"']+\\.(?:jpe?g|png|gif|webp|heic|bmp))["'][^>]{0,180}?\\/file\\/d\\/(${DRIVE_ID})`,
    "giu",
  );
  while ((m = titledFile.exec(text))) {
    push(out, seen, m[2]!, decodeHtml(m[1] || ""), "file");
  }

  const flipTitle = new RegExp(
    `id=["']entry-(${DRIVE_ID})["'][\\s\\S]{0,1200}?flip-entry-title[^>]*>([^<]+)`,
    "giu",
  );
  while ((m = flipTitle.exec(text))) {
    push(out, seen, m[1]!, decodeHtml((m[2] || "").trim()), "file");
  }

  const idThenName = new RegExp(
    `"(${DRIVE_ID})"\\s*,\\s*"([^"]{1,200}?\\.(?:jpe?g|png|gif|webp|heic|bmp))"`,
    "giu",
  );
  while ((m = idThenName.exec(text))) {
    push(out, seen, m[1]!, decodeHtml(m[2] || ""), "file");
  }

  const nameThenId = new RegExp(
    `"([^"]{1,200}?\\.(?:jpe?g|png|gif|webp|heic|bmp))"\\s*,\\s*"(${DRIVE_ID})"`,
    "giu",
  );
  while ((m = nameThenId.exec(text))) {
    push(out, seen, m[2]!, decodeHtml(m[1] || ""), "file");
  }

  return out;
}
