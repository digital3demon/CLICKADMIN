import fs from "node:fs";
import path from "node:path";
import type JSZip from "jszip";
import { crmBackupFileRoots } from "@/lib/crm-backup/file-roots";

function isDirSkipped(name: string): boolean {
  const n = name.toLowerCase();
  return n === "crm-dumps" || n === "logs" || n === "imports";
}

export function collectFilesUnderRoot(absRoot: string): string[] {
  const root = path.resolve(absRoot);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) return [];
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (isDirSkipped(ent.name)) continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full);
        continue;
      }
      if (!ent.isFile()) continue;
      out.push(full);
    }
  };
  walk(root);
  return out;
}

export function zipRelForLocalFile(
  rootId: string,
  absRoot: string,
  absFile: string,
): string | null {
  const root = path.resolve(absRoot);
  const file = path.resolve(absFile);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (file !== root && !file.startsWith(prefix)) return null;
  const rel = path.relative(root, file).split(path.sep).join("/");
  if (!rel || rel.includes("..")) return null;
  return `files/${rootId}/${rel}`;
}

export function addLocalCrmFilesToZip(zip: JSZip): {
  fileCount: number;
  bytes: number;
} {
  let fileCount = 0;
  let bytes = 0;
  for (const root of crmBackupFileRoots()) {
    for (const abs of collectFilesUnderRoot(root.absPath)) {
      const zipRel = zipRelForLocalFile(root.id, root.absPath, abs);
      if (!zipRel) continue;
      const buf = fs.readFileSync(abs);
      zip.file(zipRel, buf);
      fileCount += 1;
      bytes += buf.length;
    }
  }
  return { fileCount, bytes };
}
