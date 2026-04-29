import type { StockMovementKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import { applyStockMovement } from "@/lib/inventory/apply-stock-movement";

/**
 * Отмена эффекта одной строки журнала: создаётся компенсирующее движение
 * (идемпотентность `reverse-${id}` — повторный клик безопасен).
 * Расход по наряду без возврата — через POST …/return-to-warehouse.
 */
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

    const m = await prisma.stockMovement.findUnique({
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

    if (!m) {
      return NextResponse.json({ error: "Строка не найдена" }, { status: 404 });
    }

    if (!Number.isFinite(m.quantity) || m.quantity <= 0) {
      return NextResponse.json({ error: "Некорректное количество в строке" }, { status: 400 });
    }

    if (m.kind === "SALE_ISSUE") {
      return NextResponse.json(
        {
          error:
            "Для расхода по наряду используйте «Вернуть на склад» в этой же строке — это и есть отмена списания.",
        },
        { status: 400 },
      );
    }

    const idempotencyKey = `reverse-${m.id}`;
    const note = `Отмена строки журнала ${m.kind} (${m.id})`;

    let compensatingKind: StockMovementKind;
    switch (m.kind) {
      case "PURCHASE_RECEIPT":
        compensatingKind = "ADJUSTMENT_MINUS";
        break;
      case "ADJUSTMENT_PLUS":
        compensatingKind = "ADJUSTMENT_MINUS";
        break;
      case "ADJUSTMENT_MINUS":
        compensatingKind = "ADJUSTMENT_PLUS";
        break;
      case "DEFECT_WRITE_OFF":
        compensatingKind = "ADJUSTMENT_PLUS";
        break;
      case "RETURN_IN":
        compensatingKind = "ADJUSTMENT_MINUS";
        break;
      default:
        return NextResponse.json(
          { error: "Этот вид движения нельзя отменить из журнала автоматически" },
          { status: 400 },
        );
    }

    await prisma.$transaction((tx) =>
      applyStockMovement(tx, {
        kind: compensatingKind,
        itemId: m.itemId,
        warehouseId: m.warehouseId,
        quantity: m.quantity,
        orderId: m.orderId,
        note,
        idempotencyKey,
      }),
    );

    return NextResponse.json({ ok: true });
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
      { error: "Не удалось отменить движение" },
      { status: 500 },
    );
  }
}
