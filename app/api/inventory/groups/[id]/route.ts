import { NextResponse } from "next/server";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import { normalizeGroupName } from "@/lib/inventory/inventory-groups";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const prisma = await getPricingPrismaClient();
    const { id } = await ctx.params;
    const gid = id?.trim() ?? "";
    if (!gid) {
      return NextResponse.json({ error: "Нет id" }, { status: 400 });
    }
    const body = (await req.json()) as { name?: string };
    const name = normalizeGroupName(body.name ?? "");
    if (!name) {
      return NextResponse.json({ error: "Укажите название группы" }, { status: 400 });
    }

    const existing = await prisma.inventoryGroup.findUnique({
      where: { id: gid },
      select: {
        id: true,
        warehouseId: true,
        ownerKind: true,
        ownerKey: true,
        name: true,
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Группа не найдена" }, { status: 404 });
    }

    if (name !== existing.name) {
      const clash = await prisma.inventoryGroup.findFirst({
        where: {
          warehouseId: existing.warehouseId,
          ownerKind: existing.ownerKind,
          ownerKey: existing.ownerKey,
          name,
          NOT: { id: gid },
        },
        select: { id: true },
      });
      if (clash) {
        return NextResponse.json(
          { error: "Группа с таким названием уже есть" },
          { status: 409 },
        );
      }
    }

    const row = await prisma.inventoryGroup.update({
      where: { id: gid },
      data: { name },
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
      { error: "Не удалось переименовать группу" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, ctx: RouteCtx) {
  try {
    const prisma = await getPricingPrismaClient();
    const { id } = await ctx.params;
    const gid = id?.trim() ?? "";
    if (!gid) {
      return NextResponse.json({ error: "Нет id" }, { status: 400 });
    }
    const existing = await prisma.inventoryGroup.findUnique({
      where: { id: gid },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Группа не найдена" }, { status: 404 });
    }
    await prisma.inventoryGroup.delete({ where: { id: gid } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось удалить группу" },
      { status: 500 },
    );
  }
}
