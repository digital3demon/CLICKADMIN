import { describe, expect, it } from "vitest";
import { lineAllocatedTotalRub } from "@/lib/format-order-construction";
import { orderRevenueRub } from "@/lib/analytics/order-money";

describe("orderRevenueRub", () => {
  it("считает строки, скидки и срочность одним правилом", () => {
    const rub = orderRevenueRub({
      isUrgent: true,
      urgentCoefficient: 1.5,
      compositionDiscountPercent: 10,
      constructions: [
        { quantity: 2, unitPrice: 1000, lineDiscountPercent: 0 },
        { quantity: 1, unitPrice: 500, lineDiscountPercent: 20 },
      ],
    });

    expect(rub).toBe(3240);
  });
});

describe("lineAllocatedTotalRub", () => {
  it("распределяет итог наряда пропорционально строкам", () => {
    const lines = [
      { quantity: 1, unitPrice: 1000, lineDiscountPercent: 0 },
      { quantity: 1, unitPrice: 3000, lineDiscountPercent: 0 },
    ];

    expect(lineAllocatedTotalRub(lines[0], lines, 20, 1)).toBe(800);
    expect(lineAllocatedTotalRub(lines[1], lines, 20, 1)).toBe(2400);
  });

  it("показывает допустимое копеечное расхождение из-за округления строк", () => {
    const lines = [
      { quantity: 1, unitPrice: 1, lineDiscountPercent: 0 },
      { quantity: 1, unitPrice: 1, lineDiscountPercent: 0 },
      { quantity: 1, unitPrice: 1, lineDiscountPercent: 0 },
    ];
    const sum = lines.reduce(
      (acc, line) => acc + lineAllocatedTotalRub(line, lines, 66.67, 1),
      0,
    );

    expect(sum).toBe(0.99);
  });
});
