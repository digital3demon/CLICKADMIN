/**
 * Разбор файлов карточки/комментариев Kaiten (id, имя, url).
 * Не схлопывает по имени: несколько image.png — разные id.
 */

export type KaitenRemoteFile = {
  kaitenFileId: number;
  name: string;
  mime: string | null;
  url: string | null;
};

function stringField(o: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = o[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function numberField(o: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = o[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function fileFromItem(item: unknown): KaitenRemoteFile | null {
  if (item == null || typeof item !== "object" || Array.isArray(item)) return null;
  const o = item as Record<string, unknown>;
  const kaitenFileId = numberField(o, ["id", "file_id", "attachment_id"]);
  if (kaitenFileId == null) return null;
  const name =
    stringField(o, ["name", "file_name", "filename", "title", "original_name"]) ??
    `file-${kaitenFileId}`;
  const mime = stringField(o, ["mime_type", "mime", "content_type", "type"]);
  const url = stringField(o, [
    "download_url",
    "url",
    "src",
    "preview_url",
    "thumbnail_url",
  ]);
  return { kaitenFileId, name, mime, url };
}

export function collectKaitenRemoteFiles(
  records: Array<Record<string, unknown> | null | undefined>,
): KaitenRemoteFile[] {
  const byId = new Map<number, KaitenRemoteFile>();
  for (const record of records) {
    if (!record) continue;
    for (const key of ["files", "attachments", "attached_files", "uploads"] as const) {
      const value = record[key];
      if (!Array.isArray(value)) continue;
      for (const item of value) {
        const file = fileFromItem(item);
        if (!file) continue;
        if (!byId.has(file.kaitenFileId)) byId.set(file.kaitenFileId, file);
      }
    }
  }
  return [...byId.values()];
}

export function filesMissingFromOrder(
  remote: KaitenRemoteFile[],
  existingKaitenFileIds: Iterable<number>,
): KaitenRemoteFile[] {
  const have = new Set(existingKaitenFileIds);
  return remote.filter((f) => !have.has(f.kaitenFileId));
}

export function resolveKaitenFileUrl(rawUrl: string, apiBase: string): string {
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  return new URL(rawUrl, `${apiBase.replace(/\/+$/, "")}/`).toString();
}
