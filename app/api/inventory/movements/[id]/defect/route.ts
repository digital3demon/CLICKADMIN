import type { StockMovementKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import { applyStockMovement } from "@/lib/inventory/apply-stock-movement";
import { loadOrderRefsByIds } from "@/lib/inventory/order-lookup";

const INBOUND_KINDS: StockMovementKind[] = [
  "PURCHASE_RECEIPT",
  "RETURN_IN",
  "ADJUSTMENT_PLUS",
];

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

    const row = await prisma.stockMovement.findUnique({
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

    if (!row) {
      return NextResponse.json({ error: "Строка не найдена" }, { status: 404 });
    }

    if (!Number.isFinite(row.quantity) || row.quantity <= 0) {
      return NextResponse.json({ error: "Некорректное количество в строке" }, { status: 400 });
    }

    if (row.kind === "SALE_ISSUE") {
      if (row.returnedToWarehouseAt != null) {
        return NextResponse.json(
          { error: "По этой строке уже оформлен возврат — брак из журнала недоступен" },
          { status: 409 },
        );
      }

      await prisma.$transaction(async (tx) => {
        await applyStockMovement(tx, {
          kind: "RETURN_IN",
          itemId: row.itemId,
          warehouseId: row.warehouseId,
          quantity: row.quantity,
          orderId: row.orderId,
          note: `Возврат перед браком по расходу из журнала (${row.id})`,
          idempotencyKey: `journal-brak-return-${row.id}`,
        });

        await tx.stockMovement.update({
          where: { id: row.id },
          data: { returnedToWarehouseAt: new Date() },
        });

        await applyStockMovement(tx, {
          kind: "DEFECT_WRITE_OFF",
          itemId: row.itemId,
          warehouseId: row.warehouseId,
          quantity: row.quantity,
          orderId: row.orderId,
          note: `Брак по расходу из журнала (${row.id})`,
          idempotencyKey: `journal-brak-defect-${row.id}`,
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
    }

    if (INBOUND_KINDS.includes(row.kind)) {
      await prisma.$transaction((tx) =>
        applyStockMovement(tx, {
          kind: "DEFECT_WRITE_OFF",
          itemId: row.itemId,
          warehouseId: row.warehouseId,
          quantity: row.quantity,
          orderId: row.orderId,
          note: `Брак по строке журнала ${row.kind} (${row.id})`,
          idempotencyKey: `journal-brak-${row.id}`,
        }),
      );

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      {
        error:
          "Брак из журнала доступен для расхода по наряду (не возвращённого), прихода, возврата на склад или корректировки +",
      },
      { status: 400 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка";
    if (
      msg.includes("Недостаточно") ||
      msg.includes("не найден") ||
      msg.includes("неактивен") ||
      msg.includes("не совпадает") ||
      msg.includes("Должно")
    ) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось оформить брак по строке журнала" },
      { status: 500 },
    );
  }
}
