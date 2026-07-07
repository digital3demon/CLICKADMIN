import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getKaitenRestAuth } from "@/lib/kaiten-rest";
import { pushOrderMembersToKaiten } from "@/lib/kaiten-members-outbound";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";

export const dynamic = "force-dynamic";

type Body = {
  assignees?: unknown;
  participants?: unknown;
};

function parseIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const moduleAccess = await getEffectiveModuleAccess(
    tenantId,
    session.role as UserRole,
  );
  if (
    moduleAccess.KANBAN_MANAGE_ASSIGNEES === false &&
    moduleAccess.KANBAN_MANAGE_PARTICIPANTS === false &&
    session.role !== "OWNER"
  ) {
    return NextResponse.json({ error: "Нет прав" }, { status: 403 });
  }

  const auth = getKaitenRestAuth();
  if (!auth) {
    return NextResponse.json({ error: "Kaiten не настроен" }, { status: 503 });
  }

  const { id: orderId } = await ctx.params;
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const assignees = parseIdList(body.assignees);
  const participants = parseIdList(body.participants);

  const db = await getOrdersPrisma();
  const order = await db.order.findFirst({
    where: { id: orderId, tenantId },
    select: { id: true, kaitenCardId: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }
  if (order.kaitenCardId == null || !Number.isFinite(order.kaitenCardId)) {
    return NextResponse.json(
      { error: "У наряда нет карточки Kaiten" },
      { status: 400 },
    );
  }

  const result = await pushOrderMembersToKaiten(db, auth, {
    tenantId,
    orderId: order.id,
    kaitenCardId: order.kaitenCardId,
    assignees,
    participants,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, synced: false },
      { status: result.status },
    );
  }

  return NextResponse.json({ ok: true, synced: true, fingerprint: result.fingerprint });
}
