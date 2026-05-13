import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { getActivePriceListId } from "@/lib/price-list-workspace";
import { canConfigurePayroll, normalizePayrollAmount } from "@/lib/payroll";

export const dynamic = "force-dynamic";

type PutBody = {
  priceListItemId?: unknown;
  cadRub?: unknown;
  cadSurgeryRub?: unknown;
  manualRub?: unknown;
  processingRub?: unknown;
};

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!canConfigurePayroll(session.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const tenantId = await requireSessionTenantId(session);
  const prisma = await getPrisma();
  const activePriceListId = await getActivePriceListId(prisma);
  const [items, configs] = await Promise.all([
    prisma.priceListItem.findMany({
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
    prisma.payrollPriceItemConfig.findMany({
      where: { tenantId },
      select: {
        priceListItemId: true,
        cadRub: true,
        cadSurgeryRub: true,
        manualRub: true,
        processingRub: true,
      },
    }),
  ]);
  const byItemId = new Map(configs.map((c) => [c.priceListItemId, c]));
  return NextResponse.json(
    {
      items: items.map((it) => ({
        ...it,
        config: byItemId.get(it.id) ?? {
          priceListItemId: it.id,
          cadRub: null,
          cadSurgeryRub: null,
          manualRub: null,
          processingRub: null,
        },
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function PUT(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!canConfigurePayroll(session.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const tenantId = await requireSessionTenantId(session);
  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const priceListItemId =
    typeof body.priceListItemId === "string" ? body.priceListItemId.trim() : "";
  if (!priceListItemId) {
    return NextResponse.json({ error: "Ожидается priceListItemId" }, { status: 400 });
  }

  const cadRub = normalizePayrollAmount(body.cadRub);
  const cadSurgeryRub = normalizePayrollAmount(body.cadSurgeryRub);
  const manualRub = normalizePayrollAmount(body.manualRub);
  const processingRub = normalizePayrollAmount(body.processingRub);
  const prisma = await getPrisma();
  const item = await prisma.priceListItem.findUnique({
    where: { id: priceListItemId },
    select: { id: true },
  });
  if (!item) {
    return NextResponse.json({ error: "Позиция прайса не найдена" }, { status: 404 });
  }

  if (!cadRub && !cadSurgeryRub && !manualRub && !processingRub) {
    await prisma.payrollPriceItemConfig.deleteMany({
      where: { tenantId, priceListItemId },
    });
    return NextResponse.json({ ok: true, config: null });
  }

  const config = await prisma.payrollPriceItemConfig.upsert({
    where: { tenantId_priceListItemId: { tenantId, priceListItemId } },
    create: {
      tenantId,
      priceListItemId,
      cadRub,
      cadSurgeryRub,
      manualRub,
      processingRub,
    },
    update: { cadRub, cadSurgeryRub, manualRub, processingRub },
    select: {
      priceListItemId: true,
      cadRub: true,
      cadSurgeryRub: true,
      manualRub: true,
      processingRub: true,
    },
  });
  return NextResponse.json(
    { ok: true, config },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
