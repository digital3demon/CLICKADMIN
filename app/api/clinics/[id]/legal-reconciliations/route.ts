import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { listLegalEntityReconciliations } from "@/lib/legal-entity-reconciliation";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  }
  if (
    access?.CLIENTS !== true &&
    access?.CLIENTS_EDIT !== true &&
    access?.FINANCE_OFFICE !== true
  ) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет тенанта" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const tab =
    new URL(req.url).searchParams.get("tab") === "archive" ? "archive" : "open";
  const prisma = await getPrisma();
  const clinic = await prisma.clinic.findFirst({
    where: { id: id.trim(), tenantId },
    select: { id: true },
  });
  if (!clinic) {
    return NextResponse.json({ error: "Клиника не найдена" }, { status: 404 });
  }
  const { rows } = await listLegalEntityReconciliations({
    prisma,
    tenantId,
    tab,
    clinicId: clinic.id,
  });
  return NextResponse.json(
    { items: rows },
    { headers: { "Cache-Control": "no-store" } },
  );
}
