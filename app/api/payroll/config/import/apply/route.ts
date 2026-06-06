import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import {
  canConfigurePayroll,
  normalizePayrollAmount,
  parsePayrollWorkKind,
} from "@/lib/payroll";

export const dynamic = "force-dynamic";

type ApplyRow = {
  priceListItemId?: unknown;
  kind?: unknown;
  amountRub?: unknown;
  description?: unknown;
  existingConfigId?: unknown;
};

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

  let body: { confirmed?: unknown; rows?: unknown };
  try {
    body = (await req.json()) as { confirmed?: unknown; rows?: unknown };
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  if (body.confirmed !== true) {
    return NextResponse.json(
      { error: "Подтвердите галочкой «Данные корректны»" },
      { status: 400 },
    );
  }
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: "Нет строк для импорта" }, { status: 400 });
  }

  const maxSort = await prisma.payrollPriceItemConfig.aggregate({
    where: { tenantId },
    _max: { sortOrder: true },
  });
  let sortCursor = maxSort._max.sortOrder ?? 0;

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const raw of body.rows as ApplyRow[]) {
    const priceListItemId =
      typeof raw.priceListItemId === "string" ? raw.priceListItemId.trim() : "";
    const kind = parsePayrollWorkKind(raw.kind);
    const amountRub = normalizePayrollAmount(raw.amountRub);
    const description =
      typeof raw.description === "string" ? raw.description.trim() : "";
    const existingConfigId =
      typeof raw.existingConfigId === "string" ? raw.existingConfigId.trim() : "";

    if (!priceListItemId || !kind || !amountRub || !description) {
      skipped += 1;
      continue;
    }

    const item = await prisma.priceListItem.findFirst({
      where: { id: priceListItemId, isActive: true },
      select: { id: true },
    });
    if (!item) {
      skipped += 1;
      continue;
    }

    if (existingConfigId) {
      const row = await prisma.payrollPriceItemConfig.findFirst({
        where: { id: existingConfigId, tenantId },
        select: { id: true },
      });
      if (row) {
        await prisma.payrollPriceItemConfig.update({
          where: { id: existingConfigId },
          data: { priceListItemId, kind, amountRub, description },
        });
        updated += 1;
        continue;
      }
    }

    const existing = await prisma.payrollPriceItemConfig.findFirst({
      where: { tenantId, priceListItemId, kind },
      select: { id: true },
    });
    if (existing) {
      await prisma.payrollPriceItemConfig.update({
        where: { id: existing.id },
        data: { amountRub, description },
      });
      updated += 1;
      continue;
    }

    sortCursor += 10;
    await prisma.payrollPriceItemConfig.create({
      data: {
        tenantId,
        priceListItemId,
        kind,
        amountRub,
        description,
        sortOrder: sortCursor,
      },
    });
    created += 1;
  }

  return NextResponse.json({ ok: true, created, updated, skipped });
}
