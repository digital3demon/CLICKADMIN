import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { buildConstructionCreatesFromInput } from "./order-construction-input";

function makePrisma(priceListItems: Array<{
  id: string;
  priceRub: number;
  variablePrice: boolean;
}>) {
  return {
    constructionType: {
      findMany: async () => [],
    },
    priceListItem: {
      findMany: async ({
        where,
      }: {
        where: { id: { in: string[] } };
      }) =>
        priceListItems.filter((p) => where.id.in.includes(p.id)),
    },
    material: {
      findMany: async () => [],
    },
    clinicPriceOverride: { findMany: async () => [] },
    doctorPriceOverride: { findMany: async () => [] },
    doctorClinicPriceOverride: { findMany: async () => [] },
  } as unknown as PrismaClient;
}

describe("buildConstructionCreatesFromInput — variablePrice", () => {
  const deliveryId = "pl-delivery";

  it("сохраняет ручную цену для позиции с variablePrice", async () => {
    const prisma = makePrisma([
      { id: deliveryId, priceRub: 500, variablePrice: true },
    ]);
    const result = await buildConstructionCreatesFromInput(prisma, [
      { priceListItemId: deliveryId, quantity: 1, unitPrice: 750 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.creates[0]?.unitPrice).toBe(750);
  });

  it("игнорирует ручную цену без variablePrice", async () => {
    const prisma = makePrisma([
      { id: deliveryId, priceRub: 500, variablePrice: false },
    ]);
    const result = await buildConstructionCreatesFromInput(prisma, [
      { priceListItemId: deliveryId, quantity: 1, unitPrice: 750 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.creates[0]?.unitPrice).toBe(500);
  });

  it("для variablePrice без unitPrice берёт цену из прайса", async () => {
    const prisma = makePrisma([
      { id: deliveryId, priceRub: 500, variablePrice: true },
    ]);
    const result = await buildConstructionCreatesFromInput(prisma, [
      { priceListItemId: deliveryId, quantity: 1 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.creates[0]?.unitPrice).toBe(500);
  });
});
