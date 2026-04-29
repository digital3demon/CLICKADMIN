import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";

type Ctx = { params: Promise<{ id: string }> };

/** Удалить тип карточки только из CRM (наряды: kaitenCardTypeId → null). В Kaiten не трогаем. */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub || !access || access.CONFIG_KAITEN !== true) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  try {
    const prisma = await getPrisma();
    const row = await prisma.kaitenCardType.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!row) {
      return NextResponse.json({ error: "Тип не найден" }, { status: 404 });
    }
    await prisma.kaitenCardType.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[kaiten-card-types/delete]", e);
    return NextResponse.json({ error: "Не удалось удалить тип" }, { status: 500 });
  }
}
