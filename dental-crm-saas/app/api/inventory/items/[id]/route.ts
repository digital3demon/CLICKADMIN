import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
type RouteCtx = { params: Promise<{ id: string }> };

type PatchBody = {
  name?: string;
  sku?: string | null;
  unit?: string | null;
  manufacturer?: string | null;
  unitsPerSupply?: number | null;
  referenceUnitPriceRub?: number | null;
  notes?: string | null;
  isActive?: boolean;
};

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Нет id" }, { status: 400 });
    }

    const body = (await req.json()) as PatchBody;
    const prisma = await getPrisma();
    const existing = await prisma.inventoryItem.findUnique({
      where: { id: id.trim() },
      select: { id: true, sku: true, warehouseId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 });
    }

    const sku = body.sku !== undefined ? (body.sku?.trim() || null) : undefined;
    if (sku && sku !== existing.sku) {
      const taken = await prisma.inventoryItem.findFirst({
        where: {
          sku,
          warehouseId: existing.warehouseId,
          NOT: { id: id.trim() },
        },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json({ error: "На этом складе артикул уже занят" }, { status: 409 });
      }
    }

    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json({ error: "Пустое наименование" }, { status: 400 });
    }

    let unitsPerSupply: number | null | undefined = undefined;
    if (body.unitsPerSupply !== undefined) {
      if (body.unitsPerSupply == null) {
        unitsPerSupply = null;
      } else if (!Number.isFinite(body.unitsPerSupply) || body.unitsPerSupply <= 0) {
        return NextResponse.json(
          { error: "«Поставка» должна быть числом больше нуля или пусто" },
          { status: 400 },
        );
      } else {
        unitsPerSupply = body.unitsPerSupply;
      }
    }

    let referenceUnitPriceRub: number | null | undefined = undefined;
    if (body.referenceUnitPriceRub !== undefined) {
      if (body.referenceUnitPriceRub == null) {
        referenceUnitPriceRub = null;
      } else if (!Number.isFinite(body.referenceUnitPriceRub)) {
        return NextResponse.json({ error: "Некорректная цена" }, { status: 400 });
      } else {
        referenceUnitPriceRub = body.referenceUnitPriceRub;
      }
    }

    const row = await prisma.inventoryItem.update({
      where: { id: id.trim() },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(sku !== undefined ? { sku } : {}),
        ...(body.unit !== undefined ? { unit: body.unit?.trim() || "шт" } : {}),
        ...(body.manufacturer !== undefined
          ? { manufacturer: body.manufacturer?.trim() || null }
          : {}),
        ...(unitsPerSupply !== undefined ? { unitsPerSupply } : {}),
        ...(referenceUnitPriceRub !== undefined ? { referenceUnitPriceRub } : {}),
        ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
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
      },
    });
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось обновить позицию" },
      { status: 500 },
    );
  }
}
