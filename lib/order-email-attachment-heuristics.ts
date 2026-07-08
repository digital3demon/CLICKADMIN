/** Эвристики типов вложений (для derived hasScans и т.п.). */

const SCAN_EXT = new Set([".stl", ".ply", ".obj", ".dcm", ".zip"]);
const CT_EXT = new Set([".dcm"]);
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".bmp"]);

function extLower(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  if (i < 0) return "";
  return fileName.slice(i).toLowerCase();
}

export function isScanLikeAttachment(fileName: string, mimeType?: string): boolean {
  const ext = extLower(fileName);
  const mime = (mimeType ?? "").toLowerCase();
  if (SCAN_EXT.has(ext)) return true;
  if (mime.includes("model/") || mime.includes("stl") || mime.includes("mesh")) return true;
  if (/scan|скан|jaw|челюст/i.test(fileName)) return true;
  return false;
}

export function isCtLikeAttachment(fileName: string, mimeType?: string): boolean {
  const ext = extLower(fileName);
  const mime = (mimeType ?? "").toLowerCase();
  return CT_EXT.has(ext) || mime.includes("dicom");
}

export function isPhotoLikeAttachment(fileName: string, mimeType?: string): boolean {
  const ext = extLower(fileName);
  const mime = (mimeType ?? "").toLowerCase();
  return IMAGE_EXT.has(ext) || mime.startsWith("image/");
}

export function deriveSourceDataFlagsFromAttachments(
  attachments: Array<{ id: string; fileName: string; mimeType?: string }>,
  selectedIds: string[],
  aiFlags: {
    hasScans?: boolean | null;
    hasCt?: boolean | null;
    hasMri?: boolean | null;
    hasPhoto?: boolean | null;
  },
): { hasScans: boolean; hasCt: boolean; hasMri: boolean; hasPhoto: boolean } {
  const byId = new Map(attachments.map((a) => [a.id, a]));
  let hasScans = aiFlags.hasScans === true;
  let hasCt = aiFlags.hasCt === true;
  let hasMri = aiFlags.hasMri === true;
  let hasPhoto = aiFlags.hasPhoto === true;

  // Любой .stl / scan-файл в письме — сканы есть, даже если ИИ не выбрал ID вложений.
  for (const a of attachments) {
    if (isScanLikeAttachment(a.fileName, a.mimeType)) hasScans = true;
    if (isCtLikeAttachment(a.fileName, a.mimeType)) hasCt = true;
  }

  for (const id of selectedIds) {
    const a = byId.get(id);
    if (!a) continue;
    if (isPhotoLikeAttachment(a.fileName, a.mimeType)) hasPhoto = true;
  }

  return { hasScans, hasCt, hasMri, hasPhoto };
}

export function collectScanLikeAttachmentIds(
  attachments: Array<{ id: string; fileName: string; mimeType?: string }>,
): string[] {
  return attachments
    .filter((a) => isScanLikeAttachment(a.fileName, a.mimeType))
    .map((a) => a.id);
}
