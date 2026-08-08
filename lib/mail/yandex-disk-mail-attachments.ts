/**
 * Карта: крупные вложения Яндекс.Почта переносит на Диск и пишет уведомление в тело;
 * в EmailAttachment попадают только MIME-части (обычно мелкий PDF). Здесь из text/html
 * достаём имена/размеры из notice и URL disk.yandex / yadi.sk → виртуальные «вложения».
 */

import { cleanMailTextBody, mailHtmlToText } from "@/lib/mail/mail-text-cleanup";
import { PLAIN_TEXT_URL_RE, trimTrailingUrlPunctuation } from "@/lib/linkify-plain-text";

export type YandexDiskMailAttachment = {
  fileName: string;
  size: number;
  url: string | null;
};

export type MimeMailAttachmentLike = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export type MergedMailAttachment = MimeMailAttachmentLike & {
  /** Ссылка на Яндекс.Диск; при наличии скачивание идёт с Диска, не через /api/mail/.../attachments. */
  externalUrl?: string | null;
};

/** Кириллица вокруг фразы — без \\b. */
const YANDEX_DISK_NOTICE_RE = /к письму приложены файлы на яндекс\s*диске\s*:/iu;

/**
 * Имя файла + размер в байтах. Граница по началу/концу строки или пробелу после «:»;
 * \\b после кириллицы не работает — опираемся на расширение и скобки с ≥4 цифрами.
 */
const FILE_SIZE_ENTRY_RE = /([^\n\r]+?\.[A-Za-z0-9]{1,8})\s*\((\d{4,})\)/gu;

const YANDEX_DISK_URL_HOST_RE =
  /^https?:\/\/(?:disk\.yandex\.(?:ru|com)|yadi\.sk)\//iu;

const HTML_YANDEX_HREF_RE =
  /href\s*=\s*["'](https?:\/\/(?:disk\.yandex\.(?:ru|com)|yadi\.sk)[^"'\s>]+)["']/giu;

const VIRTUAL_ID_PREFIX = "yandex-disk:";

export function isYandexDiskVirtualAttachmentId(id: string): boolean {
  return id.startsWith(VIRTUAL_ID_PREFIX);
}

export function isYandexDiskUrl(url: string): boolean {
  return YANDEX_DISK_URL_HOST_RE.test(url.trim());
}

function normalizeFileNameKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeUrlKey(url: string): string {
  return trimTrailingUrlPunctuation(url.trim()).href.toLowerCase();
}

function mimeFromFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "rar") return "application/vnd.rar";
  if (ext === "zip" || ext === "7z") return "application/zip";
  if (ext === "pdf") return "application/pdf";
  if (ext === "stl") return "model/stl";
  return "application/octet-stream";
}

function labelFromDiskUrl(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "");
    const last = path.split("/").filter(Boolean).pop();
    if (last && last.length > 1 && last.length < 80) return `Яндекс.Диск (${last})`;
  } catch {
    /* ignore */
  }
  return "Яндекс.Диск";
}

function collectYandexUrlsFromText(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(PLAIN_TEXT_URL_RE)) {
    const raw = match[0];
    if (!raw) continue;
    const href = trimTrailingUrlPunctuation(raw).href;
    if (!isYandexDiskUrl(href)) continue;
    const key = normalizeUrlKey(href);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(href);
  }
  return out;
}

function collectYandexUrlsFromHtml(html: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const match of html.matchAll(HTML_YANDEX_HREF_RE)) {
    const raw = match[1];
    if (!raw) continue;
    const href = trimTrailingUrlPunctuation(raw).href;
    if (!isYandexDiskUrl(href)) continue;
    const key = normalizeUrlKey(href);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(href);
  }
  return out;
}

/** Файлы из блока «К письму приложены файлы на Яндекс Диске: …». */
export function extractYandexDiskNoticeFiles(
  text: string,
): Array<{ fileName: string; size: number }> {
  const notice = YANDEX_DISK_NOTICE_RE.exec(text);
  if (!notice || notice.index == null) return [];

  const after = text.slice(notice.index + notice[0].length);
  const endBlank = after.search(/\n\s*\n/);
  const region = endBlank >= 0 ? after.slice(0, endBlank) : after;

  const files: Array<{ fileName: string; size: number }> = [];
  const seen = new Set<string>();
  for (const match of region.matchAll(FILE_SIZE_ENTRY_RE)) {
    const rawName = match[1]?.trim();
    const sizeRaw = match[2];
    if (!rawName || !sizeRaw) continue;
    // отрезать хвост вида «…Диске: имя.rar» если матч захватил префикс до двоеточия
    const fileName = rawName.includes(":")
      ? rawName.slice(rawName.lastIndexOf(":") + 1).trim()
      : rawName;
    if (!fileName || !/\.[A-Za-z0-9]{1,8}$/.test(fileName)) continue;
    const size = Number(sizeRaw);
    if (!Number.isFinite(size) || size <= 0) continue;
    const key = normalizeFileNameKey(fileName);
    if (seen.has(key)) continue;
    seen.add(key);
    files.push({ fileName, size });
  }
  return files;
}

export function extractYandexDiskAttachmentsFromMail(input: {
  textBody?: string | null;
  htmlBody?: string | null;
}): YandexDiskMailAttachment[] {
  const rawText = input.textBody?.trim() || "";
  const rawHtml = input.htmlBody?.trim() || "";
  const text =
    cleanMailTextBody(rawText) ||
    mailHtmlToText(rawHtml) ||
    rawText ||
    "";

  const files = extractYandexDiskNoticeFiles(text);
  const urls = [
    ...collectYandexUrlsFromText(text),
    ...collectYandexUrlsFromHtml(rawHtml),
  ].filter((url, index, arr) => {
    const key = normalizeUrlKey(url);
    return arr.findIndex((u) => normalizeUrlKey(u) === key) === index;
  });

  if (files.length === 0 && urls.length === 0) return [];

  if (files.length === 0) {
    return urls.map((url) => ({
      fileName: labelFromDiskUrl(url),
      size: 0,
      url,
    }));
  }

  // Один URL (часто папка) — вешаем на все файлы notice; иначе zip по порядку.
  return files.map((file, index) => {
    let url: string | null = null;
    if (urls.length === 1) url = urls[0]!;
    else if (urls[index]) url = urls[index]!;
    return { fileName: file.fileName, size: file.size, url };
  });
}

/**
 * MIME-вложения + виртуальные с Диска.
 * Одинаковое имя с MIME → не дублируем; URL с Диска при наличии дописываем в MIME-ряд.
 */
export function mergeEmailAttachmentsWithYandexDisk(
  mimeAttachments: MimeMailAttachmentLike[],
  input: { textBody?: string | null; htmlBody?: string | null },
): MergedMailAttachment[] {
  const disk = extractYandexDiskAttachmentsFromMail(input);
  const byName = new Map(
    mimeAttachments.map((a) => [normalizeFileNameKey(a.fileName), a] as const),
  );

  const merged: MergedMailAttachment[] = mimeAttachments.map((a) => ({
    ...a,
    externalUrl: null,
  }));

  let virtualIndex = 0;
  for (const item of disk) {
    const existing = byName.get(normalizeFileNameKey(item.fileName));
    if (existing) {
      const row = merged.find((m) => m.id === existing.id);
      if (row && item.url) row.externalUrl = item.url;
      continue;
    }
    merged.push({
      id: `${VIRTUAL_ID_PREFIX}${virtualIndex++}`,
      fileName: item.fileName,
      mimeType: mimeFromFileName(item.fileName),
      size: item.size,
      externalUrl: item.url,
    });
  }

  return merged;
}
