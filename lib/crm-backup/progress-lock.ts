/**
 * Флаг «сейчас бекап/восстановление» для оверлея на всех страницах.
 * Файл в crm-dumps (в архив не попадает). Часовой пояс не важен — только startedAt ISO UTC.
 */
import fs from "node:fs";
import path from "node:path";
import { getCrmDumpLocalDir } from "@/lib/crm-dump/local-dir";

export type CrmMaintenancePhase = "backup" | "restore";

export type CrmMaintenanceState = {
  phase: CrmMaintenancePhase;
  startedAt: string;
};

const STALE_MS = 25 * 60 * 1000;

function lockFilePath(): string {
  return path.join(getCrmDumpLocalDir(), "_progress.json");
}

function parseState(raw: unknown): CrmMaintenanceState | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.phase !== "backup" && o.phase !== "restore") return null;
  if (typeof o.startedAt !== "string" || !o.startedAt.trim()) return null;
  const t = Date.parse(o.startedAt);
  if (!Number.isFinite(t) || Date.now() - t > STALE_MS) return null;
  return { phase: o.phase, startedAt: o.startedAt };
}

export function readCrmMaintenanceState(): CrmMaintenanceState | null {
  try {
    const raw = fs.readFileSync(lockFilePath(), "utf8");
    return parseState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function beginCrmMaintenance(phase: CrmMaintenancePhase): void {
  const dir = path.dirname(lockFilePath());
  fs.mkdirSync(dir, { recursive: true });
  const state: CrmMaintenanceState = {
    phase,
    startedAt: new Date().toISOString(),
  };
  fs.writeFileSync(lockFilePath(), JSON.stringify(state));
}

export function endCrmMaintenance(): void {
  try {
    fs.unlinkSync(lockFilePath());
  } catch {
    /* ignore */
  }
}

export async function withCrmMaintenance<T>(
  phase: CrmMaintenancePhase,
  fn: () => Promise<T>,
): Promise<T> {
  beginCrmMaintenance(phase);
  try {
    return await fn();
  } finally {
    endCrmMaintenance();
  }
}

export function parseCrmMaintenanceState(raw: unknown): CrmMaintenanceState | null {
  return parseState(raw);
}
