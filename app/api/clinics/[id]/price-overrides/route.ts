import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getActivePriceListId } from "@/lib/price-list-workspace";

type PatchBody = {
  overrides?: Array<{
    priceListItemId?: string;
    priceRub?: number | null;
  }>;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const clientsPrisma = await getPrisma();
  const pricingPrisma = getPricingPrismaClient();
  try {
    const s = await getSessionFromCookies();
    if (!s) {
      return NextResponse.json({ error: "��������� ����" }, { status: 401 });
    }
    const tenantId = await requireSessionTenantId(s);
    const { id } = await ctx.params;
    const clinicId = id?.trim() ?? "";
    if (!clinicId) {
      return NextResponse.json({ error: "������������ id" }, { status: 400 });
    }

    const clinic = await clientsPrisma.clinic.findFirst({
      where: { id: clinicId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!clinic) {
      return NextResponse.json({ error: "������� �� �������" }, { status: 404 });
    }

    const activePriceListId = await getActivePriceListId(pricingPrisma);
    const rows = await pricingPrisma.clinicPriceOverride.findMany({
      where: {
        clinicId,
        priceListItem: { priceListId: activePriceListId, isActive: true },
      },
      orderBy: [{ priceListItem: { sortOrder: "asc" } }, { priceListItem: { code: "asc" } }],
      select: {
        priceListItemId: true,
        priceRub: true,
      },
    });

    return NextResponse.json({ overrides: rows });
  } catch (e) {
    console.error("[GET /api/clinics/[id]/price-overrides]", e);
    return NextResponse.json(
      { error: "�� ������� ��������� �������������� ����" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const clientsPrisma = await getPrisma();
  const pricingPrisma = getPricingPrismaClient();
  try {
    const s = await getSessionFromCookies();
    if (!s) {
      return NextResponse.json({ error: "��������� ����" }, { status: 401 });
    }
    const tenantId = await requireSessionTenantId(s);
    const { id } = await ctx.params;
    const clinicId = id?.trim() ?? "";
    if (!clinicId) {
      return NextResponse.json({ error: "������������ id" }, { status: 400 });
    }

    const clinic = await clientsPrisma.clinic.findFirst({
      where: { id: clinicId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!clinic) {
      return NextResponse.json({ error: "������� �� �������" }, { status: 404 });
    }

    const body = (await req.json()) as PatchBody;
    const raw = Array.isArray(body.overrides) ? body.overrides : [];

    const normalized = raw
      .map((r) => {
        const priceListItemId = String(r?.priceListItemId ?? "").trim();
        if (!priceListItemId) return null;
        if (r?.priceRub == null) {
          return { priceListItemId, priceRub: null as number | null };
        }
        const n = Number(r.priceRub);
        if (!Number.isFinite(n) || n < 0) return null;
        return { priceListItemId, priceRub: Math.round(n) };
      })
      .filter((x): x is { priceListItemId: string; priceRub: number | null } => x != null);

    const activePriceListId = await getActivePriceListId(pricingPrisma);
    const uniqIds = [...new Set(normalized.map((x) => x.priceListItemId))];
    if (uniqIds.length > 0) {
      const items = await pricingPrisma.priceListItem.findMany({
        where: {
          id: { in: uniqIds },
          priceListId: activePriceListId,
          isActive: true,
        },
        select: { id: true },
      });
      if (items.length !== uniqIds.length) {
        return NextResponse.json(
          { error: "� ������� ���� ������� �� �� ��������� ������" },
          { status: 400 },
        );
      }
    }

    const toUpsert = normalized.filter((x) => x.priceRub != null) as Array<{
      priceListItemId: string;
      priceRub: number;
    }>;
    const keepIds = toUpsert.map((x) => x.priceListItemId);

    await pricingPrisma.$transaction(async (tx) => {
      await tx.clinicPriceOverride.deleteMany({
        where: {
          clinicId,
          priceListItem: { priceListId: activePriceListId },
          ...(keepIds.length > 0 ? { NOT: { priceListItemId: { in: keepIds } } } : {}),
        },
      });

      for (const row of toUpsert) {
        await tx.clinicPriceOverride.upsert({
          where: {
            clinicId_priceListItemId: {
              clinicId,
              priceListItemId: row.priceListItemId,
            },
          },
          create: {
            clinicId,
            priceListItemId: row.priceListItemId,
            priceRub: row.priceRub,
          },
          update: {
            priceRub: row.priceRub,
          },
        });
      }

    });

    await clientsPrisma.clinic.update({
      where: { id: clinicId },
      data: {
        orderPriceListKind: toUpsert.length > 0 ? "CUSTOM" : null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[PATCH /api/clinics/[id]/price-overrides]", e);
    return NextResponse.json(
      { error: "�� ������� ��������� �������������� ����" },
      { status: 500 },
    );
  }
}
