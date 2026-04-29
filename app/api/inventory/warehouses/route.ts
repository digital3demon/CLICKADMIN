import { NextResponse } from "next/server";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import {
  ensureDefaultWarehouse,
  repairDefaultWarehouseFlag,
} from "@/lib/inventory/ensure-default-warehouse";

export async function GET(req: Request) {
  try {
    await ensureDefaultWarehouse();
    await repairDefaultWarehouseFlag();

    const all =
      new URL(req.url).searchParams.get("all") === "1" ||
      new URL(req.url).searchParams.get("all") === "true";

    const prisma = getPricingPrismaClient();
    const rows = await prisma.warehouse.findMany({
      where: all ? {} : { isActive: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        warehouseType: true,
        isDefault: true,
        isActive: true,
        notes: true,
        _count: { select: { movements: true } },
      },
    });
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось загрузить склады" },
      { status: 500 },
    );
  }
}

type PostBody = {
  name?: string;
  warehouseType?: string | null;
  notes?: string | null;
  isDefault?: boolean;
};

export async function POST(req: Request) {
  try {
    const prisma = getPricingPrismaClient();
    const body = (await req.json()) as PostBody;
    const name = body.name?.trim() ?? "";
    if (!name) {
      return NextResponse.json({ error: "Укажите название склада" }, { status: 400 });
    }

    if (body.isDefault) {
      await prisma.warehouse.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const w = await prisma.warehouse.create({
      data: {
        name,
        warehouseType: body.warehouseType?.trim() || null,
        notes: body.notes?.trim() || null,
        isDefault: Boolean(body.isDefault),
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        warehouseType: true,
        isDefault: true,
        isActive: true,
        notes: true,
      },
    });
    await repairDefaultWarehouseFlag();
    return NextResponse.json(w);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось создать склад" },
      { status: 500 },
    );
  }
}
