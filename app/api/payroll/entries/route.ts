import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import {
  canReviewPayroll,
  isPayrollUserRole,
  PAYROLL_WORK_KIND_LABELS,
  normalizePayrollQuantity,
  type PayrollWorkKindValue,
} from "@/lib/payroll";
import {
  isPayrollConfigVisibleForStaffRole,
  shouldFilterPayrollOptionsByStaffRole,
} from "@/lib/payroll-staff-roles";

export const dynamic = "force-dynamic";

type PostBody = {
  orderId?: unknown;
  kanbanCardId?: unknown;
  payrollConfigId?: unknown;
  quantity?: unknown;
  userId?: unknown;
};

function parseDateBound(raw: string | null, endExclusive = false): Date | null {
  const text = (raw ?? "").trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const d = new Date(`${text}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) return null;
    if (endExclusive) d.setUTCDate(d.getUTCDate() + 1);
    return d;
  }
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d;
}

const entrySelect = {
  id: true,
  orderId: true,
  kanbanCardId: true,
  payrollConfigId: true,
  priceListItemId: true,
  kind: true,
  quantity: true,
  amountRub: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { displayName: true } },
  order: {
    select: {
      orderNumber: true,
      patientName: true,
      doctor: { select: { fullName: true } },
    },
  },
  priceListItem: {
    select: { code: true, name: true, sectionTitle: true, subsectionTitle: true },
  },
  payrollConfig: {
    select: { name: true },
  },
} satisfies Prisma.PayrollWorkEntrySelect;

type EntryRow = Prisma.PayrollWorkEntryGetPayload<{ select: typeof entrySelect }>;

function entryPayload(row: EntryRow) {
  const kind = row.kind as PayrollWorkKindValue | null;
  return {
    id: row.id,
    orderId: row.orderId,
    kanbanCardId: row.kanbanCardId,
    payrollConfigId: row.payrollConfigId,
    priceListItemId: row.priceListItemId,
    kind: row.kind,
    kindLabel: kind ? PAYROLL_WORK_KIND_LABELS[kind] : "",
    quantity: row.quantity,
    amountRub: row.amountRub,
    userId: row.userId,
    userDisplayName: row.user.displayName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    orderNumber: row.order.orderNumber,
    patientName: row.order.patientName ?? "",
    doctorName: row.order.doctor.fullName,
    priceCode: row.priceListItem?.code ?? "",
    priceName: row.priceListItem?.name ?? "",
    configDescription: row.payrollConfig?.name ?? row.priceListItem?.name ?? "",
    configName: row.payrollConfig?.name ?? "",
    sectionTitle: row.priceListItem?.sectionTitle ?? null,
    subsectionTitle: row.priceListItem?.subsectionTitle ?? null,
  };
}

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!isPayrollUserRole(session.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const tenantId = await requireSessionTenantId(session);
  const url = new URL(req.url);
  const requestedUserId = url.searchParams.get("userId")?.trim() ?? "";
  const orderId = url.searchParams.get("orderId")?.trim() ?? "";
  const from = parseDateBound(url.searchParams.get("from"));
  const to = parseDateBound(url.searchParams.get("to"), true);
  const reviewer = canReviewPayroll(session.role);

  const where: Prisma.PayrollWorkEntryWhereInput = { tenantId };
  if (orderId) where.orderId = orderId;
  if (session.role === "USER") {
    where.userId = session.sub;
  } else if (requestedUserId) {
    where.userId = requestedUserId;
  } else if (!reviewer) {
    where.userId = session.sub;
  }
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lt: to } : {}),
    };
  }

  const prisma = await getPrisma();
  const [entries, users] = await Promise.all([
    prisma.payrollWorkEntry.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 500,
      select: entrySelect,
    }),
    reviewer && url.searchParams.get("includeUsers") === "1"
      ? prisma.user.findMany({
          where: { tenantId, role: "USER", isActive: true },
          orderBy: { displayName: "asc" },
          select: { id: true, displayName: true, email: true },
        })
      : Promise.resolve([]),
  ]);

  return NextResponse.json(
    {
      entries: entries.map(entryPayload),
      users,
      totalRub: entries.reduce((sum, row) => sum + row.amountRub, 0),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!isPayrollUserRole(session.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const tenantId = await requireSessionTenantId(session);
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const kanbanCardId =
    typeof body.kanbanCardId === "string" && body.kanbanCardId.trim()
      ? body.kanbanCardId.trim()
      : null;
  const payrollConfigId =
    typeof body.payrollConfigId === "string" ? body.payrollConfigId.trim() : "";
  const requestedUserId = typeof body.userId === "string" ? body.userId.trim() : "";
  const userId =
    canReviewPayroll(session.role) && requestedUserId ? requestedUserId : session.sub;
  const quantity = normalizePayrollQuantity(body.quantity);
  if (!orderId || !payrollConfigId) {
    return NextResponse.json(
      { error: "Ожидаются orderId и payrollConfigId" },
      { status: 400 },
    );
  }

  const prisma = await getPrisma();
  const [order, targetUser, config] = await Promise.all([
    prisma.order.findFirst({
      where: { id: orderId, tenantId, archivedAt: null },
      select: { id: true },
    }),
    prisma.user.findFirst({
      where: { id: userId, tenantId, isActive: true },
      select: { id: true, role: true, payrollStaffRoleId: true },
    }),
    prisma.payrollPriceItemConfig.findFirst({
      where: { id: payrollConfigId, tenantId },
      select: {
        id: true,
        priceListItemId: true,
        kind: true,
        amountRub: true,
        staffRoles: { select: { staffRoleId: true } },
        priceItems: { select: { priceListItemId: true }, take: 1 },
      },
    }),
  ]);
  if (!order) return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
  if (!targetUser) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }
  if (!config) {
    return NextResponse.json({ error: "Для позиции не настроен ФОТ" }, { status: 400 });
  }
  if (config.amountRub <= 0) {
    return NextResponse.json({ error: "Для выбранной плашки не задана сумма" }, { status: 400 });
  }
  if (shouldFilterPayrollOptionsByStaffRole(targetUser.role)) {
    const roleIds = config.staffRoles.map((s) => s.staffRoleId);
    if (!isPayrollConfigVisibleForStaffRole(roleIds, targetUser.payrollStaffRoleId)) {
      return NextResponse.json(
        { error: "Этот ФОТ недоступен для роли пользователя" },
        { status: 403 },
      );
    }
  }
  const priceListItemId =
    config.priceItems[0]?.priceListItemId ?? config.priceListItemId ?? null;
  const amountRub = config.amountRub * quantity;

  const entry = await prisma.payrollWorkEntry.upsert({
    where: {
      orderId_payrollConfigId_userId: {
        orderId,
        payrollConfigId,
        userId,
      },
    },
    create: {
      tenantId,
      orderId,
      kanbanCardId,
      payrollConfigId,
      priceListItemId,
      kind: config.kind,
      quantity,
      amountRub,
      userId,
      updatedByUserId: session.sub,
    },
    update: { quantity, amountRub, kanbanCardId, updatedByUserId: session.sub },
    select: entrySelect,
  });
  return NextResponse.json(
    { ok: true, entry: entryPayload(entry) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
