import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { analyzePredictionError } from "@/lib/llm/analyze-prediction-error";

// Запускает анализ ошибок ИИ по старым нарядам, где уже есть AiOrderPrediction,
// но еще не было сделано выводов.
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

    // Берем последние 10 предсказаний, которые мы еще не анализировали
    // (По-хорошему тут нужен флаг в БД, но для разового прогона можно просто взять свежие)
    const predictions = await db.aiOrderPrediction.findMany({
      where: { 
        tenantId,
        error: null, // Только успешные предсказания
      },
      orderBy: { createdAt: "desc" },
      take: 20, // Батч по 20 штук за раз
      select: { id: true },
    });

    if (predictions.length === 0) {
      return NextResponse.json({ message: "No predictions found", count: 0 });
    }

    // Запускаем анализ в фоне с задержками, чтобы не словить Rate Limit от Gemini
    void (async () => {
      console.log(`[Batch Analyze] Starting for ${predictions.length} predictions`);
      for (let i = 0; i < predictions.length; i++) {
        const pred = predictions[i]!;
        try {
          await analyzePredictionError(db, tenantId, pred.id);
          // Пауза 2 секунды между запросами к Gemini
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (e) {
          console.error(`[Batch Analyze] Error on prediction ${pred.id}:`, e);
        }
      }
      console.log(`[Batch Analyze] Finished`);
    })();

    return NextResponse.json({ message: "Batch analysis started in background", count: predictions.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
