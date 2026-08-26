import type { Prisma, StockMovementKind } from "@prisma/client";
import { costCorrectionPriceOrSkip } from "@/lib/inventory/sale-unit-price";

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
    case "MANUAL_ISSUE":
    case "ADJUSTMENT_MINUS":
    case "DEFECT_WRITE_OFF":
      return -quantity;
    case "COST_CORRECTION":
      return 0;
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

  if (kind === "COST_CORRECTION") {
    throw new Error(
      "Коррекцию стоимости записывайте пачкой (несколько позиций)",
    );
  }

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

  if (kind === "SALE_ISSUE" && !orderId?.trim()) {
    throw new Error("Для расхода по наряду укажите заказ");
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
    kind === "MANUAL_ISSUE" ||
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

export type ApplyCostCorrectionInput = {
  itemIds: string[];
  warehouseId: string;
  purchaseUnitRub: unknown;
  saleUnitRub: unknown;
  note?: string | null;
  actorLabel?: string;
};

/**
 * Остаток не меняется. Цена 0 / пусто — это поле не трогаем.
 * Закупка > 0: справочная + средняя на остатке. Реализация > 0: saleUnitPriceRub.
 */
export async function applyCostCorrection(
  tx: Prisma.TransactionClient,
  input: ApplyCostCorrectionInput,
): Promise<{ movementIds: string[]; updated: number }> {
  const purchase = costCorrectionPriceOrSkip(input.purchaseUnitRub);
  const sale = costCorrectionPriceOrSkip(input.saleUnitRub);
  if (purchase === "invalid" || sale === "invalid") {
    throw new Error("Укажите корректные цены (0 — не менять)");
  }
  if (purchase == null && sale == null) {
    throw new Error("Укажите закупку или реализацию больше нуля");
  }

  const ids = [
    ...new Set(input.itemIds.map((x) => String(x ?? "").trim()).filter(Boolean)),
  ];
  if (ids.length === 0) {
    throw new Error("Выберите хотя бы одну позицию");
  }

  const warehouse = await tx.warehouse.findFirst({
    where: { id: input.warehouseId, isActive: true },
    select: { id: true },
  });
  if (!warehouse) throw new Error("Склад не найден или неактивен");

  const items = await tx.inventoryItem.findMany({
    where: { id: { in: ids }, isActive: true },
    select: { id: true, warehouseId: true },
  });
  if (items.length !== ids.length) {
    throw new Error("Позиция не найдена или снята с учёта");
  }
  for (const it of items) {
    if (it.warehouseId !== input.warehouseId) {
      throw new Error(
        "Склад операции не совпадает со складом позиции — выберите склад, к которому привязана позиция",
      );
    }
  }

  const parts: string[] = [];
  if (purchase != null) parts.push(`закупка ${purchase}`);
  if (sale != null) parts.push(`реализация ${sale}`);
  const userNote = input.note?.trim() || "";
  const note = [parts.join(", "), userNote].filter(Boolean).join(". ");

  const movementIds: string[] = [];
  for (const itemId of ids) {
    if (purchase != null) {
      await tx.inventoryItem.update({
        where: { id: itemId },
        data: { referenceUnitPriceRub: purchase },
      });
      await tx.stockBalance.upsert({
        where: { itemId_warehouseId: { itemId, warehouseId: input.warehouseId } },
        create: {
          itemId,
          warehouseId: input.warehouseId,
          quantityOnHand: 0,
          averageUnitCostRub: purchase,
        },
        update: { averageUnitCostRub: purchase },
      });
    }
    if (sale != null) {
      await tx.inventoryItem.update({
        where: { id: itemId },
        data: { saleUnitPriceRub: sale },
      });
    }

    const bal = await tx.stockBalance.findUnique({
      where: { itemId_warehouseId: { itemId, warehouseId: input.warehouseId } },
      select: { quantityOnHand: true },
    });
    const qtyOnHand = bal?.quantityOnHand ?? 0;
    const totalCostRub =
      purchase != null ? Math.round(qtyOnHand * purchase * 100) / 100 : null;

    const movement = await tx.stockMovement.create({
      data: {
        kind: "COST_CORRECTION",
        quantity: 1,
        totalCostRub,
        note: note || null,
        itemId,
        warehouseId: input.warehouseId,
        actorLabel: input.actorLabel ?? "Пользователь",
      },
    });
    movementIds.push(movement.id);
  }

  return { movementIds, updated: ids.length };
}
