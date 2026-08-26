/** S3-ключ вложения → относительный путь на диске (как в diskRelPath без префикса s3:). */

export function localRelFromS3ObjectKey(key: string): {
  rootId: "order-attachments" | "mail-attachments" | "clickmig-files";
  rel: string;
} | null {
  const k = key.replace(/\\/g, "/").trim();
  if (!k || k.includes("..")) return null;
  const order = /^orders\/([^/]+)\/attachments\/([^/]+)$/.exec(k);
  if (order) {
    return { rootId: "order-attachments", rel: `orders/${order[1]}/${order[2]}` };
  }
  const mail = /^tenants\/([^/]+)\/mail\/([^/]+)\/attachments\/([^/]+)$/.exec(k);
  if (mail) {
    return {
      rootId: "mail-attachments",
      rel: `tenants/${mail[1]}/mail/${mail[2]}/${mail[3]}`,
    };
  }
  const click = /^clickmig\/([^/]+)\/([^/]+)$/.exec(k);
  if (click) {
    return { rootId: "clickmig-files", rel: `${click[1]}/${click[2]}` };
  }
  return null;
}

export function zipRelFromS3ObjectKey(key: string): string | null {
  const mapped = localRelFromS3ObjectKey(key);
  if (!mapped) return null;
  return `files/${mapped.rootId}/${mapped.rel}`;
}

/** `s3:orders/…/attachments/id` → `orders/…/id` для записи в diskRelPath. */
export function diskRelFromS3Pointer(diskRelPath: string): string | null {
  const raw = diskRelPath.trim();
  if (!raw.startsWith("s3:")) return null;
  const mapped = localRelFromS3ObjectKey(raw.slice(3).trim());
  return mapped?.rel ?? null;
}
