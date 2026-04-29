import "server-only";

import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getPrisma } from "@/lib/get-prisma";
import { userActivityDisplayLabel } from "@/lib/user-activity-display-label";

/**
 * Пользователь и подпись для записей в журнале (наряды, контрагенты).
 * Без сессии — из CRM_ACTOR_NAME или запасной строки (фоновые задачи).
 */
export async function getActorForRevision(): Promise<{
  userId: string | null;
  label: string;
}> {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    const env = process.env.CRM_ACTOR_NAME?.trim();
    return { userId: null, label: env || "Система" };
  }
  const db = await getPrisma();
  const u = await db.user.findUnique({
    where: { id: session.sub },
    select: { mentionHandle: true, displayName: true, email: true },
  });
  if (!u) {
    return { userId: session.sub, label: "Пользователь" };
  }
  return {
    userId: session.sub,
    label: userActivityDisplayLabel(u),
  };
}
