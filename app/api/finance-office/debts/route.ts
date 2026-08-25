import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { FINANCE_OFFICE_DEBT_DEFAULT_DAYS } from "@/lib/finance-office-debt-settings";
import {
  countFinanceOfficeDebts,
  listFinanceOfficeDebts,
} from "@/lib/finance-office-debts";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (access?.FINANCE_OFFICE !== true) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет тенанта" }, { status: 403 });
  }
  const prisma = await getPrisma();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { financeOfficeDebtWorkingDays: true },
  });
  const workingDays =
    tenant?.financeOfficeDebtWorkingDays ?? FINANCE_OFFICE_DEBT_DEFAULT_DAYS;
  const [items, count] = await Promise.all([
    listFinanceOfficeDebts(prisma, tenantId, workingDays),
    countFinanceOfficeDebts(prisma, tenantId, workingDays),
  ]);
  return NextResponse.json(
    { items, count, workingDays },
    { headers: { "Cache-Control": "no-store" } },
  );
}
