/**
 * Каталог zip-дампов и lock оверлея.
 * Timeweb standalone: cwd = /app/.next/standalone — туда писать нельзя (EACCES).
 * Порядок: CRM_DUMP_DIR → /app/data → родитель standalone → cwd/data (не standalone) → os.tmpdir().
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let cached: string | null = null;

export function resetCrmDumpLocalDirCacheForTests(): void {
  cached = null;
}

export function isNextStandaloneCwd(cwd: string): boolean {
  const norm = cwd.replace(/\\/g, "/");
  return norm.includes("/.next/standalone") || norm.endsWith("/.next/standalone");
}

/** Относительный CRM_DUMP_DIR при standalone — не клеить к cwd (EACCES). */
export function resolveCrmDumpEnvDir(cwd: string, envDir: string): string {
  const raw = envDir.trim();
  if (path.isAbsolute(raw)) return raw;
  if (isNextStandaloneCwd(cwd)) {
    const rel = raw.replace(/^[\\/]+/, "").replace(/^data[\\/]/, "");
    return path.posix.join("/app/data", rel.replace(/\\/g, "/"));
  }
  return path.join(cwd, raw);
}

export function crmDumpDirCandidates(opts: {
  cwd: string;
  envDir?: string;
  tmpDir: string;
}): string[] {
  const out: string[] = [];
  const raw = opts.envDir?.trim();
  if (raw) {
    out.push(resolveCrmDumpEnvDir(opts.cwd, raw));
  }
  out.push("/app/data/crm-dumps");
  if (isNextStandaloneCwd(opts.cwd)) {
    out.push(path.resolve(opts.cwd, "..", "..", "data", "crm-dumps"));
  } else {
    out.push(path.join(opts.cwd, "data", "crm-dumps"));
  }
  out.push(path.join(opts.tmpDir, "dental-lab-crm-dumps"));
  return [...new Set(out)];
}

function dirIsWritable(dir: string): boolean {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export function getCrmDumpLocalDir(): string {
  if (cached) return cached;
  const candidates = crmDumpDirCandidates({
    cwd: process.cwd(),
    envDir: process.env.CRM_DUMP_DIR,
    tmpDir: os.tmpdir(),
  });
  for (const dir of candidates) {
    if (dirIsWritable(dir)) {
      if (process.env.NODE_ENV === "production") {
        console.log(`[crm-dump] writable dir: ${dir}`);
      }
      cached = dir;
      return dir;
    }
  }
  throw new Error(
    `Нет каталога для дампов CRM (пробовали: ${candidates.join(", ")})`,
  );
}
