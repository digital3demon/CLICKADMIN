import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { loadKaitenIntegrationTenantState } from "@/lib/kaiten-integration/settings";
import { tickKaitenIntegrationBackfill } from "@/lib/kaiten-integration/backfill";

export const dynamic = "force-dynamic";

export async function POST() {
  const s = await getSessionFromCookies();
  if (!s?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (s.role !== "OWNER") {
    return NextResponse.json(
      { error: "Только владелец может управлять догоняющей синхронизацией" },
      { status: 403 },
    );
  }
  const tenantId = await requireSessionTenantId(s);
  const prisma = await getPrisma();
  const current = await loadKaitenIntegrationTenantState(prisma, tenantId);
  if (current.backfill.status !== "running") {
    return NextResponse.json({
      ...(await loadKaitenIntegrationTenantState(prisma, tenantId)),
      canEdit: true,
    });
  }
  const tick = await tickKaitenIntegrationBackfill(prisma, tenantId);
  const state = await loadKaitenIntegrationTenantState(prisma, tenantId);
  return NextResponse.json({
    ...state,
    backfill: tick.state,
    done: tick.done,
    canEdit: true,
  });
}
