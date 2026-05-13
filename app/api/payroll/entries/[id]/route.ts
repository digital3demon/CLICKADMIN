import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import {
  canReviewPayroll,
  isPayrollUserRole,
  normalizePayrollQuantity,
} from "@/lib/payroll";

type Ctx = { params: Promise<{ id: string }> };

type PatchBody = {
  quantity?: unknown;
};

async function requireEntryAccess(id: string) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return { error: NextResponse.json({ error: "Требуется вход" }, { status: 401 }) };
  }
  if (!isPayrollUserRole(session.role)) {
    return { error: NextResponse.json({ error: "Недостаточно прав" }, { status: 403 }) };
  }
  const tenantId = await requireSessionTenantId(session);
  const prisma = await getPrisma();
  const entry = await prisma.payrollWorkEntry.findFirst({
    where: { id, tenantId },
    select: {
      id: true,
      userId: true,
      orderId: true,
      payrollConfigId: true,
      quantity: true,
      payrollConfig: {
        select: { amountRub: true },
      },
    },
  });
  if (!entry) {
    return { error: NextResponse.json({ error: "Начисление не найдено" }, { status: 404 }) };
  }
  if (entry.userId !== session.sub && !canReviewPayroll(session.role)) {
    return { error: NextResponse.json({ error: "Недостаточно прав" }, { status: 403 }) };
  }
  return { session, tenantId, prisma, entry };
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const access = await requireEntryAccess(id);
  if ("error" in access) return access.error;
  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const quantity = normalizePayrollQuantity(body.quantity);
  const unitAmountRub = access.entry.payrollConfig?.amountRub ?? null;
  if (!unitAmountRub || unitAmountRub <= 0) {
    return NextResponse.json({ error: "Для выбранной плашки не задана сумма" }, { status: 400 });
  }
  const amountRub = unitAmountRub * quantity;
  const updated = await access.prisma.payrollWorkEntry.update({
    where: { id },
    data: { quantity, amountRub, updatedByUserId: access.session.sub },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: updated.id });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const access = await requireEntryAccess(id);
  if ("error" in access) return access.error;
  await access.prisma.payrollWorkEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
