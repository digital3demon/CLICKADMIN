import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { canConfigurePayroll, normalizePayrollAmount } from "@/lib/payroll";

export const dynamic = "force-dynamic";

type ApplyRow = {
  name?: unknown;
  amountRub?: unknown;
  staffRoleIds?: unknown;
  priceListItemIds?: unknown;
  skip?: unknown;
};

function trimString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function trimStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((x) => trimString(x)).filter(Boolean)));
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!canConfigurePayroll(session.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const tenantId = await requireSessionTenantId(session);
  const prisma = await getPrisma();

  let body: { rows?: ApplyRow[] };
  try {
    body = (await req.json()) as { rows?: ApplyRow[] };
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "Нет строк для применения" }, { status: 400 });
  }

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    if (row.skip === true) {
      skipped += 1;
      continue;
    }
    const name = trimString(row.name);
    const amountRub = normalizePayrollAmount(row.amountRub);
    const staffRoleIds = trimStringArray(row.staffRoleIds);
    const priceListItemIds = trimStringArray(row.priceListItemIds);
    if (!name || !amountRub) {
      errors.push(`Строка ${i + 1}: нужно название и сумма`);
      continue;
    }
    if (staffRoleIds.length > 0) {
      const n = await prisma.payrollStaffRole.count({
        where: { tenantId, id: { in: staffRoleIds } },
      });
      if (n !== staffRoleIds.length) {
        errors.push(`Строка ${i + 1}: неизвестная роль`);
        continue;
      }
    }
    if (priceListItemIds.length > 0) {
      const n = await prisma.priceListItem.count({
        where: { id: { in: priceListItemIds } },
      });
      if (n !== priceListItemIds.length) {
        errors.push(`Строка ${i + 1}: неизвестная позиция прайса`);
        continue;
      }
    }

    const maxSort = await prisma.payrollPriceItemConfig.aggregate({
      where: { tenantId },
      _max: { sortOrder: true },
    });
    await prisma.payrollPriceItemConfig.create({
      data: {
        tenantId,
        name,
        amountRub,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 10 + created,
        priceListItemId: priceListItemIds[0] ?? null,
        staffRoles: {
          create: staffRoleIds.map((staffRoleId) => ({ staffRoleId })),
        },
        priceItems: {
          create: priceListItemIds.map((priceListItemId) => ({ priceListItemId })),
        },
      },
    });
    created += 1;
  }

  return NextResponse.json({
    ok: errors.length === 0,
    created,
    skipped,
    errors,
  });
}
