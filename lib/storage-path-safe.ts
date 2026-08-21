import path from "node:path";

/** Ключи бакета, которые пишет само приложение. */
export const APP_S3_KEY_PREFIXES = [
  "orders/",
  "tenants/",
  "clickmig/",
  "crm-dumps/",
] as const;

export function assertSafeS3ObjectKey(key: string): string {
  const k = key.trim();
  if (
    !k ||
    k.includes("\\") ||
    k.includes("\0") ||
    k.includes("..") ||
    k.startsWith("/")
  ) {
    throw new Error("Недопустимый ключ хранилища");
  }
  if (!APP_S3_KEY_PREFIXES.some((p) => k.startsWith(p))) {
    throw new Error("Недопустимый ключ хранилища");
  }
  return k;
}

/** Диск: rel не выходит из корня (`..`, абсолютный путь). */
export function resolvePathUnderRoot(root: string, rel: string): string {
  const normalized = rel.replace(/\\/g, "/").trim();
  if (
    !normalized ||
    normalized.includes("\0") ||
    normalized.includes("..") ||
    normalized.startsWith("/")
  ) {
    throw new Error("Недопустимый путь вложения");
  }
  const rootAbs = path.resolve(root);
  const abs = path.resolve(rootAbs, ...normalized.split("/").filter(Boolean));
  const prefix = rootAbs.endsWith(path.sep) ? rootAbs : rootAbs + path.sep;
  if (abs !== rootAbs && !abs.startsWith(prefix)) {
    throw new Error("Недопустимый путь вложения");
  }
  return abs;
}
