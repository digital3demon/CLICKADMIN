import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { isPayrollUserRole, PAYROLL_WORK_KIND_LABELS } from "@/lib/payroll";
import {
  isPayrollKindVisibleForTrack,
  shouldFilterPayrollOptionsByTrack,
} from "@/lib/payroll-tracks";
import { getPayrollKindTrackMap } from "@/lib/payroll-tracks.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!isPayrollUserRole(session.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const tenantId = await requireSessionTenantId(session);
  const prisma = await getPrisma();
  const filterByTrack = shouldFilterPayrollOptionsByTrack(session.role);
  const [kindTrackMap, sessionUser] = await Promise.all([
    filterByTrack ? getPayrollKindTrackMap(prisma, tenantId) : Promise.resolve(null),
    filterByTrack
      ? prisma.user.findFirst({
          where: { id: session.sub, tenantId },
          select: { payrollTrack: true },
        })
      : Promise.resolve(null),
  ]);
  const rows = await prisma.payrollPriceItemConfig.findMany({
    where: {
      tenantId,
      amountRub: { gt: 0 },
      priceListItem: { isActive: true },
    },
    orderBy: [
      { sortOrder: "asc" },
      { priceListItem: { sortOrder: "asc" } },
      { priceListItem: { code: "asc" } },
    ],
    select: {
      id: true,
      priceListItemId: true,
      kind: true,
      amountRub: true,
      description: true,
      priceListItem: {
        select: {
          code: true,
          name: true,
          sectionTitle: true,
          subsectionTitle: true,
        },
      },
    },
  });
  const visibleRows =
    filterByTrack && kindTrackMap
      ? rows.filter((r) =>
          isPayrollKindVisibleForTrack(
            r.kind,
            sessionUser?.payrollTrack,
            kindTrackMap,
          ),
        )
      : rows;

  return NextResponse.json(
    {
      items: visibleRows.map((r) => ({
        payrollConfigId: r.id,
        priceListItemId: r.priceListItemId,
        kind: r.kind,
        kindLabel: PAYROLL_WORK_KIND_LABELS[r.kind],
        amountRub: r.amountRub,
        description: r.description,
        code: r.priceListItem.code,
        name: r.priceListItem.name,
        sectionTitle: r.priceListItem.sectionTitle,
        subsectionTitle: r.priceListItem.subsectionTitle,
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
