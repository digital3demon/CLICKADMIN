import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getDemoAccessPrisma } from "@/lib/prisma-demo-access";
import { isCrmStandaloneDemo } from "@/lib/crm-standalone-demo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Отозвать неиспользованный (или уже использованный) код демо. */
export async function POST(_req: Request, ctx: Ctx) {
  if (isCrmStandaloneDemo()) {
    return NextResponse.json(
      { error: "Коды демо выдаются из рабочей CRM, не из демо-хоста" },
      { status: 403 },
    );
  }
  const session = await getSessionFromCookies();
  if (!session || session.role !== "OWNER" || session.demo) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const { id: idRaw } = await ctx.params;
  const id = idRaw?.trim() ?? "";
  if (!id) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const db = getDemoAccessPrisma();
  const existing = await db.demoAccessCode.findFirst({
    where: { id },
    select: { id: true, revokedAt: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Код не найден" }, { status: 404 });
  }
  if (existing.revokedAt) {
    return NextResponse.json({ ok: true, alreadyRevoked: true });
  }

  await db.demoAccessCode.update({
    where: { id },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
