import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { applyWorkSentKanbanSideEffects } from "@/lib/kanban/advance-linked-order-column.server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { recordOrderRevision } from "@/lib/record-order-revision";
import { userActivityDisplayLabel } from "@/lib/user-activity-display-label";

export const dynamic = "force-dynamic";

type Body = {
  orderIds?: unknown;
  shipped?: unknown;
};

const MAX_BULK_ORDERS = 500;

function normalizeOrderIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const v of raw) {
    const id = typeof v === "string" ? v.trim() : "";
    if (!id) continue;
    seen.add(id);
    if (seen.size >= MAX_BULK_ORDERS) break;
  }
  return Array.from(seen);
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const orderIds = normalizeOrderIds(body.orderIds);
  if (orderIds.length === 0) {
    return NextResponse.json({ error: "Нет нарядов для отметки" }, { status: 400 });
  }
  const shipped = Boolean(body.shipped);

  const prisma = await getOrdersPrisma();
  const rows = await prisma.order.findMany({
    where: { tenantId, id: { in: orderIds } },
    select: { id: true, adminShippedOtpr: true },
  });
  const changedIds = rows
    .filter((r) => r.adminShippedOtpr !== shipped)
    .map((r) => r.id);

  if (changedIds.length > 0) {
    await prisma.order.updateMany({
      where: { tenantId, id: { in: changedIds } },
      data: {
        adminShippedOtpr: shipped,
        ...(shipped
          ? { adminShippedAt: new Date() }
          : { adminShippedAt: null }),
      },
    });
    await Promise.allSettled(
      changedIds.map((id) => recordOrderRevision(id, { kind: "SAVE" })),
    );

    if (shipped) {
      const actorLabel = userActivityDisplayLabel({
        mentionHandle: null,
        displayName: session?.name?.trim() || null,
        email: session?.email || null,
      });
      await Promise.allSettled(
        changedIds.map((id) =>
          applyWorkSentKanbanSideEffects({
            tenantId,
            orderId: id,
            actorUserId: session?.sub ?? null,
            actorLabel,
            request: req,
          }),
        ),
      );
    }
  }

  return NextResponse.json({
    ok: true,
    shipped,
    matched: rows.length,
    changed: changedIds.length,
    changedOrderIds: changedIds,
  });
}
