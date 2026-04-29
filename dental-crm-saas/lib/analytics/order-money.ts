import type { OrderConstruction } from "@prisma/client";
import { lineAmountRub } from "@/lib/format-order-construction";
import { orderUrgentPriceMultiplier } from "@/lib/order-urgency";

type OrderMoneyFields = {
  isUrgent: boolean;
  urgentCoefficient: number | null;
  constructions: Pick<OrderConstruction, "quantity" | "unitPrice">[];
};

export function constructionsSubtotal(
  constructions: Pick<OrderConstruction, "quantity" | "unitPrice">[],
): number {
  return constructions.reduce(
    (s, c) => s + lineAmountRub(c.quantity, c.unitPrice),
    0,
  );
}

/** Выручка по наряду как в форме: сумма строк × коэффициент срочности. */
export function orderRevenueRub(order: OrderMoneyFields): number {
  const sub = constructionsSubtotal(order.constructions);
  const mult = orderUrgentPriceMultiplier(
    order.isUrgent,
    order.urgentCoefficient,
  );
  return Math.round(sub * mult * 100) / 100;
}
