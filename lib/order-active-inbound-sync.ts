import type { Prisma } from "@prisma/client";

/** Активный наряд для inbound Kaiten: не отгружен (флаг «Работа отправлена»). */
export function orderActiveInboundSyncWhere(): Prisma.OrderWhereInput {
  return { adminShippedOtpr: false };
}
