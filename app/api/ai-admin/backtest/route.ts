import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies, requireSessionTenantId } from "@/lib/auth/session-server";
import { runShadowPredictionInBackground } from "@/lib/llm/shadow-prediction";

export async function POST(req: Request) {
  try {
    const s = await getSessionFromCookies();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const tenantId = await requireSessionTenantId(s);
    if (s.role !== "OWNER") {
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

    // Запускаем предсказания в фоне
    for (const link of links) {
      runShadowPredictionInBackground(tenantId, link.orderId, link.emailId);
      // Небольшая пауза между запусками
      await new Promise(r => setTimeout(r, 500));
    }

    return NextResponse.json({ message: "Backtest started", count: links.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
