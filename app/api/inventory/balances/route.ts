import { NextResponse } from "next/server";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import { ensureDefaultWarehouse } from "@/lib/inventory/ensure-default-warehouse";

export async function GET() {
  const prisma = getPricingPrismaClient();
  try {
    await ensureDefaultWarehouse();
    const [rows, itemsNeverTouched] = await Promise.all([
      prisma.stockBalance.findMany({
        where: { item: { isActive: true } },
        orderBy: [
          { warehouse: { name: "asc" } },
          { item: { name: "asc" } },
        ],
        include: {
          item: {
            select: { id: true, sku: true, name: true, unit: true },
          },
          warehouse: { select: { id: true, name: true } },
        },
      }),
      prisma.inventoryItem.findMany({
        where: {
          isActive: true,
          balances: { none: {} },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, sku: true, name: true, unit: true },
      }),
    ]);

    return NextResponse.json({
      balances: rows.map((r) => ({
        id: r.id,
        quantityOnHand: r.quantityOnHand,
        averageUnitCostRub: r.averageUnitCostRub,
        item: r.item,
        warehouse: r.warehouse,
      })),
      itemsNeverTouched,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось загрузить остатки" },
      { status: 500 },
    );
  }
}
