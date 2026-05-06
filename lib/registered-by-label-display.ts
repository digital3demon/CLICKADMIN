import "server-only";

import { getPrisma } from "@/lib/get-prisma";

const STORED_MENTION_RE = /^@([a-zA-Z0-9_]+)$/;

/** В БД «Оформил» мог сохраниться как @ник — для экрана показываем ФИО из профиля. */
export async function resolveRegisteredByLabelForDisplay(
  tenantId: string,
  stored: string | null | undefined,
): Promise<string | null> {
  const raw = (stored ?? "").trim();
  if (!raw) return null;
  const m = raw.match(STORED_MENTION_RE);
  if (!m) return raw;
  const handle = m[1]!;
  const db = await getPrisma();
  const u = await db.user.findFirst({
    where: { tenantId, mentionHandle: handle },
    select: { displayName: true },
  });
  const name = (u?.displayName ?? "").trim();
  return name || raw;
}
