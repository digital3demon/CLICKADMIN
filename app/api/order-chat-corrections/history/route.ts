import { NextResponse } from "next/server";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { correctionHistoryRowToJson } from "@/lib/corrections-history";
import { loadCorrectionsHistoryOnly } from "@/lib/corrections-history.server";
import { countOrdersWithPendingMergedCorrections } from "@/lib/order-chat-corrections-read";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";

export const dynamic = "force-dynamic";

/** Последние корректировки «!!!» для модалки в списке нарядов. */
export async function GET() {
  try {
    const { session, access } = await getSessionWithModuleAccess();
    if (!session?.sub) {
      return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
    }
    if (access?.ORDERS !== true) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    const tenantId = await orderTenantIdForSession(session);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Не задана организация для сессии" },
        { status: 400 },
      );
    }

    const prisma = await getOrdersPrisma();
    const [items, pendingCount] = await Promise.all([
      loadCorrectionsHistoryOnly({ limit: 80, tenantId }),
      countOrdersWithPendingMergedCorrections(prisma, tenantId),
    ]);

    return NextResponse.json(
      {
        count: items.length,
        pendingCount,
        items: items.map(correctionHistoryRowToJson),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("[order-chat-corrections/history]", e);
    return NextResponse.json(
      { error: "Не удалось загрузить историю корректировок" },
      { status: 500 },
    );
  }
}
