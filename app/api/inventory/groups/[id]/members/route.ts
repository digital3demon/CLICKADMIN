import { NextResponse } from "next/server";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import { manufacturerOwnerKey } from "@/lib/inventory/inventory-groups";

type RouteCtx = { params: Promise<{ id: string }> };

type PutBody = {
  manufacturerKeys?: string[];
  manufacturerNames?: Record<string, string>;
  itemIds?: string[];
};

export async function PUT(req: Request, ctx: RouteCtx) {
  try {
    const prisma = await getPricingPrismaClient();
    const { id } = await ctx.params;
    const gid = id?.trim() ?? "";
    if (!gid) {
      return NextResponse.json({ error: "Нет id" }, { status: 400 });
    }

    const group = await prisma.inventoryGroup.findUnique({
      where: { id: gid },
      select: {
        id: true,
        warehouseId: true,
        ownerKind: true,
        ownerKey: true,
      },
    });
    if (!group) {
      return NextResponse.json({ error: "Группа не найдена" }, { status: 404 });
    }

    const body = (await req.json()) as PutBody;

    if (group.ownerKind === "WAREHOUSE") {
      const keys = [
        ...new Set(
          (body.manufacturerKeys ?? [])
            .map((k) => manufacturerOwnerKey(k))
            .filter(Boolean),
        ),
      ];
      await prisma.$transaction(async (tx) => {
        await tx.inventoryGroupManufacturer.deleteMany({ where: { groupId: gid } });
        if (keys.length === 0) return;
        await tx.inventoryGroupManufacturer.createMany({
          data: keys.map((manufacturerKey) => ({
            groupId: gid,
            warehouseId: group.warehouseId,
            manufacturerKey,
            manufacturerName:
              body.manufacturerNames?.[manufacturerKey]?.trim() || manufacturerKey,
          })),
        });
      });
      return NextResponse.json({ ok: true, manufacturerKeys: keys });
    }

    const itemIds = [
      ...new Set((body.itemIds ?? []).map((x) => String(x).trim()).filter(Boolean)),
    ];
    if (itemIds.length) {
      const items = await prisma.inventoryItem.findMany({
        where: { id: { in: itemIds }, warehouseId: group.warehouseId },
        select: { id: true, manufacturer: true },
      });
      if (items.length !== itemIds.length) {
        return NextResponse.json(
          { error: "Позиция не на этом складе" },
          { status: 400 },
        );
      }
      const owner = group.ownerKey;
      const mismatch = items.some(
        (it) => (it.manufacturer ?? "").trim().toLowerCase() !== owner,
      );
      if (mismatch) {
        return NextResponse.json(
          { error: "Позиция не этого производителя" },
          { status: 400 },
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.inventoryGroupItem.deleteMany({ where: { groupId: gid } });
      if (itemIds.length === 0) return;
      await tx.inventoryGroupItem.createMany({
        data: itemIds.map((itemId) => ({ groupId: gid, itemId })),
      });
    });
    return NextResponse.json({ ok: true, itemIds });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось сохранить состав группы" },
      { status: 500 },
    );
  }
}
