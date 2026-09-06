import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { isPayrollUserRole } from "@/lib/payroll";
import {
  configMatchesOrderPriceItems,
  isPayrollConfigVisibleForStaffRole,
  shouldFilterPayrollOptionsByStaffRole,
} from "@/lib/payroll-staff-roles";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!isPayrollUserRole(session.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const tenantId = await requireSessionTenantId(session);
  const prisma = await getPrisma();
  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId")?.trim() ?? "";

  const filterByRole = shouldFilterPayrollOptionsByStaffRole(session.role);
  const sessionUser = filterByRole
    ? await prisma.user.findFirst({
        where: { id: session.sub, tenantId },
        select: { payrollStaffRoleId: true },
      })
    : null;

  let orderPriceIds = new Set<string>();
  if (orderId) {
    const constructions = await prisma.orderConstruction.findMany({
      where: { orderId, order: { tenantId } },
      select: { priceListItemId: true },
    });
    orderPriceIds = new Set(
      constructions
        .map((c) => c.priceListItemId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    );
  }

  const rows = await prisma.payrollPriceItemConfig.findMany({
    where: {
      tenantId,
      amountRub: { gt: 0 },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      amountRub: true,
      staffRoles: { select: { staffRoleId: true } },
      priceItems: {
        select: {
          priceListItemId: true,
          priceListItem: {
            select: { code: true, name: true, isActive: true },
          },
        },
      },
    },
  });

  const mapped = rows
    .map((r) => {
      const staffRoleIds = r.staffRoles.map((s) => s.staffRoleId);
      const priceItems = r.priceItems
        .filter((p) => p.priceListItem.isActive)
        .map((p) => ({
          id: p.priceListItemId,
          code: p.priceListItem.code,
          name: p.priceListItem.name,
        }));
      const linkedIds = priceItems.map((p) => p.id);
      const matchedOrder = configMatchesOrderPriceItems(linkedIds, orderPriceIds);
      return {
        payrollConfigId: r.id,
        name: r.name,
        amountRub: r.amountRub,
        staffRoleIds,
        priceItems,
        matchedOrder,
        // legacy fields for older UI
        description: r.name,
        kind: null as string | null,
        kindLabel: "",
        code: priceItems[0]?.code ?? "",
        priceListItemId: priceItems[0]?.id ?? null,
      };
    })
    .filter((r) => {
      if (!filterByRole) return true;
      return isPayrollConfigVisibleForStaffRole(
        r.staffRoleIds,
        sessionUser?.payrollStaffRoleId,
      );
    })
    .sort((a, b) => {
      if (a.matchedOrder !== b.matchedOrder) return a.matchedOrder ? -1 : 1;
      return a.name.localeCompare(b.name, "ru");
    });

  return NextResponse.json(
    { items: mapped },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
