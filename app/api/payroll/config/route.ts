import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { getActivePriceListId } from "@/lib/price-list-workspace";
import {
  canConfigurePayroll,
  normalizePayrollAmount,
  parsePayrollWorkKind,
  PAYROLL_WORK_KIND_LABELS,
} from "@/lib/payroll";

export const dynamic = "force-dynamic";

type Body = {
  id?: unknown;
  priceListItemId?: unknown;
  kind?: unknown;
  amountRub?: unknown;
  description?: unknown;
};

function trimString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function requirePayrollConfigAccess() {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return { error: NextResponse.json({ error: "Требуется вход" }, { status: 401 }) };
  }
  if (!canConfigurePayroll(session.role)) {
    return { error: NextResponse.json({ error: "Недостаточно прав" }, { status: 403 }) };
  }
  const tenantId = await requireSessionTenantId(session);
  const prisma = await getPrisma();
  return { session, tenantId, prisma };
}

const configSelect = {
  id: true,
  priceListItemId: true,
  kind: true,
  amountRub: true,
  description: true,
  sortOrder: true,
  priceListItem: {
    select: {
      code: true,
      name: true,
      sectionTitle: true,
      subsectionTitle: true,
    },
  },
} as const;

function configPayload(c: {
  id: string;
  priceListItemId: string;
  kind: keyof typeof PAYROLL_WORK_KIND_LABELS;
  amountRub: number;
  description: string;
  sortOrder: number;
  priceListItem: {
    code: string;
    name: string;
    sectionTitle: string | null;
    subsectionTitle: string | null;
  };
}) {
  return {
    id: c.id,
    priceListItemId: c.priceListItemId,
    kind: c.kind,
    kindLabel: PAYROLL_WORK_KIND_LABELS[c.kind],
    amountRub: c.amountRub,
    description: c.description,
    sortOrder: c.sortOrder,
    priceCode: c.priceListItem.code,
    priceName: c.priceListItem.name,
    sectionTitle: c.priceListItem.sectionTitle,
    subsectionTitle: c.priceListItem.subsectionTitle,
  };
}

export async function GET() {
  const access = await requirePayrollConfigAccess();
  if ("error" in access) return access.error;

  const activePriceListId = await getActivePriceListId(access.prisma);
  const [priceItems, configs] = await Promise.all([
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
    access.prisma.payrollPriceItemConfig.findMany({
      where: { tenantId: access.tenantId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: configSelect,
    }),
  ]);

  return NextResponse.json(
    {
      priceItems,
      configs: configs.map(configPayload),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(req: Request) {
  const access = await requirePayrollConfigAccess();
  if ("error" in access) return access.error;
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const priceListItemId = trimString(body.priceListItemId);
  const kind = parsePayrollWorkKind(body.kind);
  const amountRub = normalizePayrollAmount(body.amountRub);
  const description = trimString(body.description);
  if (!priceListItemId || !kind || !amountRub || !description) {
    return NextResponse.json(
      { error: "Укажите позицию прайса, тип, сумму и описание" },
      { status: 400 },
    );
  }
  const item = await access.prisma.priceListItem.findUnique({
    where: { id: priceListItemId },
    select: { id: true },
  });
  if (!item) {
    return NextResponse.json({ error: "Позиция прайса не найдена" }, { status: 404 });
  }

  const maxSort = await access.prisma.payrollPriceItemConfig.aggregate({
    where: { tenantId: access.tenantId },
    _max: { sortOrder: true },
  });
  const config = await access.prisma.payrollPriceItemConfig.create({
    data: {
      tenantId: access.tenantId,
      priceListItemId,
      kind,
      amountRub,
      description,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 10,
    },
    select: configSelect,
  });
  return NextResponse.json({ ok: true, config: configPayload(config) });
}

export async function PATCH(req: Request) {
  const access = await requirePayrollConfigAccess();
  if ("error" in access) return access.error;
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

  const priceListItemId = trimString(body.priceListItemId);
  const kind = parsePayrollWorkKind(body.kind);
  const amountRub = normalizePayrollAmount(body.amountRub);
  const description = trimString(body.description);
  if (!priceListItemId || !kind || !amountRub || !description) {
    return NextResponse.json(
      { error: "Укажите позицию прайса, тип, сумму и описание" },
      { status: 400 },
    );
  }
  const config = await access.prisma.payrollPriceItemConfig.update({
    where: { id },
    data: { priceListItemId, kind, amountRub, description },
    select: configSelect,
  });
  return NextResponse.json({ ok: true, config: configPayload(config) });
}

export async function DELETE(req: Request) {
  const access = await requirePayrollConfigAccess();
  if ("error" in access) return access.error;
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
