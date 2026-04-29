import type { OrderStatus } from "@prisma/client";

export type { OrderStatus };

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  REVIEW: "На проверке",
  PLANNING: "Планирование",
  IN_PROGRESS: "В работе",
  IN_DELIVERY: "В доставке",
  DELIVERED: "Доставлен",
  CANCELLED: "Отменён",
};

export const ORDER_STATUS_ORDER: OrderStatus[] = [
  "REVIEW",
  "PLANNING",
  "IN_PROGRESS",
  "IN_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

export function isOrderStatus(v: string): v is OrderStatus {
  return (ORDER_STATUS_ORDER as readonly string[]).includes(v);
}
