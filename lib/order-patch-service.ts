import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";

export async function savePatchedOrder<TInclude extends Prisma.OrderInclude>(
  db: PrismaClient,
  params: {
    orderId: string;
    scalarData: Prisma.OrderUncheckedUpdateInput;
    constructionsUpdate?: Prisma.OrderUpdateInput["constructions"];
    include: TInclude;
  },
): Promise<Prisma.OrderGetPayload<{ include: TInclude }>> {
  const { orderId, scalarData, constructionsUpdate, include } = params;
  return db.$transaction((tx) =>
    tx.order.update({
      where: { id: orderId },
      data: {
        ...scalarData,
        ...(constructionsUpdate ? { constructions: constructionsUpdate } : {}),
      },
      include,
    }),
  );
}
