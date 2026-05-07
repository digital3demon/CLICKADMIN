import "server-only";

import { deleteOrderAttachmentFile } from "@/lib/order-attachment-storage";
import { clampOrderArchiveRetentionDays } from "@/lib/order-archive-retention";
import { logger } from "@/lib/server/logger";
import type { PrismaClient } from "@prisma/client";

const BATCH_LIMIT = 100;

export async function purgeArchivedOrdersForTenant(
  ordersPrisma: PrismaClient,
  tenantId: string,
): Promise<{ checked: number; deleted: number }> {
  const tenant = await ordersPrisma.tenant.findUnique({
    where: { id: tenantId },
    select: { orderArchiveRetentionDays: true },
  });
  const retentionDays = clampOrderArchiveRetentionDays(
    tenant?.orderArchiveRetentionDays,
  );
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const rows = await ordersPrisma.order.findMany({
    where: {
      tenantId,
      archivedAt: { not: null, lte: cutoff },
    },
    orderBy: { archivedAt: "asc" },
    take: BATCH_LIMIT,
    select: {
      id: true,
      attachments: {
        select: {
          id: true,
          diskRelPath: true,
        },
      },
    },
  });

  let deleted = 0;
  for (const row of rows) {
    let canDeleteOrder = true;
    for (const a of row.attachments) {
      try {
        await deleteOrderAttachmentFile(a.diskRelPath);
      } catch (e) {
        canDeleteOrder = false;
        logger.error(
          { err: e, orderId: row.id, attachmentId: a.id, msg: "archive_purge_attachment_delete_failed" },
          "purgeArchivedOrdersForTenant",
        );
      }
    }
    if (!canDeleteOrder) continue;
    try {
      await ordersPrisma.order.delete({ where: { id: row.id } });
      deleted += 1;
    } catch (e) {
      logger.error(
        { err: e, orderId: row.id, msg: "archive_purge_order_delete_failed" },
        "purgeArchivedOrdersForTenant",
      );
    }
  }

  return { checked: rows.length, deleted };
}
