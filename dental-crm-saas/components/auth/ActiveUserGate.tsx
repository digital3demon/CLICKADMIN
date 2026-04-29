import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/get-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { isSingleUserPortable } from "@/lib/auth/single-user";

/**
 * Сбрасывает сессию, если учётная запись отключена (JWT в middleware ещё валиден).
 */
export async function ActiveUserGate() {
  if (isSingleUserPortable()) return null;
  const session = await getSessionFromCookies();
  if (!session) return null;
  const prisma = await getPrisma();
  const u = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { isActive: true },
  });
  if (!u?.isActive) {
    redirect(
      "/api/auth/logout-and-go?next=" +
        encodeURIComponent("/login?reason=inactive"),
    );
  }
  return null;
}
