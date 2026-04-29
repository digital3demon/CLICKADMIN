import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import {
  ensurePriceListWorkspace,
  setActivePriceListId,
} from "@/lib/price-list-workspace";

/** Список каталогов прайса + активный для нарядов */
export async function GET() {
  try {
    const prisma = await getPrisma();
    const { activePriceListId } = await ensurePriceListWorkspace(prisma);
    const lists = await prisma.priceList.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        sortOrder: true,
        _count: { select: { items: true } },
      },
    });
    return NextResponse.json({
      activePriceListId,
      lists: lists.map((l) => ({
        id: l.id,
        name: l.name,
        sortOrder: l.sortOrder,
        itemCount: l._count.items,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось загрузить каталоги прайса" },
      { status: 500 },
    );
  }
}

type PostBody = { name?: string };

/** Новый каталог прайса */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as PostBody;
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Укажите название каталога" }, { status: 400 });
    }
    const prisma = await getPrisma();
    const maxSort = await prisma.priceList.aggregate({ _max: { sortOrder: true } });
    const sortOrder = (maxSort._max.sortOrder ?? 0) + 1;
    const row = await prisma.priceList.create({
      data: { name: name.slice(0, 200), sortOrder },
      select: { id: true, name: true, sortOrder: true },
    });
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось создать каталог" },
      { status: 500 },
    );
  }
}

type PatchBody = { activePriceListId?: string };

/** Сменить прайс по умолчанию для форм нарядов */
export async function PATCH(req: Request) {
  try {
    const body = (await req.json()) as PatchBody;
    const id = body.activePriceListId?.trim() ?? "";
    if (!id) {
      return NextResponse.json(
        { error: "Укажите activePriceListId" },
        { status: 400 },
      );
    }
    const prisma = await getPrisma();
    const r = await setActivePriceListId(prisma, id);
    if (!r.ok) {
      return NextResponse.json({ error: r.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, activePriceListId: id });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось сохранить настройку" },
      { status: 500 },
    );
  }
}
