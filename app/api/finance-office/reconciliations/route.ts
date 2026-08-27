import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { listLegalEntityReconciliations } from "@/lib/legal-entity-reconciliation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
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
  const tab =
    new URL(req.url).searchParams.get("tab") === "archive" ? "archive" : "open";
  const prisma = await getPrisma();
  const { rows, highlightCount } = await listLegalEntityReconciliations({
    prisma,
    tenantId,
    tab,
  });
  return NextResponse.json(
    { items: rows, highlightCount },
    { headers: { "Cache-Control": "no-store" } },
  );
}
