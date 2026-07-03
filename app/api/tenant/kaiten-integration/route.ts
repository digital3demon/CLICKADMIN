import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import {
  loadKaitenIntegrationTenantState,
  readKaitenIntegrationBackfillState,
  writeKaitenIntegrationBackfillState,
  isKaitenEnvConfigured,
} from "@/lib/kaiten-integration/settings";
import {
  startKaitenIntegrationBackfill,
  tickKaitenIntegrationBackfill,
  retryKaitenIntegrationBackfill,
} from "@/lib/kaiten-integration/backfill";

export const dynamic = "force-dynamic";

function canViewKaitenIntegration(role: UserRole): boolean {
  return (
    role === "OWNER" ||
    role === "SENIOR_ADMINISTRATOR" ||
    role === "ADMINISTRATOR" ||
    role === "MANAGER"
  );
}

function canEditKaitenIntegration(role: UserRole): boolean {
  return role === "OWNER";
}

export async function GET() {
  const s = await getSessionFromCookies();
  if (!s?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!canViewKaitenIntegration(s.role as UserRole)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  const tenantId = await requireSessionTenantId(s);
  const prisma = await getPrisma();
  const state = await loadKaitenIntegrationTenantState(prisma, tenantId);
  return NextResponse.json({
    ...state,
    canEdit: canEditKaitenIntegration(s.role as UserRole),
  });
}

export async function PATCH(req: Request) {
  const s = await getSessionFromCookies();
  if (!s?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!canEditKaitenIntegration(s.role as UserRole)) {
    return NextResponse.json(
      { error: "Только владелец может менять интеграцию с Kaiten" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const raw = body as { enabled?: unknown; action?: unknown };
  const tenantId = await requireSessionTenantId(s);
  const prisma = await getPrisma();
  const current = await loadKaitenIntegrationTenantState(prisma, tenantId);

  if (raw.action === "retry-backfill") {
    if (current.backfill.status !== "failed") {
      return NextResponse.json(
        { error: "Нет ошибки для повтора" },
        { status: 400 },
      );
    }
    const backfill = await retryKaitenIntegrationBackfill(prisma, tenantId);
    return NextResponse.json({
      ...(await loadKaitenIntegrationTenantState(prisma, tenantId)),
      backfill,
      canEdit: true,
    });
  }

  if (typeof raw.enabled !== "boolean") {
    return NextResponse.json(
      { error: "Ожидается enabled: boolean или action: retry-backfill" },
      { status: 400 },
    );
  }

  if (raw.enabled === false) {
    if (current.backfill.status === "running") {
      const { persistent } = await readKaitenIntegrationBackfillState(
        prisma,
        tenantId,
      );
      await writeKaitenIntegrationBackfillState(
        prisma,
        tenantId,
        { status: "idle" },
        persistent,
      );
    }
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        kaitenIntegrationEnabled: false,
        kaitenIntegrationDisabledAt: new Date(),
        kaitenIntegrationDisabledByUserId: s.sub,
      },
    });
    const state = await loadKaitenIntegrationTenantState(prisma, tenantId);
    return NextResponse.json({ ...state, canEdit: true });
  }

  // Включение: запуск backfill (enabled=true только после успешного завершения).
  if (!isKaitenEnvConfigured()) {
    return NextResponse.json(
      {
        error:
          "Kaiten не настроен на сервере (KAITEN_API_TOKEN и доски в .env)",
      },
      { status: 503 },
    );
  }
  if (current.backfill.status === "running") {
    const state = await loadKaitenIntegrationTenantState(prisma, tenantId);
    return NextResponse.json({ ...state, canEdit: true });
  }
  const disabledFrom =
    current.disabledAt != null
      ? new Date(current.disabledAt)
      : new Date(0);
  const backfill = await startKaitenIntegrationBackfill(
    prisma,
    tenantId,
    disabledFrom,
  );
  const tick = await tickKaitenIntegrationBackfill(prisma, tenantId);
  const state = await loadKaitenIntegrationTenantState(prisma, tenantId);
  return NextResponse.json({
    ...state,
    backfill: tick.state,
    canEdit: true,
  });
}
