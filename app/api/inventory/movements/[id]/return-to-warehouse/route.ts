import { NextResponse } from "next/server";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import { applyStockMovement } from "@/lib/inventory/apply-stock-movement";
import { loadOrderRefsByIds } from "@/lib/inventory/order-lookup";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const prisma = getPricingPrismaClient();
    const { id } = await ctx.params;
    const movementId = id?.trim();
    if (!movementId) {
      return NextResponse.json({ error: "Не указана строка журнала" }, { status: 400 });
    }

    const sale = await prisma.stockMovement.findUnique({
      where: { id: movementId },
      select: {
        id: true,
        kind: true,
        quantity: true,
        itemId: true,
        warehouseId: true,
        orderId: true,
        returnedToWarehouseAt: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Строка не найдена" }, { status: 404 });
    }
    if (sale.kind !== "SALE_ISSUE") {
      return NextResponse.json(
        { error: "Возврат доступен только для расхода по наряду" },
        { status: 400 },
      );
    }
    if (sale.returnedToWarehouseAt != null) {
      return NextResponse.json({ error: "Уже возвращено на склад" }, { status: 409 });
    }

    const idempotencyKey = `return-for-${sale.id}`;

    await prisma.$transaction(async (tx) => {
      await applyStockMovement(tx, {
        kind: "RETURN_IN",
        itemId: sale.itemId,
        warehouseId: sale.warehouseId,
        quantity: sale.quantity,
        orderId: sale.orderId,
        note: `Возврат по расходу из журнала (${sale.id})`,
        idempotencyKey,
      });

      await tx.stockMovement.update({
        where: { id: sale.id },
        data: { returnedToWarehouseAt: new Date() },
      });
    });

    const updated = await prisma.stockMovement.findUniqueOrThrow({
      where: { id: movementId },
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            name: true,
            unit: true,
            warehouseId: true,
            unitsPerSupply: true,
          },
        },
        warehouse: { select: { id: true, name: true } },
      },
    });
    const orderRefs = await loadOrderRefsByIds([updated.orderId]);
    return NextResponse.json({
      ok: true,
      movement: {
        ...updated,
        order: updated.orderId ? orderRefs.get(updated.orderId) ?? null : null,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка";
    if (
      msg.includes("Недостаточно") ||
      msg.includes("не найден") ||
      msg.includes("неактивен") ||
      msg.includes("не совпадает")
    ) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось выполнить возврат на склад" },
      { status: 500 },
    );
  }
}
