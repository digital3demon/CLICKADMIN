import type { Prisma, StockMovementKind } from "@prisma/client";

export type ApplyStockMovementInput = {
  kind: StockMovementKind;
  itemId: string;
  warehouseId: string;
  /** Всегда положительное число */
  quantity: number;
  /** Закупочная цена за ед. при PURCHASE_RECEIPT (руб.) */
  unitCostRub?: number | null;
  orderId?: string | null;
  note?: string | null;
  actorLabel?: string;
  idempotencyKey?: string | null;
};

function deltaForKind(kind: StockMovementKind, quantity: number): number {
  switch (kind) {
    case "PURCHASE_RECEIPT":
    case "ADJUSTMENT_PLUS":
    case "RETURN_IN":
      return quantity;
    case "SALE_ISSUE":
    case "ADJUSTMENT_MINUS":
    case "DEFECT_WRITE_OFF":
      return -quantity;
  }
}

/**
 * Атомарно: журнал движения + пересчёт остатка и средней себестоимости (средневзвешенная при приходах).
 */
export async function applyStockMovement(
  tx: Prisma.TransactionClient,
  input: ApplyStockMovementInput,
): Promise<{ movementId: string }> {
  const {
    kind,
    itemId,
    warehouseId,
    quantity,
    unitCostRub,
    orderId,
    note,
    actorLabel = "Пользователь",
    idempotencyKey,
  } = input;

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Количество должно быть положительным числом");
  }

  if (idempotencyKey) {
    const dup = await tx.stockMovement.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });
    if (dup) return { movementId: dup.id };
  }

  if (kind === "SALE_ISSUE") {
    if (!orderId?.trim()) {
      throw new Error("Для расхода по наряду укажите заказ");
    }
    const order = await tx.order.findUnique({
      where: { id: orderId.trim() },
      select: { id: true },
    });
    if (!order) throw new Error("Наряд не найден");
  }

  const item = await tx.inventoryItem.findFirst({
    where: { id: itemId, isActive: true },
    select: { id: true, warehouseId: true },
  });
  if (!item) throw new Error("Позиция не найдена или снята с учёта");
  if (item.warehouseId !== warehouseId) {
    throw new Error(
      "Склад операции не совпадает со складом позиции — выберите склад, к которому привязана позиция",
    );
  }

  const warehouse = await tx.warehouse.findFirst({
    where: { id: warehouseId, isActive: true },
    select: { id: true },
  });
  if (!warehouse) throw new Error("Склад не найден или неактивен");

  const delta = deltaForKind(kind, quantity);

  const balance = await tx.stockBalance.upsert({
    where: {
      itemId_warehouseId: { itemId, warehouseId },
    },
    create: {
      itemId,
      warehouseId,
      quantityOnHand: 0,
      averageUnitCostRub: null,
    },
    update: {},
  });

  const oldQty = balance.quantityOnHand;
  const newQty = oldQty + delta;

  if (newQty < -1e-9) {
    throw new Error(
      `Недостаточно остатка: есть ${oldQty.toFixed(4)}, требуется списать ${quantity}`,
    );
  }

  let newAvg = balance.averageUnitCostRub ?? null;
  let totalCostRub: number | null = null;

  if (kind === "PURCHASE_RECEIPT") {
    const unit = unitCostRub != null && Number.isFinite(unitCostRub) ? unitCostRub : 0;
    totalCostRub = quantity * unit;
    const oldAvg = balance.averageUnitCostRub ?? 0;
    const denom = oldQty + quantity;
    if (denom > 0) {
      newAvg = (oldQty * oldAvg + quantity * unit) / denom;
    } else {
      newAvg = unit;
    }
  } else if (
    kind === "SALE_ISSUE" ||
    kind === "ADJUSTMENT_MINUS" ||
    kind === "DEFECT_WRITE_OFF"
  ) {
    const avg = balance.averageUnitCostRub ?? 0;
    totalCostRub = quantity * avg;
  } else if (kind === "RETURN_IN") {
    const avg = balance.averageUnitCostRub ?? 0;
    totalCostRub = quantity * avg;
  } else {
    totalCostRub = null;
  }

  const movement = await tx.stockMovement.create({
    data: {
      kind,
      quantity,
      totalCostRub,
      note: note?.trim() || null,
      itemId,
      warehouseId,
      orderId: orderId?.trim() || null,
      actorLabel,
      idempotencyKey: idempotencyKey?.trim() || null,
    },
  });

  await tx.stockBalance.update({
    where: { id: balance.id },
    data: {
      quantityOnHand: newQty,
      averageUnitCostRub: newAvg,
    },
  });

  return { movementId: movement.id };
}
