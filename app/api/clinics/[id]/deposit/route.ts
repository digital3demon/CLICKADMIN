import { NextResponse } from "next/server";
import { canEditOrders } from "@/lib/auth/permissions";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import {
  listRecentDepositEntries,
  topUpDeposit,
  writeOffDeposit,
} from "@/lib/deposit-ledger";
import { getClientsPrisma } from "@/lib/get-domain-prisma";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";

export const dynamic = "force-dynamic";

async function assertDepositAccess() {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return { error: NextResponse.json({ error: "Требуется вход" }, { status: 401 }) };
  }
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return { error: NextResponse.json({ error: "Требуется вход" }, { status: 401 }) };
  }
  const moduleAccess = await getEffectiveModuleAccess(tenantId, session.role);
  if (!canEditOrders(session.role, moduleAccess)) {
    return {
      error: NextResponse.json(
        { error: "Нет права «Редактирование заказа» для операций с депозитом" },
        { status: 403 },
      ),
    };
  }
  return { session, tenantId };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await orderTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const clinicId = id?.trim();
  if (!clinicId) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  const prisma = await getClientsPrisma();
  const clinic = await prisma.clinic.findFirst({
    where: { id: clinicId, tenantId, deletedAt: null },
    select: { id: true, depositBalanceRub: true, name: true },
  });
  if (!clinic) {
    return NextResponse.json({ error: "Клиника не найдена" }, { status: 404 });
  }

  const entries = await listRecentDepositEntries(prisma, {
    tenantId,
    party: "CLINIC",
    clinicId,
    take: 20,
  });

  return NextResponse.json({
    balanceRub: clinic.depositBalanceRub,
    entries: entries.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const access = await assertDepositAccess();
  if ("error" in access && access.error) return access.error;
  const { session, tenantId } = access as {
    session: { sub: string };
    tenantId: string;
  };

  const { id } = await ctx.params;
  const clinicId = id?.trim();
  if (!clinicId) {
    return NextResponse.json({ error: "Не указан id" }, { status: 400 });
  }

  let body: { amountRub?: unknown; kind?: unknown; note?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 });
  }

  const amountRub = Number(body.amountRub);
  const kind = body.kind === "WRITE_OFF" ? "WRITE_OFF" : body.kind === "TOPUP" ? "TOPUP" : null;
  const note = typeof body.note === "string" ? body.note : null;
  if (!kind || !Number.isFinite(amountRub) || amountRub <= 0) {
    return NextResponse.json(
      { error: "Укажите kind (TOPUP|WRITE_OFF) и amountRub > 0" },
      { status: 400 },
    );
  }

  const prisma = await getClientsPrisma();
  try {
    const result = await prisma.$transaction(async (tx) => {
      if (kind === "TOPUP") {
        return topUpDeposit(tx, {
          tenantId,
          party: "CLINIC",
          clinicId,
          amountRub,
          note,
          createdByUserId: session.sub,
        });
      }
      return writeOffDeposit(tx, {
        tenantId,
        party: "CLINIC",
        clinicId,
        amountRub,
        note,
        createdByUserId: session.sub,
      });
    });
    return NextResponse.json({ ok: true, ...result, kind });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка депозита";
    const status = msg.includes("не найден") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
