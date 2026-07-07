import "server-only";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { DEFAULT_AI_MODEL, isAllowedModel } from "./ai-models";

export type AiSettings = {
  enabled: boolean;
  apiKey: string | null;
  model: string;
  fallbackModels: string[];
  timeoutMs: number;
};

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Настройки ИИ из конфигурации организации (Tenant).
 * API: SprutDock (OpenAI-совместимый).
 */
export async function getAiSettings(tenantId: string): Promise<AiSettings> {
  const db = await getOrdersPrisma();
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { aiEnabled: true, aiApiKey: true, aiModel: true },
  });

  const tenantModel = tenant?.aiModel?.trim();
  const model =
    tenantModel && isAllowedModel(tenantModel) ? tenantModel : DEFAULT_AI_MODEL;

  const fallbackModels = process.env.AI_MODEL_FALLBACKS
    ? process.env.AI_MODEL_FALLBACKS.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return {
    enabled: tenant?.aiEnabled ?? false,
    apiKey: tenant?.aiApiKey ?? null,
    model,
    fallbackModels,
    timeoutMs: process.env.AI_TIMEOUT_MS
      ? parseInt(process.env.AI_TIMEOUT_MS, 10)
      : DEFAULT_TIMEOUT_MS,
  };
}
