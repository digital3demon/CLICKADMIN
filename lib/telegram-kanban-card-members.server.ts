import "server-only";

import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { uniqTelegramTargetUserIds } from "@/lib/telegram-kanban-card-scope";

/** Люди карточки из CRM-наряда: ответственные ∪ участники. */
export async function loadOrderKanbanTelegramMemberIds(
  tenantId: string,
  orderId: string,
): Promise<string[]> {
  const tid = tenantId.trim();
  const oid = orderId.trim();
  if (!tid || !oid) return [];
  const prisma = await getOrdersPrisma();
  const row = await prisma.order.findFirst({
    where: { id: oid, tenantId: tid },
    select: { kanbanAssigneeIds: true, kanbanParticipantIds: true },
  });
  if (!row) return [];
  return uniqTelegramTargetUserIds(
    row.kanbanAssigneeIds,
    row.kanbanParticipantIds,
  );
}
