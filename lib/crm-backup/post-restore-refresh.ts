/**
 * После восстановления: подтянуть Kaiten (если галочка в конфигурации) и почту.
 * Вызывать, пока ещё висит оверлей восстановления.
 */
import "server-only";

import { EmailSyncMode } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { getKaitenRestAuth } from "@/lib/kaiten-rest";
import { isKaitenIntegrationActive } from "@/lib/kaiten-integration/settings";
import { syncKaitenChatsInBackground } from "@/lib/kaiten-chat-background-sync";
import { enqueueAndStartMailSyncJob } from "@/lib/mail/mail-queue";

const KAITEN_REFRESH_TICKS = 2;

export type PostRestoreRefreshResult = {
  kaiten: "skipped" | "ok" | "error";
  kaitenReason?: string;
  mailAccounts: number;
  mailError?: string;
};

export async function refreshCrmAfterRestore(): Promise<PostRestoreRefreshResult> {
  const db = new PrismaClient();
  const out: PostRestoreRefreshResult = {
    kaiten: "skipped",
    mailAccounts: 0,
  };
  try {
    const tenants = await db.tenant.findMany({ select: { id: true } });
    const auth = getKaitenRestAuth();
    let kaitenOn = false;
    for (const t of tenants) {
      if (await isKaitenIntegrationActive(db, t.id)) {
        kaitenOn = true;
        break;
      }
    }
    if (kaitenOn && auth) {
      try {
        for (let i = 0; i < KAITEN_REFRESH_TICKS; i += 1) {
          await syncKaitenChatsInBackground(db, auth, {
            limit: 120,
            perTenantLimit: 40,
          });
        }
        out.kaiten = "ok";
      } catch (e) {
        out.kaiten = "error";
        out.kaitenReason = e instanceof Error ? e.message : "ошибка Kaiten";
        console.error("[crm-backup] post-restore kaiten", e);
      }
    } else if (kaitenOn && !auth) {
      out.kaiten = "skipped";
      out.kaitenReason = "Kaiten не настроен на сервере";
    }

    const accounts = await db.emailAccount.findMany({
      where: {
        isActive: true,
        createdByUserId: { not: null },
        encryptedAppPassword: { not: null },
      },
      select: {
        id: true,
        tenantId: true,
        createdByUserId: true,
      },
    });
    try {
      for (const acc of accounts) {
        if (!acc.createdByUserId) continue;
        await enqueueAndStartMailSyncJob(
          db,
          acc.tenantId,
          acc.createdByUserId,
          "OWNER",
          acc.id,
          EmailSyncMode.RECENT,
          { wait: true, scope: "priority" },
        );
        out.mailAccounts += 1;
      }
    } catch (e) {
      out.mailError = e instanceof Error ? e.message : "ошибка почты";
      console.error("[crm-backup] post-restore mail", e);
    }
    return out;
  } finally {
    await db.$disconnect();
  }
}
