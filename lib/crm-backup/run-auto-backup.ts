import "server-only";

import { createAndStoreCrmBackup } from "@/lib/crm-backup/create-backup";
import { isCrmBackupDisabled, type CrmBackupMeta } from "@/lib/crm-backup/types";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-constants";

export async function runScheduledCrmBackup(): Promise<
  | { ok: true; skipped: true }
  | { ok: true; skipped: false; last: CrmBackupMeta }
> {
  if (isCrmBackupDisabled()) {
    return { ok: true, skipped: true };
  }
  const last = await createAndStoreCrmBackup({
    tenantId: DEFAULT_TENANT_ID,
    source: "auto",
  });
  return { ok: true, skipped: false, last };
}
