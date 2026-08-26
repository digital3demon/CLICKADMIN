import "server-only";

import fs from "node:fs";
import path from "node:path";
import type JSZip from "jszip";
import { crmBackupFileRootById } from "@/lib/crm-backup/file-roots";
import { localRelFromS3ObjectKey } from "@/lib/crm-backup/s3-key-to-disk";
import {
  isS3StorageEnabled,
  putS3ObjectBytes,
} from "@/lib/s3-client";
import { resolvePathUnderRoot } from "@/lib/storage-path-safe";

function writeUnder(rootAbs: string, rel: string, bytes: Buffer): void {
  const dest = resolvePathUnderRoot(rootAbs, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, bytes);
}

export async function restoreCrmBackupSidecarFiles(zip: JSZip): Promise<{
  localFiles: number;
  s3Files: number;
}> {
  let localFiles = 0;
  let s3Files = 0;
  const s3On = isS3StorageEnabled();
  const dataRoot = path.join(process.cwd(), "data");
  const names = Object.keys(zip.files);
  for (const name of names) {
    const entry = zip.files[name];
    if (!entry || entry.dir) continue;
    if (name.startsWith("files/data/")) {
      const rel = name.slice("files/data/".length);
      if (!rel || rel.startsWith("crm-dumps/") || rel.startsWith("logs/")) {
        continue;
      }
      writeUnder(dataRoot, rel, Buffer.from(await entry.async("nodebuffer")));
      localFiles += 1;
      continue;
    }
    if (name.startsWith("files/")) {
      const rest = name.slice("files/".length);
      const slash = rest.indexOf("/");
      if (slash <= 0) continue;
      const rootId = rest.slice(0, slash);
      const rel = rest.slice(slash + 1);
      const root = crmBackupFileRootById(rootId);
      if (!root || !rel) continue;
      writeUnder(root.absPath, rel, Buffer.from(await entry.async("nodebuffer")));
      localFiles += 1;
      continue;
    }
    if (name.startsWith("s3/")) {
      const key = name.slice("s3/".length);
      if (!key || key.startsWith("crm-dumps/")) continue;
      const bytes = Buffer.from(await entry.async("nodebuffer"));
      if (s3On) {
        await putS3ObjectBytes(key, bytes, "application/octet-stream");
        s3Files += 1;
      } else {
        const mapped = localRelFromS3ObjectKey(key);
        const root = mapped ? crmBackupFileRootById(mapped.rootId) : null;
        if (root) {
          writeUnder(root.absPath, mapped.rel, bytes);
          localFiles += 1;
        }
      }
    }
  }
  return { localFiles, s3Files };
}
