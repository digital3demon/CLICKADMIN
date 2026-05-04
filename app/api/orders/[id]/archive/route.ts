import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getKaitenRestAuth, kaitenArchiveCard } from "@/lib/kaiten-rest";
import { archivedOrderNumberPlaceholder } from "@/lib/order-number";

export const dynamic = "force-dynamic";

/** Снять привязку к доске / демо-канбану (карточка в Kaiten архивируется отдельно). */
const CLEAR_BOARD_MIRROR = {
  kaitenCardId: null,
  kaitenColumnTitle: null,
  kaitenCardSortOrder: null,
  kaitenCardTitleMirror: null,
  kaitenCardDescriptionMirror: null,
  kaitenBlocked: false,
  kaitenBlockReason: null,
  kaitenSyncedAt: null,
  demoKanbanColumn: null,
} as const;

/** Отправить наряд в архив: архивируем карточку Kaiten (без удаления), затем снимаем зеркало канбана. */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const orderId = id?.trim() ?? "";
  if (!orderId) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const prisma = await getOrdersPrisma();
  const row = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      archivedAt: true,
      kaitenCardId: true,
    },
  });
  if (!row) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }
  if (row.archivedAt != null) {
    return NextResponse.json({ ok: true, alreadyArchived: true });
  }

  let kaitenSyncError: string | null = null;
  if (!session.demo && row.kaitenCardId != null) {
    const auth = getKaitenRestAuth();
    if (auth) {
      const arch = await kaitenArchiveCard(auth, row.kaitenCardId);
      if (!arch.ok) {
        kaitenSyncError = arch.error ?? `Kaiten HTTP ${arch.status}`;
        console.error("[POST order archive] kaiten archive", kaitenSyncError);
      }
    }
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      archivedAt: new Date(),
      orderNumber: archivedOrderNumberPlaceholder(orderId),
      ...CLEAR_BOARD_MIRROR,
      kaitenSyncError,
    },
  });

  return NextResponse.json({ ok: true });
}
