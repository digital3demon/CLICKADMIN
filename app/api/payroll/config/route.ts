import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { getActivePriceListId } from "@/lib/price-list-workspace";
import {
  canConfigurePayroll,
  normalizePayrollAmount,
} from "@/lib/payroll";
import { ensureDefaultPayrollStaffRoles } from "@/lib/payroll-staff-roles.server";
import { isPayrollUserRole } from "@/lib/payroll";

export const dynamic = "force-dynamic";

type Body = {
  id?: unknown;
  name?: unknown;
  amountRub?: unknown;
  staffRoleIds?: unknown;
  priceListItemIds?: unknown;
};

function trimString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function trimStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map((x) => trimString(x)).filter(Boolean)),
  );
}

const configInclude = {
  staffRoles: {
    select: {
      staffRoleId: true,
      staffRole: { select: { id: true, name: true } },
    },
  },
  priceItems: {
    select: {
      priceListItemId: true,
      priceListItem: {
        select: {
          id: true,
          code: true,
          name: true,
          sectionTitle: true,
          subsectionTitle: true,
        },
      },
    },
  },
} as const;

type ConfigRow = {
  id: string;
  name: string;
  amountRub: number;
  sortOrder: number;
  staffRoles: {
    staffRoleId: string;
    staffRole: { id: string; name: string };
  }[];
  priceItems: {
    priceListItemId: string;
    priceListItem: {
      id: string;
      code: string;
      name: string;
      sectionTitle: string | null;
      subsectionTitle: string | null;
    };
  }[];
};

function configPayload(c: ConfigRow) {
  return {
    id: c.id,
    name: c.name,
    amountRub: c.amountRub,
    sortOrder: c.sortOrder,
    staffRoleIds: c.staffRoles.map((s) => s.staffRoleId),
    staffRoles: c.staffRoles.map((s) => ({
      id: s.staffRole.id,
      name: s.staffRole.name,
    })),
    priceListItemIds: c.priceItems.map((p) => p.priceListItemId),
    priceItems: c.priceItems.map((p) => ({
      id: p.priceListItem.id,
      code: p.priceListItem.code,
      name: p.priceListItem.name,
      sectionTitle: p.priceListItem.sectionTitle,
      subsectionTitle: p.priceListItem.subsectionTitle,
    })),
  };
}

async function requireConfigAccess(opts?: { allowPayrollRead?: boolean }) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return { error: NextResponse.json({ error: "Требуется вход" }, { status: 401 }) };
  }
  const canWrite = canConfigurePayroll(session.role);
  const canRead =
    canWrite ||
    (opts?.allowPayrollRead === true && isPayrollUserRole(session.role));
  if (!canRead) {
    return { error: NextResponse.json({ error: "Недостаточно прав" }, { status: 403 }) };
  }
  const tenantId = await requireSessionTenantId(session);
  const prisma = await getPrisma();
  return { session, tenantId, prisma, canWrite };
}

