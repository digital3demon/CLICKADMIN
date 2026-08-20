import type { Prisma } from "@prisma/client";

/** Фильтр по дате ИЛИ закреплённые id (после правки срока в списке). */
export function withKeptOrderIds(
  filter: Prisma.OrderWhereInput,
  keepOrderIds: readonly string[] | null | undefined,
): Prisma.OrderWhereInput {
  const ids = (keepOrderIds ?? []).filter(Boolean);
  if (ids.length === 0) return filter;
  return { OR: [filter, { id: { in: [...ids] } }] };
}
