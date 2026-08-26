import "server-only";

import fs from "node:fs";
import path from "node:path";
import type JSZip from "jszip";
import { crmBackupFileRootById } from "@/lib/crm-backup/file-roots";
import {
  isS3StorageEnabled,
  putS3ObjectBytes,
} from "@/lib/s3-client";
import { resolvePathUnderRoot } from "@/lib/storage-path-safe";

export async function restoreCrmBackupSidecarFiles(zip: JSZip): Promise<{
  localFiles: number;
  s3Files: number;
}> {
  let localFiles = 0;
  let s3Files = 0;
  const names = Object.keys(zip.files);
  for (const name of names) {
    const entry = zip.files[name];
    if (!entry || entry.dir) continue;
    if (name.startsWith("files/")) {
      const rest = name.slice("files/".length);
      const slash = rest.indexOf("/");
      if (slash <= 0) continue;
      const rootId = rest.slice(0, slash);
      const rel = rest.slice(slash + 1);
      const root = crmBackupFileRootById(rootId);
      if (!root || !rel) continue;
      const dest = resolvePathUnderRoot(root.absPath, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, Buffer.from(await entry.async("nodebuffer")));
      localFiles += 1;
      continue;
    }
    if (name.startsWith("s3/")) {
      const key = name.slice("s3/".length);
      if (!key || key.startsWith("crm-dumps/")) continue;
      if (!isS3StorageEnabled()) continue;
      const bytes = Buffer.from(await entry.async("nodebuffer"));
      await putS3ObjectBytes(key, bytes, "application/octet-stream");
      s3Files += 1;
    }
  }
  return { localFiles, s3Files };
}
