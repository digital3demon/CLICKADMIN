import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import {
  isAllowedOpenRouterModel,
  normalizeOpenRouterModel,
} from "@/lib/llm/openrouter-models";
import { queueFailedAiPredictionsRetry } from "@/lib/llm/shadow-prediction";

export async function POST(req: Request) {
  try {
    const s = await getSessionFromCookies();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const tenantId = await orderTenantIdForSession(s);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });
    
    if (s.role !== "OWNER" && s.actualRole !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const db = await getOrdersPrisma();

    const tenantBefore = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { openRouterModel: true },
    });
    
    const updateData: Record<string, unknown> = {
      aiEnabled: Boolean(body.aiEnabled),
    };
    
    if (typeof body.apiKey === "string" && body.apiKey.trim().length > 0) {
      updateData.openRouterApiKey = body.apiKey.trim();
    }

    let modelChanged = false;
    if (typeof body.openRouterModel === "string") {
      const model = body.openRouterModel.trim();
      if (!isAllowedOpenRouterModel(model)) {
        return NextResponse.json(
          { error: "Неверный slug модели. Формат: provider/model или provider/model:free" },
          { status: 400 },
        );
      }
      updateData.openRouterModel = model;
      const previousModel = normalizeOpenRouterModel(tenantBefore?.openRouterModel);
      modelChanged = previousModel !== model;
    }

    await db.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    let retryCount = 0;
    if (modelChanged && Boolean(body.aiEnabled)) {
      retryCount = await queueFailedAiPredictionsRetry(tenantId);
    }

    return NextResponse.json({ ok: true, retryCount });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
