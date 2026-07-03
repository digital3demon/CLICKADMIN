import type { Prisma } from "@prisma/client";

/** Наряды, созданные или изменённые за период отключения Kaiten. */
export function ordersChangedDuringDisabledWhere(input: {
  tenantId: string;
  disabledFrom: Date;
}): Prisma.OrderWhereInput {
  return {
    tenantId: input.tenantId,
    archivedAt: null,
    isTestOrder: false,
    OR: [
      { createdAt: { gte: input.disabledFrom } },
      { updatedAt: { gte: input.disabledFrom } },
    ],
  };
}
