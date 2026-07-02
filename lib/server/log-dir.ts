import fs from "node:fs";
import path from "node:path";

const DAY_FILE_RE = /^crm-(\d{4}-\d{2}-\d{2})\.log$/;

/** Каталог суточных JSONL-логов CRM (переопределяется LOG_DIR). */
export function getCrmLogDir(): string {
  const raw = process.env.LOG_DIR?.trim();
  if (raw) {
    return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  }
  return path.join(process.cwd(), "data", "logs");
}

export function dailyCrmLogFileName(day: string): string {
  return `crm-${day}.log`;
}

export function dailyCrmLogPath(day: string): string {
  return path.join(getCrmLogDir(), dailyCrmLogFileName(day));
}

export function ensureCrmLogDir(): string {
  const dir = getCrmLogDir();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** YYYY-MM-DD в локальной таймзоне сервера. */
export function formatLocalDayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDayKey(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  if (!Number.isFinite(y) || mo < 1 || mo > 12 || da < 1 || da > 31) return null;
  const d = new Date(y, mo - 1, da);
  if (
    d.getFullYear() !== y ||
    d.getMonth() !== mo - 1 ||
    d.getDate() !== da
  ) {
    return null;
  }
  return d;
}

/** Инклюзивный список дней YYYY-MM-DD от from до to. */
export function listDaysInclusive(from: string, to: string): string[] {
  const start = parseDayKey(from);
  const end = parseDayKey(to);
  if (!start || !end || start.getTime() > end.getTime()) return [];
  const out: string[] = [];
  const cur = new Date(start);
  while (cur.getTime() <= end.getTime()) {
    out.push(formatLocalDayKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function listAvailableCrmLogDays(): string[] {
  const dir = getCrmLogDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .map((name) => {
      const m = DAY_FILE_RE.exec(name);
      return m?.[1] ?? null;
    })
    .filter((d): d is string => d != null)
    .sort();
}

export function crmLogRetentionDays(): number {
  const raw = process.env.LOG_RETENTION_DAYS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 30;
  if (!Number.isFinite(n) || n < 1) return 30;
  return Math.min(n, 365);
}

/** Удаляет файлы crm-YYYY-MM-DD.log старше retentionDays. */
export function pruneOldCrmLogFiles(retentionDays = crmLogRetentionDays()): number {
  const dir = getCrmLogDir();
  if (!fs.existsSync(dir)) return 0;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffKey = formatLocalDayKey(cutoff);
  let removed = 0;
  for (const name of fs.readdirSync(dir)) {
    const m = DAY_FILE_RE.exec(name);
    if (!m?.[1] || m[1] >= cutoffKey) continue;
    try {
      fs.unlinkSync(path.join(dir, name));
      removed += 1;
    } catch {
      /* ignore */
    }
  }
  return removed;
}
