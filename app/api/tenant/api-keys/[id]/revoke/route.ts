import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** Отозвать API-ключ. */
export async function POST(_req: Request, ctx: Ctx) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const { id: keyIdRaw } = await ctx.params;
  const keyId = keyIdRaw?.trim() ?? "";
  if (!keyId) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 });
  }

  const prisma = await getPrisma();
  const existing = await prisma.tenantApiKey.findFirst({
    where: { id: keyId, tenantId },
    select: { id: true, revokedAt: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Ключ не найден" }, { status: 404 });
  }
  if (existing.revokedAt) {
    return NextResponse.json({ ok: true, alreadyRevoked: true });
  }

  await prisma.tenantApiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
