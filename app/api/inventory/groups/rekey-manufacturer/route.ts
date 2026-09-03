import { NextResponse } from "next/server";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import { manufacturerOwnerKey } from "@/lib/inventory/inventory-groups";

type PostBody = {
  warehouseId?: string;
  fromName?: string;
  toName?: string;
};

/** После переименования производителя в дереве — обновить ключи групп. */
export async function POST(req: Request) {
  try {
    const prisma = await getPricingPrismaClient();
    const body = (await req.json()) as PostBody;
    const warehouseId = body.warehouseId?.trim() ?? "";
    const fromKey = manufacturerOwnerKey(body.fromName ?? "");
    const toName = (body.toName ?? "").trim();
    const toKey = manufacturerOwnerKey(toName);
    if (!warehouseId || !fromKey || !toKey) {
      return NextResponse.json({ error: "Недостаточно данных" }, { status: 400 });
    }
    if (fromKey === toKey) {
      return NextResponse.json({ ok: true });
    }

    await prisma.$transaction(async (tx) => {
      await tx.inventoryGroup.updateMany({
        where: {
          warehouseId,
          ownerKind: "MANUFACTURER",
          ownerKey: fromKey,
        },
        data: { ownerKey: toKey },
      });
      await tx.inventoryGroupManufacturer.updateMany({
        where: { warehouseId, manufacturerKey: fromKey },
        data: { manufacturerKey: toKey, manufacturerName: toName },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось обновить группы производителя" },
      { status: 500 },
    );
  }
}
