/**
 * Справочник типов для канбана (модуль KANBAN).
 * GET — всем с канбаном. PUT — CONFIG_KANBAN_CARD_TYPES: пишет в Prisma, без Kaiten API.
 */
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getClientsPrisma } from "@/lib/get-domain-prisma";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";

export const dynamic = "force-dynamic";

async function listActiveTypes(tenantId: string) {
  const prisma = await getClientsPrisma();
  return prisma.kaitenCardType.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, sortOrder: true },
  });
}

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }
  try {
    return NextResponse.json(await listActiveTypes(tenantId));
  } catch (e) {
    console.error("[kanban/card-types]", e);
    return NextResponse.json(
      { error: "Не удалось загрузить типы карточек" },
      { status: 500 },
    );
  }
}

type PutBody = {
  types?: Array<{ id?: unknown; name?: unknown; sortOrder?: unknown }>;
};

export async function PUT(request: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }
  const access = await getEffectiveModuleAccess(tenantId, session.role);
  if (session.role !== "OWNER" && access.CONFIG_KANBAN_CARD_TYPES !== true) {
    return NextResponse.json({ error: "Нет права менять типы карточек" }, { status: 403 });
  }
  let body: PutBody = {};
  try {
    body = (await request.json()) as PutBody;
  } catch {
    body = {};
  }
  const incoming = Array.isArray(body.types) ? body.types : [];
  const prisma = await getClientsPrisma();
  try {
    for (const raw of incoming) {
      const name = String(raw.name || "").trim();
      if (!name || name === "Новый тип") continue;
      const id = String(raw.id || "").trim();
      const sortOrder =
        typeof raw.sortOrder === "number" && Number.isFinite(raw.sortOrder)
          ? Math.trunc(raw.sortOrder)
          : 0;
      const byId = id
        ? await prisma.kaitenCardType.findFirst({
            where: { tenantId, id },
            select: { id: true },
          })
        : null;
      const byName = await prisma.kaitenCardType.findFirst({
        where: { tenantId, name },
        select: { id: true },
      });
      if (byId) {
        if (byName && byName.id !== byId.id) {
          return NextResponse.json(
            { error: `Тип «${name}» уже есть в справочнике` },
            { status: 400 },
          );
        }
        await prisma.kaitenCardType.update({
          where: { id: byId.id },
          data: { name, sortOrder, isActive: true },
        });
        continue;
      }
      if (byName) {
        await prisma.kaitenCardType.update({
          where: { id: byName.id },
          data: { sortOrder, isActive: true },
        });
        continue;
      }
      await prisma.kaitenCardType.create({
        data: {
          tenantId,
          name,
          externalTypeId: 1,
          sortOrder,
          isActive: true,
        },
      });
    }
    return NextResponse.json({ types: await listActiveTypes(tenantId) });
  } catch (e) {
    console.error("[kanban/card-types PUT]", e);
    return NextResponse.json(
      { error: "Не удалось сохранить типы карточек" },
      { status: 500 },
    );
  }
}
