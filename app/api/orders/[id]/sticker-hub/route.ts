import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { ensureStickerPublicTokenForOrder } from "@/lib/order-sticker-token";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { getSiteOrigin } from "@/lib/site-origin-server";
import {
  stickerPublicHubAbsoluteUrl,
  stickerPublicHubPath,
} from "@/lib/sticker-public-path";

export const dynamic = "force-dynamic";

/**
 * URL витрины QR (тот же, что на стикере отгрузки) для QR на наряде.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  const { id: orderId } = await ctx.params;
  if (!orderId?.trim()) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const prisma = await getOrdersPrisma();
  const order = await prisma.order.findFirst({
    where: { id: orderId.trim(), tenantId },
    select: {
      id: true,
      tenant: { select: { slug: true } },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  }
  const slug = order.tenant?.slug?.trim();
  if (!slug) {
    return NextResponse.json(
      { error: "У лаборатории нет slug для публичной витрины" },
      { status: 503 },
    );
  }

  const token = await ensureStickerPublicTokenForOrder(
    prisma,
    tenantId,
    order.id,
  );
  const path = stickerPublicHubPath(slug, token);
  const origin = await getSiteOrigin();
  const url = origin
    ? stickerPublicHubAbsoluteUrl(origin, slug, token)
    : path;

  return NextResponse.json({
    ok: true,
    path,
    url,
  });
}
