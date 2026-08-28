import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getPrisma } from "@/lib/get-prisma";
import {
  LAB_TASK_CHAT_MAX_TEXT_LEN,
} from "@/lib/lab-task-chat";
import {
  loadLabTaskComments,
  markLabTaskChatSeen,
} from "@/lib/lab-task-chat.server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { userPersonDisplayName } from "@/lib/user-activity-display-label";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function taskAccess(taskId: string) {
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
  return { session, tenantId, prisma };
}

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const taskId = String(id || "").trim();
    if (!taskId) return NextResponse.json({ error: "Нет id" }, { status: 400 });
    const gate = await taskAccess(taskId);
    if ("error" in gate && gate.error) return gate.error;
    const session = gate.session!;
    await markLabTaskChatSeen({ taskId, userId: session.sub });
    const comments = await loadLabTaskComments({
      taskId,
      viewerUserId: session.sub,
    });
    return NextResponse.json(
      { comments },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[lab-tasks/comments] GET", e);
    return NextResponse.json({ error: "Не удалось загрузить чат" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    const taskId = String(id || "").trim();
    if (!taskId) return NextResponse.json({ error: "Нет id" }, { status: 400 });
    const gate = await taskAccess(taskId);
    if ("error" in gate && gate.error) return gate.error;
    const { session, prisma } = gate;

    let body: { text?: unknown; parentId?: unknown };
    try {
      body = (await req.json()) as { text?: unknown; parentId?: unknown };
    } catch {
      return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
    }
    const text = String(body.text ?? "").trim().slice(0, LAB_TASK_CHAT_MAX_TEXT_LEN);
    if (!text) {
      return NextResponse.json({ error: "Введите текст" }, { status: 400 });
    }
    const parentId = String(body.parentId ?? "").trim() || null;
    if (parentId) {
      const parent = await prisma.labTaskComment.findFirst({
        where: { id: parentId, taskId },
        select: { id: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "Сообщение для ответа не найдено" }, { status: 400 });
      }
    }

    const author = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { displayName: true, email: true, mentionHandle: true },
    });
    const authorLabel = author
      ? userPersonDisplayName(author)
      : (session.name || session.email?.split("@")[0] || "Пользователь").trim();

    await prisma.labTaskComment.create({
      data: {
        taskId,
        authorUserId: session.sub,
        authorLabel,
        text,
        parentId,
      },
    });
    await markLabTaskChatSeen({ taskId, userId: session.sub });
    const comments = await loadLabTaskComments({
      taskId,
      viewerUserId: session.sub,
    });
    return NextResponse.json({ ok: true, comments });
  } catch (e) {
    console.error("[lab-tasks/comments] POST", e);
    return NextResponse.json({ error: "Не удалось отправить" }, { status: 500 });
  }
}
