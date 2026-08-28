import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getPrisma } from "@/lib/get-prisma";
import {
  canMutateLabTaskChatMessage,
  LAB_TASK_CHAT_MAX_TEXT_LEN,
} from "@/lib/lab-task-chat";
import { loadLabTaskComments } from "@/lib/lab-task-chat.server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; commentId: string }> };

async function loadOwnedComment(taskId: string, commentId: string) {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return { error: NextResponse.json({ error: "Нужна авторизация" }, { status: 401 }) };
  }
  if (access?.ORDERS !== true) {
    return { error: NextResponse.json({ error: "Нет доступа" }, { status: 403 }) };
  }
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return {
      error: NextResponse.json(
        { error: "Не задана организация для сессии" },
        { status: 400 },
      ),
    };
  }
  const prisma = await getPrisma();
  const task = await prisma.labTask.findFirst({
    where: { id: taskId, tenantId },
    select: { id: true },
  });
  if (!task) {
    return { error: NextResponse.json({ error: "Не найдено" }, { status: 404 }) };
  }
  const row = await prisma.labTaskComment.findFirst({
    where: { id: commentId, taskId },
  });
  if (!row) {
    return { error: NextResponse.json({ error: "Сообщение не найдено" }, { status: 404 }) };
  }
  if (
    !canMutateLabTaskChatMessage({
      authorUserId: row.authorUserId,
      viewerUserId: session.sub,
      createdAt: row.createdAt,
      deletedAt: row.deletedAt,
    })
  ) {
    return {
      error: NextResponse.json(
        { error: "Изменить или удалить можно только своё сообщение в течение часа" },
        { status: 403 },
      ),
    };
  }
  return { session, prisma, row };
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id, commentId } = await ctx.params;
    const taskId = String(id || "").trim();
    const cid = String(commentId || "").trim();
    if (!taskId || !cid) {
      return NextResponse.json({ error: "Нет id" }, { status: 400 });
    }
    const gate = await loadOwnedComment(taskId, cid);
    if ("error" in gate && gate.error) return gate.error;
    const { session, prisma } = gate;

    let body: { text?: unknown };
    try {
      body = (await req.json()) as { text?: unknown };
    } catch {
      return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
    }
    const text = String(body.text ?? "").trim().slice(0, LAB_TASK_CHAT_MAX_TEXT_LEN);
    if (!text) {
      return NextResponse.json({ error: "Введите текст" }, { status: 400 });
    }
    await prisma.labTaskComment.update({
      where: { id: cid },
      data: { text, editedAt: new Date() },
    });
    return NextResponse.json({
      ok: true,
      comments: await loadLabTaskComments({
        taskId,
        viewerUserId: session.sub,
      }),
    });
  } catch (e) {
    console.error("[lab-tasks/comments] PATCH", e);
    return NextResponse.json({ error: "Не удалось изменить" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id, commentId } = await ctx.params;
    const taskId = String(id || "").trim();
    const cid = String(commentId || "").trim();
    if (!taskId || !cid) {
      return NextResponse.json({ error: "Нет id" }, { status: 400 });
    }
    const gate = await loadOwnedComment(taskId, cid);
    if ("error" in gate && gate.error) return gate.error;
    const { session, prisma } = gate;
    await prisma.labTaskComment.update({
      where: { id: cid },
      data: { deletedAt: new Date(), text: "" },
    });
    return NextResponse.json({
      ok: true,
      comments: await loadLabTaskComments({
        taskId,
        viewerUserId: session.sub,
      }),
    });
  } catch (e) {
    console.error("[lab-tasks/comments] DELETE", e);
    return NextResponse.json({ error: "Не удалось удалить" }, { status: 500 });
  }
}