export async function GET() {
  const access = await requireConfigAccess({ allowPayrollRead: true });
  if ("error" in access) return access.error;

  if (access.canWrite) {
    await ensureDefaultPayrollStaffRoles(access.prisma, access.tenantId);
  }

  const activePriceListId = await getActivePriceListId(access.prisma);
  const [priceItems, staffRoles, configs] = await Promise.all([
    access.prisma.priceListItem.findMany({
      where: { priceListId: activePriceListId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        sectionTitle: true,
        subsectionTitle: true,
      },
    }),
    access.prisma.payrollStaffRole.findMany({
      where: { tenantId: access.tenantId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, sortOrder: true },
    }),
    access.prisma.payrollPriceItemConfig.findMany({
      where: { tenantId: access.tenantId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: configInclude,
    }),
  ]);

  let visible = configs.map(configPayload);
  if (!access.canWrite && access.session.role === "USER") {
    const user = await access.prisma.user.findFirst({
      where: { id: access.session.sub, tenantId: access.tenantId },
      select: { payrollStaffRoleId: true },
    });
    const roleId = user?.payrollStaffRoleId ?? null;
    visible = visible.filter(
      (c) =>
        c.staffRoleIds.length === 0 ||
        (roleId != null && c.staffRoleIds.includes(roleId)),
    );
  }

  return NextResponse.json(
    {
      priceItems,
      staffRoles,
      configs: visible,
      canConfigure: access.canWrite,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(req: Request) {
  const access = await requireConfigAccess();
  if ("error" in access) return access.error;
  if (!access.canWrite) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const name = trimString(body.name);
  const amountRub = normalizePayrollAmount(body.amountRub);
  const staffRoleIds = trimStringArray(body.staffRoleIds);
  const priceListItemIds = trimStringArray(body.priceListItemIds);
  if (!name || !amountRub) {
    return NextResponse.json(
      { error: "Укажите название и сумму" },
      { status: 400 },
    );
  }

  if (staffRoleIds.length > 0) {
    const roles = await access.prisma.payrollStaffRole.findMany({
      where: { tenantId: access.tenantId, id: { in: staffRoleIds } },
      select: { id: true },
    });
    if (roles.length !== staffRoleIds.length) {
      return NextResponse.json({ error: "Роль не найдена" }, { status: 404 });
    }
  }
  if (priceListItemIds.length > 0) {
    const items = await access.prisma.priceListItem.findMany({
      where: { id: { in: priceListItemIds } },
      select: { id: true },
    });
    if (items.length !== priceListItemIds.length) {
      return NextResponse.json(
        { error: "Одна или несколько позиций прайса не найдены" },
        { status: 404 },
      );
    }
  }

  const maxSort = await access.prisma.payrollPriceItemConfig.aggregate({
    where: { tenantId: access.tenantId },
    _max: { sortOrder: true },
  });
  const config = await access.prisma.payrollPriceItemConfig.create({
    data: {
      tenantId: access.tenantId,
      name,
      amountRub,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 10,
      priceListItemId: priceListItemIds[0] ?? null,
      staffRoles: {
        create: staffRoleIds.map((staffRoleId) => ({ staffRoleId })),
      },
      priceItems: {
        create: priceListItemIds.map((priceListItemId) => ({ priceListItemId })),
      },
    },
    include: configInclude,
  });
  return NextResponse.json({ ok: true, config: configPayload(config) });
}

export async function PATCH(req: Request) {
  const access = await requireConfigAccess();
  if ("error" in access) return access.error;
  if (!access.canWrite) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const id = trimString(body.id);
  if (!id) return NextResponse.json({ error: "Ожидается id" }, { status: 400 });
  const existing = await access.prisma.payrollPriceItemConfig.findFirst({
    where: { id, tenantId: access.tenantId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Строка ФОТ не найдена" }, { status: 404 });
  }

  const name = trimString(body.name);
  const amountRub = normalizePayrollAmount(body.amountRub);
  const staffRoleIds = trimStringArray(body.staffRoleIds);
  const priceListItemIds = trimStringArray(body.priceListItemIds);
  if (!name || !amountRub) {
    return NextResponse.json(
      { error: "Укажите название и сумму" },
      { status: 400 },
    );
  }

  if (staffRoleIds.length > 0) {
    const roles = await access.prisma.payrollStaffRole.findMany({
      where: { tenantId: access.tenantId, id: { in: staffRoleIds } },
      select: { id: true },
    });
    if (roles.length !== staffRoleIds.length) {
      return NextResponse.json({ error: "Роль не найдена" }, { status: 404 });
    }
  }

  await access.prisma.$transaction([
    access.prisma.payrollConfigStaffRole.deleteMany({ where: { configId: id } }),
    access.prisma.payrollConfigPriceItem.deleteMany({ where: { configId: id } }),
    access.prisma.payrollPriceItemConfig.update({
      where: { id },
      data: {
        name,
        amountRub,
        priceListItemId: priceListItemIds[0] ?? null,
        staffRoles: {
          create: staffRoleIds.map((staffRoleId) => ({ staffRoleId })),
        },
        priceItems: {
          create: priceListItemIds.map((priceListItemId) => ({ priceListItemId })),
        },
      },
    }),
  ]);

  const config = await access.prisma.payrollPriceItemConfig.findFirstOrThrow({
    where: { id },
    include: configInclude,
  });
  return NextResponse.json({ ok: true, config: configPayload(config) });
}

export async function DELETE(req: Request) {
  const access = await requireConfigAccess();
  if ("error" in access) return access.error;
  if (!access.canWrite) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const id = trimString(body.id);
  if (!id) return NextResponse.json({ error: "Ожидается id" }, { status: 400 });

  const used = await access.prisma.payrollWorkEntry.findFirst({
    where: { tenantId: access.tenantId, payrollConfigId: id },
    select: { id: true },
  });
  if (used) {
    return NextResponse.json(
      { error: "Эта строка уже использована в начислениях. Удаление запрещено." },
      { status: 409 },
    );
  }
  await access.prisma.payrollPriceItemConfig.deleteMany({
    where: { id, tenantId: access.tenantId },
  });
  return NextResponse.json({ ok: true });
}
