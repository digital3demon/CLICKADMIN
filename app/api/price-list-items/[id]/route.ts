import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
import { getActivePriceListId } from "@/lib/price-list-workspace";

type RouteProps = {
  params: Promise<{ id: string }>;
};

type PatchBody = {
  code?: string;
  name?: string;
  sectionTitle?: string | null;
  subsectionTitle?: string | null;
  priceRub?: number;
  leadWorkingDays?: number | null;
  description?: string | null;
  variablePrice?: boolean;
};

async function canCorrectActivePrice() {
  const session = await getSessionFromCookies();
  if (!session) return false;
  const access = await getEffectiveModuleAccess(session.tid, session.role);
  return access.CONFIG_PRICING_CORRECTION === true;
}

function parsePriceRub(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

function parseLeadWorkingDays(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.trunc(value));
}

export async function PATCH(req: Request, { params }: RouteProps) {
  try {
    if (!(await canCorrectActivePrice())) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const { id } = await params;
    const itemId = id.trim();
    if (!itemId) {
      return NextResponse.json({ error: "Некорректная позиция" }, { status: 400 });
    }

    const body = (await req.json()) as PatchBody;
    const code = body.code?.trim() ?? "";
    const name = body.name?.trim() ?? "";
    const priceRub = parsePriceRub(body.priceRub);
    const leadWorkingDays = parseLeadWorkingDays(body.leadWorkingDays);
    const description =
      typeof body.description === "string"
        ? body.description.trim() || null
        : null;
    const sectionTitle =
      typeof body.sectionTitle === "string"
        ? body.sectionTitle.trim() || null
        : body.sectionTitle === null
          ? null
          : undefined;
    const subsectionTitle =
      typeof body.subsectionTitle === "string"
        ? body.subsectionTitle.trim() || null
        : body.subsectionTitle === null
          ? null
          : undefined;

    if (!code || !name || priceRub == null) {
      return NextResponse.json(
        { error: "Укажите код, название и цену" },
        { status: 400 },
      );
    }
    const variablePrice = body.variablePrice === true;

    const prisma = await getPricingPrismaClient();
    const activePriceListId = await getActivePriceListId(prisma);
    const item = await prisma.priceListItem.findUnique({
      where: { id: itemId },
      select: { id: true, priceListId: true },
    });
    if (!item || item.priceListId !== activePriceListId) {
      return NextResponse.json(
        { error: "Можно корректировать только актуальный прайс" },
        { status: 404 },
      );
    }

    const duplicate = await prisma.priceListItem.findUnique({
      where: { priceListId_code: { priceListId: item.priceListId, code } },
      select: { id: true },
    });
    if (duplicate && duplicate.id !== item.id) {
      return NextResponse.json(
        { error: `В актуальном прайсе уже есть позиция с кодом «${code}»` },
        { status: 400 },
      );
    }

    const row = await prisma.priceListItem.update({
      where: { id: item.id },
      data: {
        code,
        name,
        ...(sectionTitle !== undefined ? { sectionTitle } : {}),
        ...(subsectionTitle !== undefined ? { subsectionTitle } : {}),
        priceRub,
        leadWorkingDays,
        description,
        variablePrice,
      },
      select: {
        id: true,
        code: true,
        name: true,
        sectionTitle: true,
        subsectionTitle: true,
        priceRub: true,
        leadWorkingDays: true,
        description: true,
        variablePrice: true,
      },
    });

    return NextResponse.json(row);
  } catch (e) {
    console.error("[price-list-items PATCH]", e);
    return NextResponse.json(
      { error: "Не удалось сохранить позицию" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteProps) {
  try {
    if (!(await canCorrectActivePrice())) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    const { id } = await params;
    const itemId = id.trim();
    if (!itemId) {
      return NextResponse.json({ error: "Некорректная позиция" }, { status: 400 });
    }

    const prisma = await getPricingPrismaClient();
    const activePriceListId = await getActivePriceListId(prisma);
    const item = await prisma.priceListItem.findUnique({
      where: { id: itemId },
      select: { id: true, priceListId: true },
    });
    if (!item || item.priceListId !== activePriceListId) {
      return NextResponse.json(
        { error: "Можно корректировать только актуальный прайс" },
        { status: 404 },
      );
    }

    await prisma.$transaction([
      prisma.orderConstruction.updateMany({
        where: { priceListItemId: item.id },
        data: { priceListItemId: null },
      }),
      prisma.priceListItem.delete({ where: { id: item.id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[price-list-items DELETE]", e);
    return NextResponse.json(
      { error: "Не удалось удалить позицию" },
      { status: 500 },
    );
  }
}
