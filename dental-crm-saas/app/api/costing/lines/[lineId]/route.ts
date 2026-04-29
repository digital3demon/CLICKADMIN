import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { requireCostingOwner } from "@/lib/auth/costing-guard";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ lineId: string }> };

type PoolShareBody = { poolId: string; shareRub: number };

type PatchBody = {
  inputsJson?: Record<string, unknown>;
  note?: string | null;
  priceListItemId?: string | null;
  poolShares?: PoolShareBody[] | null;
};

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireCostingOwner();
  if (gate instanceof NextResponse) return gate;
  const { lineId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const prisma = await getPrisma();

  const line = await prisma.costingLine.findUnique({
    where: { id: lineId },
    select: { id: true, versionId: true },
  });
  if (!line) {
    return NextResponse.json({ error: "Строка не найдена" }, { status: 404 });
  }

  const data: {
    inputsJson?: object;
    note?: string | null;
    priceListItemId?: string | null;
  } = {};

  if (
    body.inputsJson != null &&
    typeof body.inputsJson === "object" &&
    !Array.isArray(body.inputsJson)
  ) {
    data.inputsJson = body.inputsJson as object;
  }

  if (body.note !== undefined) {
    data.note =
      typeof body.note === "string"
        ? body.note.trim() || null
        : body.note === null
          ? null
          : undefined;
  }

  if (body.priceListItemId !== undefined) {
    if (body.priceListItemId === null) {
      data.priceListItemId = null;
    } else if (typeof body.priceListItemId === "string" && body.priceListItemId.trim()) {
      const pli = await prisma.priceListItem.findUnique({
        where: { id: body.priceListItemId.trim() },
        select: { id: true },
      });
      if (!pli) {
        return NextResponse.json({ error: "Позиция прайса не найдена" }, { status: 400 });
      }
      data.priceListItemId = pli.id;
    }
  }

  const hasPoolShares = body.poolShares !== undefined;
  if (hasPoolShares && body.poolShares !== null && !Array.isArray(body.poolShares)) {
    return NextResponse.json({ error: "poolShares должен быть массивом" }, { status: 400 });
  }

  if (Object.keys(data).length === 0 && !hasPoolShares) {
    return NextResponse.json({ error: "Нет полей" }, { status: 400 });
  }

  if (hasPoolShares && Array.isArray(body.poolShares)) {
    const poolIds = [...new Set(body.poolShares.map((s) => s.poolId).filter(Boolean))];
    if (poolIds.length > 0) {
      const pools = await prisma.costingSharedPool.findMany({
        where: { id: { in: poolIds }, versionId: line.versionId },
        select: { id: true },
      });
      if (pools.length !== poolIds.length) {
        return NextResponse.json(
          { error: "Один из пулов не принадлежит этой версии" },
          { status: 400 },
        );
      }
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.costingLine.update({
          where: { id: lineId },
          data,
        });
      }
      if (hasPoolShares) {
        await tx.costingLinePoolShare.deleteMany({ where: { lineId } });
        const rows = (body.poolShares ?? [])
          .filter(
            (s) =>
              typeof s.poolId === "string" &&
              s.poolId.trim() &&
              typeof s.shareRub === "number" &&
              Number.isFinite(s.shareRub),
          )
          .map((s) => ({
            lineId,
            poolId: s.poolId.trim(),
            shareRub: s.shareRub,
          }))
          .filter((s) => s.shareRub !== 0);
        if (rows.length > 0) {
          await tx.costingLinePoolShare.createMany({ data: rows });
        }
      }
    });

    const row = await prisma.costingLine.findUnique({
      where: { id: lineId },
      include: {
        priceListItem: { select: { id: true, code: true, name: true, priceRub: true } },
        poolShares: true,
      },
    });
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Не обновлено" }, { status: 500 });
  }
}
