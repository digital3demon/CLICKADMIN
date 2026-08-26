import fs from "node:fs";
import path from "node:path";
import type JSZip from "jszip";
import { crmBackupFileRoots } from "@/lib/crm-backup/file-roots";

const SKIP_DIR_NAMES = new Set(["crm-dumps", "logs", "imports"]);

function isInside(parent: string, child: string): boolean {
  const root = path.resolve(parent);
  const file = path.resolve(child);
  if (file === root) return true;
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  return file.startsWith(prefix);
}

function isDirSkipped(name: string): boolean {
  return SKIP_DIR_NAMES.has(name.toLowerCase());
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
  if (!isInside(root, file)) return null;
  const rel = path.relative(root, file).split(path.sep).join("/");
  if (!rel || rel.includes("..")) return null;
  return `files/${rootId}/${rel}`;
}

function addTree(
  zip: JSZip,
  zipPrefix: string,
  absRoot: string,
): { fileCount: number; bytes: number } {
  let fileCount = 0;
  let bytes = 0;
  for (const abs of collectFilesUnderRoot(absRoot)) {
    const rel = path.relative(absRoot, abs).split(path.sep).join("/");
    if (!rel || rel.includes("..")) continue;
    const zipRel = `${zipPrefix}/${rel}`;
    if (zip.file(zipRel)) continue;
    const buf = fs.readFileSync(abs);
    zip.file(zipRel, buf);
    fileCount += 1;
    bytes += buf.length;
  }
  return { fileCount, bytes };
}

function shouldIncludeEnvFile(): boolean {
  const v = String(process.env.CRM_BACKUP_INCLUDE_ENV || "1")
    .trim()
    .toLowerCase();
  return v !== "0" && v !== "false" && v !== "no";
}

function addEnvFiles(zip: JSZip): number {
  if (!shouldIncludeEnvFile()) return 0;
  let n = 0;
  for (const name of [".env", ".env.local", ".env.standalone"]) {
    const full = path.join(process.cwd(), name);
    if (!fs.existsSync(full) || !fs.statSync(full).isFile()) continue;
    zip.file(`config/${name}`, fs.readFileSync(full));
    n += 1;
  }
  return n;
}

/** Весь data/ (кроме логов/дампов) + корни из env, если они вне data/. + .env */
export function addLocalCrmFilesToZip(zip: JSZip): {
  fileCount: number;
  bytes: number;
  envFiles: number;
} {
  let fileCount = 0;
  let bytes = 0;
  const dataDir = path.join(process.cwd(), "data");
  const dataPacked = addTree(zip, "files/data", dataDir);
  fileCount += dataPacked.fileCount;
  bytes += dataPacked.bytes;

  for (const root of crmBackupFileRoots()) {
    if (isInside(dataDir, root.absPath)) continue;
    const packed = addTree(zip, `files/${root.id}`, root.absPath);
    fileCount += packed.fileCount;
    bytes += packed.bytes;
  }

  const envFiles = addEnvFiles(zip);
  return { fileCount, bytes, envFiles };
}
