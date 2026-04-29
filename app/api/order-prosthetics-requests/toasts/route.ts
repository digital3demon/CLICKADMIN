import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { isKanbanOnlyUser } from "@/lib/auth/permissions";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";

export const dynamic = "force-dynamic";

/**
 * Открытые заявки по протетике («???» в чате) для глобальных уведомлений.
 * Роль «Пользователь» (только канбан) — пустой список.
 */
export async function GET() {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session || isKanbanOnlyUser(session.role, access ?? undefined)) {
    return NextResponse.json(
      { requests: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const prisma = await getOrdersPrisma();
  const rows = await prisma.orderProstheticsRequest.findMany({
    where: {
      resolvedAt: null,
      rejectedAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 32,
    select: {
      id: true,
      text: true,
      createdAt: true,
      order: { select: { id: true, orderNumber: true } },
    },
  });

  const requests = rows.map((r) => ({
    id: r.id,
    text: r.text,
    orderId: r.order.id,
    orderNumber: r.order.orderNumber,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json(
    { requests },
    { headers: { "Cache-Control": "no-store" } },
  );
}
