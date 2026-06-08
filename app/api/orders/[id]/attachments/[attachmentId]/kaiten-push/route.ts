import { OrderAttachmentScope } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { KaitenRateLimitError, pushAttachmentToKaiten } from "@/lib/kaiten-sync";
import { kaitenRetryAfterSeconds } from "@/lib/kaiten-rate-limit";

type Ctx = { params: Promise<{ id: string; attachmentId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { id: orderId, attachmentId } = await ctx.params;
  if (!orderId?.trim() || !attachmentId?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const session = await getSessionFromCookies();
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const prisma = await getOrdersPrisma();
  const row = await prisma.orderAttachment.findFirst({
    where: { id: attachmentId.trim(), orderId: orderId.trim() },
    select: {
      id: true,
      scope: true,
      uploadedToKaitenAt: true,
      order: {
        select: {
          tenantId: true,
          kaitenCardId: true,
          invoiceAttachmentId: true,
        },
      },
    },
  });
  if (!row || row.order.tenantId !== tenantId) {
    return NextResponse.json({ error: "Вложение не найдено" }, { status: 404 });
  }
  if (row.order.kaitenCardId == null) {
    return NextResponse.json(
      { error: "У наряда нет карточки Kaiten" },
      { status: 400 },
    );
  }
  if (row.scope === OrderAttachmentScope.PAYMENT_SLIP) {
    return NextResponse.json(
      { error: "Платёжки не выгружаются в Kaiten" },
      { status: 400 },
    );
  }
  if (row.order.invoiceAttachmentId === row.id) {
    return NextResponse.json(
      { error: "Счёт не дублируется в Kaiten" },
      { status: 400 },
    );
  }
  if (row.uploadedToKaitenAt != null) {
    return NextResponse.json({ ok: true, alreadyUploaded: true });
  }

  try {
    await pushAttachmentToKaiten(orderId.trim(), attachmentId.trim(), prisma);
    const fresh = await prisma.orderAttachment.findUnique({
      where: { id: attachmentId.trim() },
      select: { uploadedToKaitenAt: true, kaitenFileId: true },
    });
    return NextResponse.json({
      ok: true,
      uploadedToKaitenAt: fresh?.uploadedToKaitenAt?.toISOString() ?? null,
      kaitenFileId: fresh?.kaitenFileId ?? null,
    });
  } catch (e) {
    if (e instanceof KaitenRateLimitError) {
      return NextResponse.json(
        {
          error: "Слишком много запросов к Kaiten, повторите позже",
          rateLimited: true,
        },
        { status: 429, headers: { "Retry-After": kaitenRetryAfterSeconds() } },
      );
    }
    const msg = e instanceof Error ? e.message : "Не удалось выгрузить в Kaiten";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
