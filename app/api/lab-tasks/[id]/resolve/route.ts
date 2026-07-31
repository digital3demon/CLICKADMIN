import { NextResponse } from "next/server";
import { canAcceptOrderChatCorrections } from "@/lib/auth/permissions";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getPrisma } from "@/lib/get-prisma";
import { countPendingLabTasks, loadLabTasks } from "@/lib/lab-tasks.server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const { session, access } = await getSessionWithModuleAccess();
    if (!session?.sub) {
      return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
    }
    if (access?.ORDERS !== true) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }
    if (!canAcceptOrderChatCorrections(session.role)) {
      return NextResponse.json(
        { error: "Нет права отметить задачу готовой" },
        { status: 403 },
      );
    }

    const tenantId = await orderTenantIdForSession(session);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Не задана организация для сессии" },
        { status: 400 },
      );
    }

    const { id } = await ctx.params;
    const taskId = String(id || "").trim();
    if (!taskId) {
      return NextResponse.json({ error: "Нет id" }, { status: 400 });
    }

    const prisma = await getPrisma();
    const existing = await prisma.labTask.findFirst({
      where: { id: taskId, tenantId },
      select: { id: true, resolvedAt: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
    }
    if (existing.resolvedAt) {
      return NextResponse.json({ error: "Уже решена" }, { status: 409 });
    }

    await prisma.labTask.update({
      where: { id: taskId },
      data: {
        resolvedAt: new Date(),
        resolvedByUserId: session.sub,
      },
    });

    return NextResponse.json({
      ok: true,
      pendingCount: await countPendingLabTasks(tenantId),
      items: await loadLabTasks({ tenantId, status: "pending" }),
    });
  } catch (e) {
    console.error("[lab-tasks/resolve]", e);
    return NextResponse.json(
      { error: "Не удалось отметить задачу" },
      { status: 500 },
    );
  }
}
