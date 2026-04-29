import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import {
  ensurePriceListWorkspace,
  getActivePriceListId,
} from "@/lib/price-list-workspace";

/** Прайс для форм заказа и раздела «Конфигурация». ?listId= — иначе активный каталог. */
export async function GET(req: Request) {
  try {
    const prisma = await getPrisma();
    const url = new URL(req.url);
    const qList = url.searchParams.get("listId")?.trim() ?? "";
    let priceListId: string;
    if (qList) {
      const exists = await prisma.priceList.findUnique({
        where: { id: qList },
        select: { id: true },
      });
      if (!exists) {
        return NextResponse.json({ error: "Каталог не найден" }, { status: 404 });
      }
      priceListId = qList;
    } else {
      priceListId = await getActivePriceListId(prisma);
    }
    const items = await prisma.priceListItem.findMany({
      where: { isActive: true, priceListId },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        sectionTitle: true,
        subsectionTitle: true,
        priceRub: true,
        leadWorkingDays: true,
        description: true,
      },
    });
    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось загрузить прайс" },
      { status: 500 },
    );
  }
}

type PostBody = {
  code?: string;
  name?: string;
  sectionTitle?: string | null;
  subsectionTitle?: string | null;
  priceRub?: number;
  leadWorkingDays?: number | null;
  description?: string | null;
  sortOrder?: number;
  /** Каталог; если не указан — активный для нарядов */
  priceListId?: string | null;
};

export async function POST(req: Request) {
  try {
    const prisma = await getPrisma();
    await ensurePriceListWorkspace(prisma);
    const body = (await req.json()) as PostBody;
    const code = body.code?.trim() ?? "";
    const name = body.name?.trim() ?? "";
    if (!code || !name) {
      return NextResponse.json(
        { error: "Укажите код и наименование" },
        { status: 400 },
      );
    }
    const priceRub =
      typeof body.priceRub === "number" && Number.isFinite(body.priceRub)
        ? Math.max(0, Math.round(body.priceRub))
        : 0;
    const lead =
      body.leadWorkingDays === null || body.leadWorkingDays === undefined
        ? null
        : typeof body.leadWorkingDays === "number" &&
            Number.isFinite(body.leadWorkingDays)
          ? Math.max(0, Math.trunc(body.leadWorkingDays))
          : null;
    const sortOrder =
      typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
        ? Math.trunc(body.sortOrder)
        : 0;
    const description =
      typeof body.description === "string" ? body.description.trim() || null : null;
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

    let priceListId: string;
    if (body.priceListId != null && String(body.priceListId).trim()) {
      const lid = String(body.priceListId).trim();
      const pl = await prisma.priceList.findUnique({
        where: { id: lid },
        select: { id: true },
      });
      if (!pl) {
        return NextResponse.json({ error: "Каталог не найден" }, { status: 400 });
      }
      priceListId = pl.id;
    } else {
      priceListId = await getActivePriceListId(prisma);
    }

    const dup = await prisma.priceListItem.findUnique({
      where: { priceListId_code: { priceListId, code } },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json(
        { error: `В этом каталоге уже есть позиция с кодом «${code}»` },
        { status: 400 },
      );
    }

    const row = await prisma.priceListItem.create({
      data: {
        priceListId,
        code,
        name,
        ...(sectionTitle !== undefined ? { sectionTitle } : {}),
        ...(subsectionTitle !== undefined ? { subsectionTitle } : {}),
        priceRub,
        leadWorkingDays: lead,
        description,
        isActive: true,
        sortOrder,
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
