import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  const canFo = access?.FINANCE_OFFICE === true;
  const canClients =
    session.role === "OWNER" || access?.CLIENTS_EDIT === true;
  if (!canFo && !canClients) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет тенанта" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    paymentStatus?: "PAID" | "UNPAID";
    confirm?: boolean;
  };
  if (body.paymentStatus !== "PAID" && body.paymentStatus !== "UNPAID") {
    return NextResponse.json({ error: "Укажите paymentStatus" }, { status: 400 });
  }
  if (body.paymentStatus === "PAID" && body.confirm !== true) {
    return NextResponse.json(
      { error: "Нужно подтверждение оплаты" },
      { status: 400 },
    );
  }
  const prisma = await getPrisma();
  const row = await prisma.legalEntityReconciliation.findFirst({
    where: { id: id.trim(), tenantId },
    select: { id: true },
  });
  if (!row) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }
  await prisma.legalEntityReconciliation.update({
    where: { id: row.id },
    data:
      body.paymentStatus === "PAID"
        ? { paymentStatus: "PAID", paidAt: new Date() }
        : { paymentStatus: "UNPAID", paidAt: null },
  });
  return NextResponse.json({ ok: true });
}
