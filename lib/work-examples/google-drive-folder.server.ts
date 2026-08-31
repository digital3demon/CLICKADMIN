import "server-only";

import { shouldImportCloudFolderPhoto } from "@/lib/work-examples/cloud-folder-photo";
import { CloudFolderImportError } from "@/lib/work-examples/cloud-folder-import-error";
import type { CloudFolderRemotePhoto } from "@/lib/work-examples/cloud-folder-remote";
import { parseGoogleDrivePublicListingHtml } from "@/lib/work-examples/google-drive-public-html";

const FOLDER_MIME = "application/vnd.google-apps.folder";
const MAX_DEPTH = 5;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

type DriveMeta = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
};

function apiKey(): string {
  return String(process.env.GOOGLE_DRIVE_API_KEY || "").trim();
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

async function driveApiJson(url: string): Promise<Record<string, unknown>> {
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
  if (!r.ok || !obj) {
    throw new CloudFolderImportError(
      r.status === 404
        ? "Папка Google Drive не найдена."
        : "Не удалось прочитать Google Drive. Проверьте доступ «все, у кого есть ссылка» или GOOGLE_DRIVE_API_KEY.",
      r.status === 404 ? 404 : 400,
    );
  }
  return obj;
}

async function listViaApi(folderId: string, key: string): Promise<DriveMeta[]> {
  const out: DriveMeta[] = [];
  let pageToken = "";
  for (let i = 0; i < 20; i += 1) {
    const u = new URL("https://www.googleapis.com/drive/v3/files");
    u.searchParams.set(
      "q",
      `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false`,
    );
    u.searchParams.set("fields", "nextPageToken,files(id,name,mimeType,size)");
    u.searchParams.set("pageSize", "1000");
    u.searchParams.set("supportsAllDrives", "true");
    u.searchParams.set("includeItemsFromAllDrives", "true");
    u.searchParams.set("key", key);
    if (pageToken) u.searchParams.set("pageToken", pageToken);
    const obj = await driveApiJson(u.toString());
    const files = Array.isArray(obj.files) ? obj.files : [];
    for (const row of files) {
      const o = asRecord(row);
      if (!o || typeof o.id !== "string") continue;
      out.push({
        id: o.id,
        name: typeof o.name === "string" ? o.name : o.id,
        mimeType: typeof o.mimeType === "string" ? o.mimeType : "",
        size: typeof o.size === "string" ? o.size : undefined,
      });
    }
    pageToken = typeof obj.nextPageToken === "string" ? obj.nextPageToken : "";
    if (!pageToken) break;
  }
  return out;
}

async function getViaApi(id: string, key: string): Promise<DriveMeta | null> {
  const u = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}`);
  u.searchParams.set("fields", "id,name,mimeType,size");
  u.searchParams.set("supportsAllDrives", "true");
  u.searchParams.set("key", key);
  try {
    const o = await driveApiJson(u.toString());
    if (typeof o.id !== "string") return null;
    return {
      id: o.id,
      name: typeof o.name === "string" ? o.name : o.id,
      mimeType: typeof o.mimeType === "string" ? o.mimeType : "",
      size: typeof o.size === "string" ? o.size : undefined,
    };
  } catch {
    return null;
  }
}

async function fetchHtml(url: string): Promise<string> {
  const r = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: { Accept: "text/html", "User-Agent": UA },
    redirect: "follow",
  });
  if (!r.ok) return "";
  return r.text();
}

async function listViaPublicHtml(folderId: string): Promise<DriveMeta[]> {
  const pages = await Promise.all([
    fetchHtml(`https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}`),
    fetchHtml(`https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}?usp=sharing`),
  ]);
  const merged = parseGoogleDrivePublicListingHtml(pages.join("\n"));
  return merged
    .filter((e) => e.id !== folderId)
    .map((e) => {
      if (e.kind === "folder") {
        return { id: e.id, name: e.name, mimeType: FOLDER_MIME };
      }
      const mime = guessMime(e.name);
      return { id: e.id, name: e.name, mimeType: mime };
    });
}

function guessMime(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".gif")) return "image/gif";
  if (n.endsWith(".heic") || n.endsWith(".heif")) return "image/heic";
  if (/\.jpe?g$/i.test(n)) return "image/jpeg";
  return "";
}

async function downloadViaApi(id: string, key: string): Promise<Buffer> {
  const u = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}`);
  u.searchParams.set("alt", "media");
  u.searchParams.set("supportsAllDrives", "true");
  u.searchParams.set("key", key);
  const r = await fetch(u.toString(), { signal: AbortSignal.timeout(90_000) });
  if (!r.ok) throw new CloudFolderImportError("Не удалось скачать файл с Google Drive", 502);
  return Buffer.from(await r.arrayBuffer());
}

