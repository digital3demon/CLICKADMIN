import "server-only";

import { shouldImportCloudFolderPhoto } from "@/lib/work-examples/cloud-folder-photo";
import { CloudFolderImportError } from "@/lib/work-examples/cloud-folder-import-error";
import type { CloudFolderRemotePhoto } from "@/lib/work-examples/cloud-folder-remote";

const API = "https://cloud-api.yandex.net/v1/disk/public/resources";
const PAGE = 200;
const MAX_DEPTH = 5;

type YandexItem = {
  type?: string;
  name?: string;
  path?: string;
  mime_type?: string;
  media_type?: string;
  size?: number;
  file?: string;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

async function yandexGet(url: string): Promise<Record<string, unknown>> {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(45_000),
    headers: { Accept: "application/json" },
  });
  const raw = await r.text();
  let json: unknown = null;
  try {
    json = raw.trim() ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }
  const obj = asRecord(json);
  if (!r.ok) {
    const msg =
      r.status === 404 || r.status === 403
        ? "Папка Яндекс Диска не найдена или закрыта. Нужна публичная ссылка «поделиться»."
        : "Не удалось прочитать Яндекс Диск";
    throw new CloudFolderImportError(msg, r.status === 404 ? 404 : 400);
  }
  if (!obj) throw new CloudFolderImportError("Некорректный ответ Яндекс Диска", 502);
  return obj;
}

async function listPage(
  publicKey: string,
  path: string,
  offset: number,
): Promise<{
  items: YandexItem[];
  total: number;
  name: string;
  type: string;
  mime: string;
  size: number;
  file: string;
}> {
  const u = new URL(API);
  u.searchParams.set("public_key", publicKey);
  u.searchParams.set("limit", String(PAGE));
  u.searchParams.set("offset", String(offset));
  if (path && path !== "/") u.searchParams.set("path", path);
  const obj = await yandexGet(u.toString());
  const embedded = asRecord(obj._embedded);
  const itemsRaw = Array.isArray(embedded?.items) ? embedded.items : [];
  const items: YandexItem[] = itemsRaw.map((x) => {
    const o = asRecord(x) || {};
    return {
      type: typeof o.type === "string" ? o.type : "",
      name: typeof o.name === "string" ? o.name : "",
      path: typeof o.path === "string" ? o.path : "",
      mime_type: typeof o.mime_type === "string" ? o.mime_type : "",
      media_type: typeof o.media_type === "string" ? o.media_type : "",
      size: typeof o.size === "number" ? o.size : 0,
      file: typeof o.file === "string" ? o.file : "",
    };
  });
  return {
    items,
    total: typeof embedded?.total === "number" ? embedded.total : items.length,
    name: typeof obj.name === "string" ? obj.name : "",
    type: typeof obj.type === "string" ? obj.type : "",
    mime: typeof obj.mime_type === "string" ? obj.mime_type : "",
    size: typeof obj.size === "number" ? obj.size : 0,
    file: typeof obj.file === "string" ? obj.file : "",
  };
}

async function downloadHref(publicKey: string, path: string): Promise<string> {
  const u = new URL(`${API}/download`);
  u.searchParams.set("public_key", publicKey);
  if (path) u.searchParams.set("path", path);
  const obj = await yandexGet(u.toString());
  const href = typeof obj.href === "string" ? obj.href : "";
  if (!href) throw new CloudFolderImportError("Яндекс Диск не отдал ссылку на скачивание", 502);
  return href;
}

export async function listYandexDiskPhotos(input: {
  publicUrl: string;
  mode: "folder" | "file";
}): Promise<{ folderName: string; photos: CloudFolderRemotePhoto[] }> {
  const started = Date.now();
  const photos: CloudFolderRemotePhoto[] = [];
  const seenPath = new Set<string>();

  const walk = async (path: string, depth: number): Promise<string> => {
    if (depth > MAX_DEPTH) return "";
    let offset = 0;
    let folderName = "";
    let firstType = "";
    for (;;) {
      const page = await listPage(input.publicUrl, path, offset);
      folderName = folderName || page.name;
      firstType = firstType || page.type;
      if (page.type === "file" || input.mode === "file") {
        const mime = page.mime || page.items[0]?.mime_type || "";
        const name = page.name;
        if (shouldImportCloudFolderPhoto({ name, mime })) {
          photos.push({
            name,
            mime: mime || "image/jpeg",
            sizeBytes: page.size || page.items[0]?.size || 0,
            download: async () => {
              const href = page.file || page.items[0]?.file || (await downloadHref(input.publicUrl, path));
              return fetchRemoteBytes(href);
            },
          });
        }
        return folderName;
      }
      for (const item of page.items) {
        const itemPath = item.path || `${path.replace(/\/$/u, "")}/${item.name}`;
        if (seenPath.has(itemPath)) continue;
        seenPath.add(itemPath);
        if (item.type === "dir") {
          await walk(itemPath, depth + 1);
          continue;
        }
        const mime = item.mime_type || "";
        if (!shouldImportCloudFolderPhoto({ name: item.name, mime: mime || item.media_type })) {
          continue;
        }
        photos.push({
          name: item.name || "фото.jpg",
          mime: mime || "image/jpeg",
          sizeBytes: item.size || 0,
          download: async () => {
            const href = item.file || (await downloadHref(input.publicUrl, itemPath));
            return fetchRemoteBytes(href);
          },
        });
      }
      offset += PAGE;
      if (offset >= page.total || page.items.length === 0) break;
    }
    return folderName;
  };

  const folderName = await walk("/", 0);
  console.info(
    JSON.stringify({
      evt: "work_example_yandex_list",
      n: photos.length,
      ms: Date.now() - started,
    }),
  );
  return { folderName, photos };
}

async function fetchRemoteBytes(href: string): Promise<Buffer> {
  const r = await fetch(href, { signal: AbortSignal.timeout(90_000), redirect: "follow" });
  if (!r.ok) throw new CloudFolderImportError("Не удалось скачать файл с Яндекс Диска", 502);
  return Buffer.from(await r.arrayBuffer());
}
