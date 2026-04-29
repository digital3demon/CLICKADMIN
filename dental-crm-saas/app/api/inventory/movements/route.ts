import { NextResponse } from "next/server";
import type { StockMovementKind } from "@prisma/client";
import { getPrisma } from "@/lib/get-prisma";
import { applyStockMovement } from "@/lib/inventory/apply-stock-movement";
import { isStockMovementKind } from "@/lib/inventory/stock-movement-kind-labels";
import { ensureDefaultWarehouse } from "@/lib/inventory/ensure-default-warehouse";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";

export async function GET(req: Request) {
  try {
    await ensureDefaultWarehouse();
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId")?.trim() || undefined;
    const warehouseId = searchParams.get("warehouseId")?.trim() || undefined;
    const orderId = searchParams.get("orderId")?.trim() || undefined;
    const take = Math.min(
      200,
      Math.max(1, Number(searchParams.get("limit") ?? "80") || 80),
    );

    const rows = await (await getPrisma()).stockMovement.findMany({
      where: {
        ...(itemId ? { itemId } : {}),
        ...(warehouseId ? { warehouseId } : {}),
        ...(orderId ? { orderId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            name: true,
            unit: true,
            manufacturer: true,
            warehouseId: true,
            unitsPerSupply: true,
          },
        },
        warehouse: { select: { id: true, name: true, warehouseType: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    });

    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось загрузить движения" },
      { status: 500 },
    );
  }
}

type PostBody = {
  kind?: string;
  itemId?: string;
  warehouseId?: string;
  quantity?: number;
  /** Закупка: цена за ед., руб. */
  unitCostRub?: number | null;
  orderId?: string | null;
  /** Альтернатива orderId: номер наряда YYMM-NNN */
  orderNumber?: string | null;
  note?: string | null;
  actorLabel?: string | null;
  idempotencyKey?: string | null;
};

export async function POST(req: Request) {
  try {
    const s = await getSessionFromCookies();
    if (!s) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    const tenantId = await requireSessionTenantId(s);
    const body = (await req.json()) as PostBody;
    const kindRaw = body.kind?.trim() ?? "";
    if (!isStockMovementKind(kindRaw)) {
      return NextResponse.json({ error: "Неизвестный вид движения" }, { status: 400 });
    }

    const itemId = body.itemId?.trim() ?? "";
    const warehouseId = body.warehouseId?.trim() ?? "";
    if (!itemId || !warehouseId) {
      return NextResponse.json(
        { error: "Укажите позицию и склад" },
        { status: 400 },
      );
    }

    let orderId = body.orderId?.trim() || null;
    if (!orderId && body.orderNumber?.trim()) {
      const o = await (await getPrisma()).order.findFirst({
        where: {
          tenantId,
          orderNumber: body.orderNumber.trim(),
        },
        select: { id: true },
      });
      if (!o) {
        return NextResponse.json(
          { error: `Наряд «${body.orderNumber.trim()}» не найден` },
          { status: 404 },
        );
      }
      orderId = o.id;
    }

    const result = await (await getPrisma()).$transaction((tx) =>
      applyStockMovement(tx, {
        kind: kindRaw as StockMovementKind,
        itemId,
        warehouseId,
        quantity: Number(body.quantity),
        unitCostRub: body.unitCostRub,
        orderId,
        note: body.note,
        actorLabel: body.actorLabel?.trim() || undefined,
        idempotencyKey: body.idempotencyKey?.trim() || null,
      }),
    );

    const movement = await (await getPrisma()).stockMovement.findUniqueOrThrow({
      where: { id: result.movementId },
      include: {
        item: {
          select: {
            id: true,
            sku: true,
            name: true,
            unit: true,
            manufacturer: true,
            warehouseId: true,
            unitsPerSupply: true,
          },
        },
        warehouse: { select: { id: true, name: true, warehouseType: true } },
        order: { select: { id: true, orderNumber: true } },
      },
    });

    return NextResponse.json(movement);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка";
    if (
      msg.includes("Недостаточно") ||
      msg.includes("не найден") ||
      msg.includes("Должно")
    ) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось записать движение" },
      { status: 500 },
    );
  }
}
