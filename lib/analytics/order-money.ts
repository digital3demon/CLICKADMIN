import type { OrderConstruction } from "@prisma/client";
import { orderCompositionSubtotalAfterDiscountsRub } from "@/lib/format-order-construction";
import { orderUrgentPriceMultiplier } from "@/lib/order-urgency";

type OrderMoneyFields = {
  isUrgent: boolean;
  urgentCoefficient: number | null;
  compositionDiscountPercent?: number | null;
  constructions: Pick<
    OrderConstruction,
    "quantity" | "unitPrice" | "lineDiscountPercent"
  >[];
};

export function constructionsSubtotal(
  constructions: Pick<
    OrderConstruction,
    "quantity" | "unitPrice" | "lineDiscountPercent"
  >[],
  compositionDiscountPercent: number | null | undefined,
): number {
  return orderCompositionSubtotalAfterDiscountsRub(
    constructions.map((c) => ({
      quantity: c.quantity,
      unitPrice: c.unitPrice,
      lineDiscountPercent: c.lineDiscountPercent,
    })),
    compositionDiscountPercent,
  );
}

/** Выручка по наряду как в форме: состав с скидками × коэффициент срочности. */
export function orderRevenueRub(order: OrderMoneyFields): number {
  const sub = constructionsSubtotal(
    order.constructions,
    order.compositionDiscountPercent,
  );
  const mult = orderUrgentPriceMultiplier(
    order.isUrgent,
    order.urgentCoefficient,
  );
  return Math.round(sub * mult * 100) / 100;
}
