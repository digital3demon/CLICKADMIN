/**
 * Разбор ссылок на папку/файл облака для импорта фото в пример работ.
 * Не \\b: кириллица вокруг URL не должна ломать id/ключ.
 * Яндекс 360 /client/aa/d_KEY → тот же public_key, что у disk.yandex.ru/d/KEY.
 */

export type CloudFolderProvider = "google-drive" | "yandex-disk";

export type CloudFolderImportTarget = {
  provider: CloudFolderProvider;
  mode: "folder" | "file";
  /** Как вставил пользователь — пишем в cloudUrl. */
  sourceUrl: string;
  /** Google folder/file id. */
  driveId?: string;
  /** Канон для публичного API Яндекса. */
  yandexPublicUrl?: string;
};

const DRIVE_ID_RE = /[A-Za-z0-9_-]{16,80}/;

function trimUrlTrail(raw: string): string {
  return raw.replace(/[.,;:!?)\]]+$/u, "").trim();
}

function tryUrl(raw: string): URL | null {
  try {
    return new URL(trimUrlTrail(raw));
  } catch {
    return null;
  }
}

function isGoogleDriveHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === "drive.google.com" || h === "docs.google.com" || h.endsWith(".google.com");
}

function isYandexDiskHost(host: string): boolean {
  const h = host.toLowerCase();
  return (
    h === "yadi.sk" ||
    h === "disk.yandex.ru" ||
    h === "disk.yandex.com" ||
    h === "disk.yandex.by" ||
    h === "disk.yandex.kz" ||
    h === "disk.yandex.ua" ||
    h === "disk.360.yandex.ru" ||
    h === "disk.360.yandex.com"
  );
}

function firstPathMatch(pathname: string, re: RegExp): string | null {
  const m = re.exec(pathname);
  const id = m?.[1]?.trim();
  return id && DRIVE_ID_RE.test(id) ? id : null;
}

function parseGoogleDrive(url: URL, sourceUrl: string): CloudFolderImportTarget | null {
  const folderId =
    firstPathMatch(url.pathname, /\/folders\/([A-Za-z0-9_-]+)/u) ||
    (url.searchParams.get("id") && /folder/i.test(url.pathname + url.search)
      ? url.searchParams.get("id")
      : null);
  if (folderId && DRIVE_ID_RE.test(folderId)) {
    return { provider: "google-drive", mode: "folder", sourceUrl, driveId: folderId };
  }
  const fileId = firstPathMatch(url.pathname, /\/file\/d\/([A-Za-z0-9_-]+)/u);
  if (fileId) {
    return { provider: "google-drive", mode: "file", sourceUrl, driveId: fileId };
  }
  const openId = url.searchParams.get("id")?.trim();
  if (openId && DRIVE_ID_RE.test(openId) && /\/open$/u.test(url.pathname)) {
    return { provider: "google-drive", mode: "folder", sourceUrl, driveId: openId };
  }
  if (
    openId &&
    DRIVE_ID_RE.test(openId) &&
    /embeddedfolderview/i.test(url.pathname)
  ) {
    return { provider: "google-drive", mode: "folder", sourceUrl, driveId: openId };
  }
  return null;
}

function yandexPublicUrl(kind: "d" | "i", key: string): string {
  return `https://disk.yandex.ru/${kind}/${key}`;
}

function parseYandexDisk(url: URL, sourceUrl: string): CloudFolderImportTarget | null {
  const path = url.pathname.replace(/\/+$/u, "");
  const classic = /\/([di])\/([^/]+)$/u.exec(path);
  if (classic?.[1] && classic[2]) {
    const kind = classic[1] === "i" ? "i" : "d";
    const key = decodeURIComponent(classic[2]);
    if (!key || key.length < 6) return null;
    return {
      provider: "yandex-disk",
      mode: kind === "i" ? "file" : "folder",
      sourceUrl,
      yandexPublicUrl: yandexPublicUrl(kind, key),
    };
  }
  // disk.360.yandex.ru/client/aa/d_KEY  или  /client/disk/i_KEY
  const client = /\/client\/[^/]+\/([di])_([^/]+)$/u.exec(path);
  if (client?.[1] && client[2]) {
    const kind = client[1] === "i" ? "i" : "d";
    const key = decodeURIComponent(client[2]);
    if (!key || key.length < 6) return null;
    return {
      provider: "yandex-disk",
      mode: kind === "i" ? "file" : "folder",
      sourceUrl,
      yandexPublicUrl: yandexPublicUrl(kind, key),
    };
  }
  return null;
}

export function parseCloudFolderImportUrl(raw: unknown): CloudFolderImportTarget | null {
  const text = trimUrlTrail(String(raw ?? ""));
  if (!text) return null;
  const url = tryUrl(text);
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) return null;
  if (isGoogleDriveHost(url.hostname)) return parseGoogleDrive(url, text);
  if (isYandexDiskHost(url.hostname)) return parseYandexDisk(url, text);
  return null;
}

export function isImportableCloudFolderUrl(raw: unknown): boolean {
  return parseCloudFolderImportUrl(raw) != null;
}

export function cloudFolderProviderLabel(provider: CloudFolderProvider): string {
  return provider === "yandex-disk" ? "Яндекс Диск" : "Google Drive";
}
