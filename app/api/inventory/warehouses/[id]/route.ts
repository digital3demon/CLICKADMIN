import { NextResponse } from "next/server";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import {
  ensureDefaultWarehouse,
  repairDefaultWarehouseFlag,
} from "@/lib/inventory/ensure-default-warehouse";

type RouteCtx = { params: Promise<{ id: string }> };

type PatchBody = {
  name?: string;
  warehouseType?: string | null;
  notes?: string | null;
  isDefault?: boolean;
  isActive?: boolean;
};

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const prisma = getPricingPrismaClient();
    const { id } = await ctx.params;
    const wid = id?.trim() ?? "";
    if (!wid) {
      return NextResponse.json({ error: "Нет id" }, { status: 400 });
    }

    const body = (await req.json()) as PatchBody;
    const existing = await prisma.warehouse.findUnique({
      where: { id: wid },
      select: { id: true, isActive: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Склад не найден" }, { status: 404 });
    }

    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json({ error: "Пустое название" }, { status: 400 });
    }

    const nextActive =
      body.isActive !== undefined ? body.isActive : existing.isActive;
    if (body.isDefault === true && !nextActive) {
      return NextResponse.json(
        { error: "Нельзя сделать основным неактивный склад" },
        { status: 400 },
      );
    }

    if (body.isDefault === true) {
      await prisma.warehouse.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const row = await prisma.warehouse.update({
      where: { id: wid },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
        ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
      select: {
        id: true,
        name: true,
        isDefault: true,
        isActive: true,
        notes: true,
      },
    });

    await repairDefaultWarehouseFlag();
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось обновить склад" },
      { status: 500 },
    );
  }
}

/**
 * Полное удаление склада — только если по нему нет ни одной записи в журнале движений.
 */
export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const prisma = getPricingPrismaClient();
    const { id } = await ctx.params;
    const wid = id?.trim() ?? "";
    if (!wid) {
      return NextResponse.json({ error: "Нет id" }, { status: 400 });
    }

    const existing = await prisma.warehouse.findUnique({
      where: { id: wid },
      select: { id: true, name: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Склад не найден" }, { status: 404 });
    }

    const movementCount = await prisma.stockMovement.count({
      where: { warehouseId: wid },
    });
    if (movementCount > 0) {
      return NextResponse.json(
        {
          error:
            "Нельзя удалить склад: по нему есть движения в журнале. Используйте «Скрыть» или обратитесь к администратору.",
        },
        { status: 409 },
      );
    }

    const itemCount = await prisma.inventoryItem.count({
      where: { warehouseId: wid },
    });
    if (itemCount > 0) {
      return NextResponse.json(
        {
          error:
            "Нельзя удалить склад: есть складские позиции. Удалите или перенесите позиции, либо скройте склад.",
        },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockBalance.deleteMany({ where: { warehouseId: wid } });
      await tx.warehouse.delete({ where: { id: wid } });
    });

    await repairDefaultWarehouseFlag();
    await ensureDefaultWarehouse();

    return NextResponse.json({ ok: true, deletedId: wid });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось удалить склад" },
      { status: 500 },
    );
  }
}
