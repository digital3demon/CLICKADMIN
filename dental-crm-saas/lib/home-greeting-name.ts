import "server-only";

import { getSessionFromCookies } from "@/lib/auth/session-server";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import { getPrisma } from "@/lib/get-prisma";

/**
 * Имя для приветствия на главной: «Имя для отображения» из профиля (как в настройках),
 * без сокращения до «Фамилия И.О.».
 */
export async function getHomeGreetingDisplayName(): Promise<string> {
  const session = await getSessionFromCookies();
  if (!session) return "коллега";

  if (isSingleUserPortable()) {
    return session.name.trim() || "Пользователь";
  }

  const prisma = await getPrisma();
  const u = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { displayName: true },
  });
  const fromProfile = u?.displayName?.trim();
  if (fromProfile) return fromProfile;

  const fromJwt = session.name?.trim();
  if (fromJwt) return fromJwt;

  const prefix = session.email.split("@")[0]?.trim();
  return prefix || "коллега";
}
