import type { PrismaClient } from "@prisma/client";
import { getKaitenRestAuth } from "@/lib/kaiten-rest";
import { syncKaitenColumnTitlesForOrderIds } from "@/lib/kaiten-sync-order-column-titles";

/** Обновляет kaitenColumnTitle для нарядов карточки клиента/врача (до 10 карточек с Kaiten). */
export async function syncClientCardOrderKaitenTitles(
  db: PrismaClient,
  orderIds: string[],
): Promise<void> {
  const auth = getKaitenRestAuth();
  if (!auth || orderIds.length === 0) return;

  const rows = await db.order.findMany({
    where: {
      id: { in: orderIds },
      kaitenCardId: { not: null },
      archivedAt: null,
    },
    select: { id: true },
    take: 10,
  });
  if (rows.length === 0) return;

  try {
    await syncKaitenColumnTitlesForOrderIds(
      db,
      auth,
      rows.map((r) => r.id),
      { includeComments: false },
    );
  } catch (e) {
    console.error("[client card] kaiten column sync", e);
  }
}
