import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { sendOrderAutoReply } from "@/lib/mail/order-auto-reply";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { id: orderIdRaw } = await ctx.params;
    const orderId = orderIdRaw?.trim() ?? "";
    if (!orderId) {
      return NextResponse.json({ error: "Некорректный id наряда" }, { status: 400 });
    }

    const session = await getSessionFromCookies();
    const tenantId = await orderTenantIdForSession(session);
    if (!tenantId || !session) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const body = (await req.json()) as {
      replyToSourceEmailId?: string;
      autoReplySubject?: string;
      autoReplyHtml?: string;
    };

    const replyToSourceEmailId = body.replyToSourceEmailId?.trim() ?? "";
    const autoReplySubject = body.autoReplySubject?.trim() ?? "";
    const autoReplyHtml = body.autoReplyHtml?.trim() ?? "";
    if (!replyToSourceEmailId) {
      return NextResponse.json({ error: "Не указано письмо для ответа" }, { status: 400 });
    }
    if (!autoReplySubject || !autoReplyHtml) {
      return NextResponse.json({ error: "Пустая тема или текст ответа" }, { status: 400 });
    }

    const prisma = await getOrdersPrisma();
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: { id: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
    }

    const link = await prisma.emailSourceOrder.findFirst({
      where: { tenantId, orderId, emailId: replyToSourceEmailId },
      select: { id: true },
    });
    if (!link) {
      return NextResponse.json(
        { error: "Письмо не привязано к этому наряду" },
        { status: 400 },
      );
    }

    const autoReply = await sendOrderAutoReply({
      db: prisma,
      tenantId,
      userId: session.sub,
      role: session.role,
      orderId,
      replyToSourceEmailId,
      overrideSubject: autoReplySubject,
      overrideHtml: autoReplyHtml,
    });

    return NextResponse.json({ ok: true, autoReply });
  } catch (e) {
    console.error("[auto-reply POST]", e);
    return NextResponse.json(
      { error: "Не удалось отправить ответ" },
      { status: 500 },
    );
  }
}
