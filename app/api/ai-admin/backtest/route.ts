import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { runShadowPredictionInBackground } from "@/lib/llm/shadow-prediction";

export async function POST(req: Request) {
  try {
    const s = await getSessionFromCookies();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const tenantId = await orderTenantIdForSession(s);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });
    
    if (s.role !== "OWNER" && s.actualRole !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getOrdersPrisma();
    
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { aiEnabled: true, openRouterApiKey: true },
    });
    
    if (!tenant?.aiEnabled || !tenant?.openRouterApiKey) {
      return NextResponse.json({ error: "AI is not configured or disabled" }, { status: 400 });
    }

    // Ищем EmailSourceOrder, для которых еще нет AiOrderPrediction
    const links = await db.emailSourceOrder.findMany({
      where: {
        tenantId,
        order: {
          aiPredictions: {
            none: {}
          }
        }
      },
      take: 10, // Ограничиваем батч, чтобы не упереться в rate limits OpenRouter
      select: { orderId: true, emailId: true },
    });

    if (links.length === 0) {
      return NextResponse.json({ message: "No pending backtests found", count: 0 });
    }

    // Ставим в очередь: обрабатывается строго по одному наряду
    for (const link of links) {
      runShadowPredictionInBackground(tenantId, link.orderId, link.emailId);
    }

    return NextResponse.json({ message: "Backtest started", count: links.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
