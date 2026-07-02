import "server-only";

import type { PrismaClient } from "@prisma/client";
import type { ClickMigConfigJson } from "./types";

export async function pickClickMigParticipantUserId(
  prisma: PrismaClient,
  tenantId: string,
  config: ClickMigConfigJson,
): Promise<string | null> {
  const ids = config.participantUserIds.filter(Boolean);
  if (ids.length === 0) return null;

  const max = config.maxCardsPerParticipant;
  const counts = await prisma.clickMigOrder.groupBy({
    by: ["participantUserId"],
    where: {
      tenantId,
      status: { in: ["ACTIVE", "BLOCKED"] },
      participantUserId: { in: ids },
      kanbanColumnId: "col_queue",
    },
    _count: { id: true },
  });

  const countMap = new Map<string, number>();
  for (const id of ids) countMap.set(id, 0);
  for (const row of counts) {
    if (row.participantUserId) {
      countMap.set(row.participantUserId, row._count.id);
    }
  }

  const eligible = ids
    .map((id) => ({ id, count: countMap.get(id) ?? 0 }))
    .filter((x) => x.count < max)
    .sort((a, b) => a.count - b.count);

  return eligible[0]?.id ?? null;
}

export function stageTimerDurationMs(
  config: ClickMigConfigJson,
  stageKey: string,
): number | null {
  const stage = config.stageTimers.find((s) => s.key === stageKey);
  return stage?.durationMs ?? null;
}

export function columnTimerDurationMs(
  config: ClickMigConfigJson,
  columnId: string,
): number | null {
  const col = config.columnTimers.find((c) => c.columnId === columnId);
  return col?.durationMs ?? null;
}
