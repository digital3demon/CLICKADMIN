import "server-only";

import { crmPublicBaseUrl } from "@/lib/crm-public-base-url";
import {
  collectDeadlineReminderJobs,
  deadlineReminderSentKey,
  KANBAN_DEADLINE_REMINDER_STATE_KEY,
  parseDeadlineReminderSentState,
} from "@/lib/kanban-deadline-reminder";
import { loadKanbanTenantState } from "@/lib/kanban/kanban-tenant-state-write.server";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { getPrisma } from "@/lib/get-prisma";
import { moscowTodayYmd } from "@/lib/shipments-date-range";
import { escapeTelegramHtml, telegramHtmlLink } from "@/lib/telegram-html";
import { notifyKanbanTelegramTargetUsers } from "@/lib/telegram-kanban-notify";
import { cronLogger } from "@/lib/server/logger";

export async function runKanbanDeadlineReminders(opts?: {
  todayYmd?: string;
}): Promise<{
  tenants: number;
  sent: number;
  skipped: number;
}> {
  const todayYmd = (opts?.todayYmd || moscowTodayYmd()).slice(0, 10);
  const prisma = await getPrisma();
  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  const origin = crmPublicBaseUrl().replace(/\/+$/, "");
  let sent = 0;
  let skipped = 0;

  for (const t of tenants) {
    const { state } = await loadKanbanTenantState(t.id);
    if (!state) continue;
    const jobs = collectDeadlineReminderJobs(state, todayYmd);
    if (jobs.length === 0) continue;

    const row = await prisma.tenantClientState.findUnique({
      where: {
        tenantId_key: { tenantId: t.id, key: KANBAN_DEADLINE_REMINDER_STATE_KEY },
      },
      select: { value: true },
    });
    const prev = parseDeadlineReminderSentState(row?.value);
    const already = new Set(prev.ymd === todayYmd ? prev.keys : []);
    const nextKeys = [...already];

    for (const job of jobs) {
      const fresh = job.userIds.filter(
        (uid) => !already.has(deadlineReminderSentKey(job.card.id, uid)),
      );
      if (fresh.length === 0) {
        skipped += job.userIds.length;
        continue;
      }
      const title = (job.card.title || "").trim() || "Без названия";
      const href = job.card.linkedOrderId
        ? `${origin}${kanbanOrderDeepLinkPath(job.card.linkedOrderId)}`
        : `${origin}/kanban?card=${encodeURIComponent(job.card.id)}&board=${encodeURIComponent(job.boardId)}`;
      const link = telegramHtmlLink(href, title);
      const dueEsc = escapeTelegramHtml(todayYmd);
      try {
        await notifyKanbanTelegramTargetUsers(prisma, {
          event: "tg_deadline_reminder",
          actorUserId: null,
          targetUserIds: fresh,
          parseMode: "HTML",
          lines: [`Сегодня срок (${dueEsc}) по карточке ${link}`],
          tenantId: t.id,
        });
        for (const uid of fresh) {
          nextKeys.push(deadlineReminderSentKey(job.card.id, uid));
          sent += 1;
        }
      } catch (e) {
        cronLogger.error({ err: e, tenantId: t.id }, "deadline reminder send");
      }
    }

    await prisma.tenantClientState.upsert({
      where: {
        tenantId_key: { tenantId: t.id, key: KANBAN_DEADLINE_REMINDER_STATE_KEY },
      },
      create: {
        tenantId: t.id,
        key: KANBAN_DEADLINE_REMINDER_STATE_KEY,
        value: { ymd: todayYmd, keys: nextKeys } as never,
      },
      update: {
        value: { ymd: todayYmd, keys: nextKeys } as never,
      },
    });
  }

  return { tenants: tenants.length, sent, skipped };
}
