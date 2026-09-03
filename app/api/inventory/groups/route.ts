import { NextResponse } from "next/server";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import {
  manufacturerOwnerKey,
  normalizeGroupName,
  warehouseOwnerKey,
} from "@/lib/inventory/inventory-groups";

type PostBody = {
  warehouseId?: string;
  ownerKind?: string;
  ownerKey?: string | null;
  name?: string;
};

export async function POST(req: Request) {
  try {
    const prisma = await getPricingPrismaClient();
    const body = (await req.json()) as PostBody;
    const warehouseId = body.warehouseId?.trim() ?? "";
    if (!warehouseId) {
      return NextResponse.json({ error: "Укажите склад" }, { status: 400 });
    }
    const ownerKind = body.ownerKind === "MANUFACTURER" ? "MANUFACTURER" : "WAREHOUSE";
    const ownerKey =
      ownerKind === "WAREHOUSE"
        ? warehouseOwnerKey()
        : manufacturerOwnerKey(body.ownerKey ?? "");
    if (ownerKind === "MANUFACTURER" && !ownerKey) {
      return NextResponse.json({ error: "Укажите производителя" }, { status: 400 });
    }
    const name = normalizeGroupName(body.name ?? "");
    if (!name) {
      return NextResponse.json({ error: "Укажите название группы" }, { status: 400 });
    }

    const wh = await prisma.warehouse.findFirst({
      where: { id: warehouseId, isActive: true },
      select: { id: true },
    });
    if (!wh) {
      return NextResponse.json({ error: "Склад не найден" }, { status: 400 });
    }

    const clash = await prisma.inventoryGroup.findFirst({
      where: { warehouseId, ownerKind, ownerKey, name },
      select: { id: true },
    });
    if (clash) {
      return NextResponse.json(
        { error: "Группа с таким названием уже есть" },
        { status: 409 },
      );
    }

    const row = await prisma.inventoryGroup.create({
      data: { warehouseId, ownerKind, ownerKey, name },
      select: {
        id: true,
        warehouseId: true,
        ownerKind: true,
        ownerKey: true,
        name: true,
      },
    });
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось создать группу" },
      { status: 500 },
    );
  }
}
