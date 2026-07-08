import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { orderTenantIdForSession } from "@/lib/order-tenant-access";
import { getAiSettings } from "@/lib/llm/llm-config";
import { chatCompletion } from "@/lib/llm/llm-client";
import { normalizeModel } from "@/lib/llm/ai-models";

export const maxDuration = 45;

const TEST_MODEL_TIMEOUT_MS = 25_000;

/** POST — короткий запрос к SprutDock с моделью из настроек tenant (smoke-test). */
export async function POST() {
  try {
    const s = await getSessionFromCookies();
    if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = await orderTenantIdForSession(s);
    if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

    if (s.role !== "OWNER" && s.actualRole !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await getAiSettings(tenantId);
    const requestedModel = normalizeModel(settings.model);

    if (!settings.enabled) {
      return NextResponse.json(
        { error: "ИИ выключен. Включите в настройках.", requestedModel },
        { status: 400 },
      );
    }
    if (!settings.apiKey) {
      return NextResponse.json(
        { error: "API-ключ SprutDock не задан.", requestedModel },
        { status: 400 },
      );
    }

    const result = await chatCompletion(settings, {
      messages: [{ role: "user", content: "Ответь одним словом: OK" }],
      maxTokens: 64,
      temperature: 0,
      timeoutMs: TEST_MODEL_TIMEOUT_MS,
      maxRateLimitRetries: 1,
      acceptEmptyContent: true,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          requestedModel,
          durationMs: result.durationMs,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      ok: true,
      requestedModel,
      usedModel: result.model,
      durationMs: result.durationMs,
      snippet: result.content.trim().slice(0, 80) || "(пустой текст, шлюз доступен)",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
