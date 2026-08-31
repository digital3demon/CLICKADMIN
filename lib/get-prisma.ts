import "server-only";

import { cookies } from "next/headers";
import type { PrismaClient } from "@prisma/client";
import {
  SESSION_DEMO_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth/jwt";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { ensureClinicPriceOverrideTable } from "@/lib/ensure-clinic-price-override-table";
import { ensureClinicSourceDoctorColumn } from "@/lib/ensure-clinic-source-doctor-column";
import { ensureClinicUsesPaperDocsColumn } from "@/lib/ensure-clinic-uses-paper-docs-column";
import { ensureOrderAttachmentDiskRelPathColumn } from "@/lib/ensure-order-attachment-disk-column";
import { ensureFinanceOfficeDebtColumns } from "@/lib/ensure-finance-office-debt-columns";
import { ensureInventoryItemColumns } from "@/lib/ensure-inventory-item-columns";
import { ensureLegalEntityReconciliationTable } from "@/lib/ensure-legal-entity-reconciliation-table";
import { ensureCorrectionClarifyColumns } from "@/lib/ensure-correction-clarify-columns";
import { ensureOrderKanbanColumnBeforeShipped } from "@/lib/ensure-order-kanban-column-before-shipped";
import { ensureLabTaskChatTables } from "@/lib/ensure-lab-task-chat-tables";
import {
  ensureWorkExampleTables,
  ensureWorkExampleTitleColumn,
} from "@/lib/ensure-work-example-tables";
import { ensureAnalyticsTreatAsExistingColumn } from "@/lib/ensure-analytics-treat-as-existing-column";
import { ensureSqlitePragmas } from "@/lib/ensure-sqlite-pragmas";
import { getDemoPrisma } from "@/lib/prisma-demo";
import { getDemoDatabaseUrl } from "@/lib/prisma-demo";
import { prisma } from "@/lib/prisma";
import { resolveTenantPrismaClient } from "@/lib/tenant-prisma-resolver";
import { assertCrmStandaloneDemoSafe } from "@/lib/crm-standalone-demo";

function isSqliteUrl(url: string | undefined): boolean {
  return String(url || "").trim().startsWith("file:");
}

async function prepareClient(
  client: PrismaClient,
  options?: { sqliteCompat?: boolean },
): Promise<PrismaClient> {
  if (options?.sqliteCompat) {
    await ensureSqlitePragmas(client);
    await ensureClinicPriceOverrideTable(client);
    await ensureClinicSourceDoctorColumn(client);
    await ensureClinicUsesPaperDocsColumn(client);
    await ensureOrderAttachmentDiskRelPathColumn(client);
    await ensureCorrectionClarifyColumns(client);
    await ensureOrderKanbanColumnBeforeShipped(client);
    await ensureLabTaskChatTables(client);
    await ensureWorkExampleTables(client);
  }
  /** SQLite без migrate и демо-Postgres после старого db push. */
  await ensureFinanceOfficeDebtColumns(client);
  await ensureLegalEntityReconciliationTable(client);
  await ensureInventoryItemColumns(client);
  await ensureWorkExampleTitleColumn(client);
  await ensureAnalyticsTreatAsExistingColumn(client);
  return client;
}

/**
 * Клиент БД для текущего запроса: основная CRM или изолированная демо-БД.
 * Сначала читаем демо-cookie напрямую (как в middleware), затем сессию —
 * чтобы не попасть в основную БД при любом расхождении путей чтения cookie.
 */
export async function getPrisma(): Promise<PrismaClient> {
  assertCrmStandaloneDemoSafe();
  try {
    const c = await cookies();
    const demoT = c.get(SESSION_DEMO_COOKIE_NAME)?.value;
    if (demoT) {
      const d = await verifySessionToken(demoT);
      if (d?.demo) {
        return prepareClient(getDemoPrisma(), {
          sqliteCompat: isSqliteUrl(getDemoDatabaseUrl()),
        });
      }
    }
  } catch {
    /* cookies() недоступен вне запроса — ниже fallback по getSessionFromCookies */
  }

  const session = await getSessionFromCookies();
  if (session?.demo) {
    return prepareClient(getDemoPrisma(), {
      sqliteCompat: isSqliteUrl(getDemoDatabaseUrl()),
    });
  }
  if (!session) {
    return prepareClient(prisma, {
      sqliteCompat: isSqliteUrl(process.env.DATABASE_URL),
    });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return prepareClient(prisma, {
      sqliteCompat: isSqliteUrl(process.env.DATABASE_URL),
    });
  }
  const tenantPrisma = await resolveTenantPrismaClient(tenantId);
  const sqliteCompat =
    tenantPrisma === prisma
      ? isSqliteUrl(process.env.DATABASE_URL)
      : false;
  return prepareClient(tenantPrisma, { sqliteCompat });
}
