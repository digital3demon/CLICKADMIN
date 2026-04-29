import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";

export async function GET() {
  try {
    const prisma = await getPrisma();
    const full = await prisma.inventoryItem.findMany({
      orderBy: [
        { warehouse: { name: "asc" } },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
      include: {
        warehouse: { select: { id: true, name: true } },
        balances: {
          select: { warehouseId: true, quantityOnHand: true, averageUnitCostRub: true },
        },
      },
    });
    const mapped = full.map((it) => {
      const b = it.balances.find((x) => x.warehouseId === it.warehouseId);
      return {
        id: it.id,
        warehouseId: it.warehouseId,
        warehouse: it.warehouse,
        sku: it.sku,
        name: it.name,
        unit: it.unit,
        manufacturer: it.manufacturer,
        unitsPerSupply: it.unitsPerSupply,
        referenceUnitPriceRub: it.referenceUnitPriceRub,
        notes: it.notes,
        isActive: it.isActive,
        quantityOnHand: b?.quantityOnHand ?? 0,
        averageUnitCostRub: b?.averageUnitCostRub ?? null,
      };
    });
    return NextResponse.json(mapped);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось загрузить позиции" },
      { status: 500 },
    );
  }
}

type PostBody = {
  warehouseId?: string;
  name?: string;
  sku?: string | null;
  unit?: string | null;
  manufacturer?: string | null;
  unitsPerSupply?: number | null;
  referenceUnitPriceRub?: number | null;
  notes?: string | null;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PostBody;
    const warehouseId = body.warehouseId?.trim() ?? "";
    if (!warehouseId) {
      return NextResponse.json({ error: "Укажите склад" }, { status: 400 });
    }
    const wh = await (await getPrisma()).warehouse.findFirst({
      where: { id: warehouseId, isActive: true },
      select: { id: true },
    });
    if (!wh) {
      return NextResponse.json({ error: "Склад не найден или скрыт" }, { status: 400 });
    }

    const name = body.name?.trim() ?? "";
    if (!name) {
      return NextResponse.json({ error: "Укажите наименование" }, { status: 400 });
    }
    const sku = body.sku?.trim() || null;
    if (sku) {
      const taken = await (await getPrisma()).inventoryItem.findFirst({
        where: { warehouseId, sku },
        select: { id: true },
      });
      if (taken) {
        return NextResponse.json(
          { error: "На этом складе артикул уже занят" },
          { status: 409 },
        );
      }
    }

    const unitsPerSupply =
      body.unitsPerSupply != null && Number.isFinite(body.unitsPerSupply)
        ? body.unitsPerSupply
        : null;
    if (unitsPerSupply != null && unitsPerSupply <= 0) {
      return NextResponse.json(
        { error: "«Поставка» должна быть больше нуля" },
        { status: 400 },
      );
    }

    const refPrice =
      body.referenceUnitPriceRub != null && Number.isFinite(body.referenceUnitPriceRub)
        ? body.referenceUnitPriceRub
        : null;

    const row = await (await getPrisma()).inventoryItem.create({
      data: {
        warehouseId,
        name,
        sku,
        unit: body.unit?.trim() || "шт",
        manufacturer: body.manufacturer?.trim() || null,
        unitsPerSupply,
        referenceUnitPriceRub: refPrice,
        notes: body.notes?.trim() || null,
        isActive: true,
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
      { error: "Не удалось создать позицию" },
      { status: 500 },
    );
  }
}