function parseConfirmToken(html: string): string | null {
  const m =
    /confirm=([0-9A-Za-z_-]+)/u.exec(html) ||
    /name="confirm"\s+value="([^"]+)"/u.exec(html);
  return m?.[1] ?? null;
}

async function downloadPublic(id: string): Promise<Buffer> {
  const uc = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}&confirm=t`;
  const r = await fetch(uc, {
    signal: AbortSignal.timeout(90_000),
    headers: { "User-Agent": UA },
    redirect: "follow",
  });
  const ctype = (r.headers.get("content-type") || "").toLowerCase();
  const buf = Buffer.from(await r.arrayBuffer());
  if (r.ok && !ctype.includes("text/html") && buf.length > 64) return buf;
  const html = buf.toString("utf8");
  const confirm = parseConfirmToken(html);
  if (confirm) {
    const r2 = await fetch(
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}&confirm=${encodeURIComponent(confirm)}`,
      { signal: AbortSignal.timeout(90_000), headers: { "User-Agent": UA }, redirect: "follow" },
    );
    if (r2.ok) return Buffer.from(await r2.arrayBuffer());
  }
  const lh = await fetch(`https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=s0`, {
    signal: AbortSignal.timeout(90_000),
    headers: { "User-Agent": UA },
    redirect: "follow",
  });
  if (lh.ok) {
    const out = Buffer.from(await lh.arrayBuffer());
    if (out.length > 64) return out;
  }
  throw new CloudFolderImportError("Не удалось скачать файл с Google Drive", 502);
}

export async function listGoogleDrivePhotos(input: {
  driveId: string;
  mode: "folder" | "file";
}): Promise<{ folderName: string; photos: CloudFolderRemotePhoto[] }> {
  const started = Date.now();
  const key = apiKey();
  const photos: CloudFolderRemotePhoto[] = [];
  const seen = new Set<string>();
  let folderName = "";

  const enqueue = (meta: DriveMeta) => {
    if (seen.has(meta.id)) return;
    if (meta.mimeType === FOLDER_MIME) return;
    if (!shouldImportCloudFolderPhoto({ name: meta.name, mime: meta.mimeType })) return;
    seen.add(meta.id);
    photos.push({
      name: meta.name,
      mime: meta.mimeType || guessMime(meta.name) || "image/jpeg",
      sizeBytes: Number(meta.size || 0) || 0,
      download: async () => (key ? downloadViaApi(meta.id, key) : downloadPublic(meta.id)),
    });
  };

  if (input.mode === "file") {
    const meta = key
      ? await getViaApi(input.driveId, key)
      : { id: input.driveId, name: "", mimeType: "" };
    if (meta) enqueue(meta);
    console.info(
      JSON.stringify({
        evt: "work_example_drive_list",
        n: photos.length,
        via: key ? "api" : "public",
        ms: Date.now() - started,
      }),
    );
    return { folderName: meta?.name || "", photos };
  }

  const walk = async (folderId: string, depth: number) => {
    if (depth > MAX_DEPTH) return;
    let children: DriveMeta[] = [];
    if (key) {
      try {
        children = await listViaApi(folderId, key);
      } catch {
        children = await listViaPublicHtml(folderId);
      }
    } else {
      children = await listViaPublicHtml(folderId);
    }
    if (depth === 0 && key) {
      const self = await getViaApi(folderId, key);
      folderName = self?.name || folderName;
    }
    for (const child of children) {
      if (child.mimeType === FOLDER_MIME) {
        await walk(child.id, depth + 1);
        continue;
      }
      enqueue(child);
    }
  };

  await walk(input.driveId, 0);
  if (!photos.length && !key) {
    throw new CloudFolderImportError(
      "Не удалось прочитать папку Google Drive. Откройте доступ «все, у кого есть ссылка» или задайте GOOGLE_DRIVE_API_KEY в .env.",
      400,
    );
  }
  console.info(
    JSON.stringify({
      evt: "work_example_drive_list",
      n: photos.length,
      via: key ? "api" : "public",
      ms: Date.now() - started,
    }),
  );
  return { folderName, photos };
}
