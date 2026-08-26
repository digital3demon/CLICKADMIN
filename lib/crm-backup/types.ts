export const CRM_FULL_BACKUP_KIND = "crm-full-backup";
export const CRM_FULL_BACKUP_VERSION = 2;
export const CRM_BACKUP_CONFIRM_PHRASE = "ВОССТАНОВИТЬ";

export function isCrmBackupDisabled(): boolean {
  const v = String(process.env.CRM_BACKUP_DISABLE || "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export type CrmBackupEngine = "sqlite" | "postgres";
export type CrmBackupSource = "auto" | "manual";

export type CrmBackupMeta = {
  kind: typeof CRM_FULL_BACKUP_KIND;
  version: number;
  engine: CrmBackupEngine;
  createdAt: string;
  source: CrmBackupSource;
  tenantId: string;
  bytes: number;
  storage: "s3" | "disk";
  keyOrPath: string;
};

export function crmDailyBackupObjectKey(tenantId: string): string {
  return `crm-dumps/${tenantId}/daily/crm-backup-current.zip`;
}

export function crmDailyBackupMetaObjectKey(tenantId: string): string {
  return `crm-dumps/${tenantId}/daily/crm-backup-current.meta.json`;
}

export function parseCrmBackupMeta(raw: unknown): CrmBackupMeta | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.kind !== CRM_FULL_BACKUP_KIND) return null;
  if (o.engine !== "sqlite" && o.engine !== "postgres") return null;
  if (typeof o.createdAt !== "string" || !o.createdAt.trim()) return null;
  if (typeof o.bytes !== "number" || !Number.isFinite(o.bytes)) return null;
  return {
    kind: CRM_FULL_BACKUP_KIND,
    version: typeof o.version === "number" ? o.version : CRM_FULL_BACKUP_VERSION,
    engine: o.engine,
    createdAt: o.createdAt,
    source: o.source === "manual" ? "manual" : "auto",
    tenantId: String(o.tenantId || ""),
    bytes: o.bytes,
    storage: o.storage === "s3" ? "s3" : "disk",
    keyOrPath: String(o.keyOrPath || ""),
  };
}
