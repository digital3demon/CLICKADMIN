import { NextResponse } from "next/server";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import {
  ensureDefaultWarehouse,
  repairDefaultWarehouseFlag,
} from "@/lib/inventory/ensure-default-warehouse";
import { loadOrderRefsByIds } from "@/lib/inventory/order-lookup";

/**
 * Один ответ для страницы склада: меньше HTTP-раундтрипов и одна инициализация складов.
 */
export async function GET() {
  try {
    const prisma = getPricingPrismaClient();
    await ensureDefaultWarehouse();
    await repairDefaultWarehouseFlag();

    const [warehouses, items, balancesRows, itemsNeverTouched, movements] =
      await Promise.all([
        prisma.warehouse.findMany({
          where: { isActive: true },
          orderBy: [{ isDefault: "desc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            isDefault: true,
            isActive: true,
            notes: true,
            warehouseType: true,
          },
        }),
        prisma.inventoryItem.findMany({
          orderBy: [
            { warehouse: { name: "asc" } },
            { sortOrder: "asc" },
            { name: "asc" },
          ],
          select: {
            id: true,
            warehouseId: true,
            sku: true,
            name: true,
            unit: true,
            manufacturer: true,
            unitsPerSupply: true,
            referenceUnitPriceRub: true,
            notes: true,
            isActive: true,
            warehouse: { select: { id: true, name: true, warehouseType: true } },
          },
        }),
        prisma.stockBalance.findMany({
          where: { item: { isActive: true } },
          orderBy: [
            { warehouse: { name: "asc" } },
            { item: { name: "asc" } },
          ],
          include: {
            item: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
                warehouseId: true,
                manufacturer: true,
                unitsPerSupply: true,
              },
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
        prisma.stockMovement.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
          include: {
            item: {
              select: {
                id: true,
                sku: true,
                name: true,
                unit: true,
                manufacturer: true,
                warehouseId: true,
                unitsPerSupply: true,
              },
            },
            warehouse: {
              select: { id: true, name: true, warehouseType: true },
            },
          },
        }),
      ]);
    const orderRefs = await loadOrderRefsByIds(movements.map((x) => x.orderId));

    return NextResponse.json({
      warehouses,
      items,
      balances: balancesRows.map((r) => ({
        id: r.id,
        quantityOnHand: r.quantityOnHand,
        averageUnitCostRub: r.averageUnitCostRub,
        item: r.item,
        warehouse: r.warehouse,
      })),
      itemsNeverTouched,
      movements: movements.map((x) => ({
        ...x,
        order: x.orderId ? orderRefs.get(x.orderId) ?? null : null,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось загрузить данные склада" },
      { status: 500 },
    );
  }
}
