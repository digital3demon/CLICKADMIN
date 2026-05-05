import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getKaitenRestAuth } from "@/lib/kaiten-rest";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

type RouteProps = {
  params?: Promise<{ id: string; fileId: string }>;
};

export async function GET(_req: Request, { params }: RouteProps) {
  const resolvedParams = params ? await params : null;
  const orderId = resolvedParams?.id?.trim() ?? "";
  const fileIdRaw = resolvedParams?.fileId?.trim() ?? "";
  const fileId = Number(fileIdRaw);
  if (!orderId || !Number.isFinite(fileId)) {
    return NextResponse.json({ error: "Некорректный файл" }, { status: 400 });
  }

  const session = await getSessionFromCookies();
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const auth = getKaitenRestAuth();
  if (!auth) {
    return NextResponse.json({ error: "Kaiten не настроен" }, { status: 503 });
  }

  const order = await (await getOrdersPrisma()).order.findFirst({
    where: { id: orderId, tenantId },
    select: { kaitenCardId: true },
  });
  if (!order?.kaitenCardId) {
    return NextResponse.json({ error: "Карточка Kaiten не найдена" }, { status: 404 });
  }

  const url = `${auth.apiBase}/cards/${order.kaitenCardId}/files/${fileId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${auth.token}` },
  });
  if (!res.ok || !res.body) {
    return NextResponse.json(
      { error: "Не удалось загрузить файл Kaiten" },
      { status: res.status || 502 },
    );
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "private, max-age=300",
    },
  });
}
