import "server-only";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import {
  DEFAULT_OPENROUTER_MODEL,
  isAllowedOpenRouterModel,
} from "./openrouter-models";

export type AiSettings = {
  enabled: boolean;
  apiKey: string | null;
  model: string;
  fallbackModels: string[];
  timeoutMs: number;
};

const DEFAULT_TIMEOUT_MS = 35000;

/**
 * Получает настройки ИИ из конфигурации организации (Tenant).
 */
export async function getAiSettings(tenantId: string): Promise<AiSettings> {
  const db = await getOrdersPrisma();
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { aiEnabled: true, openRouterApiKey: true, openRouterModel: true },
  });

  const tenantModel = tenant?.openRouterModel?.trim();
  const model =
    tenantModel && isAllowedOpenRouterModel(tenantModel)
      ? tenantModel
      : DEFAULT_OPENROUTER_MODEL;

  const fallbackModels = process.env.OPENROUTER_MODEL_FALLBACKS
    ? process.env.OPENROUTER_MODEL_FALLBACKS.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  return {
    enabled: tenant?.aiEnabled ?? false,
    apiKey: tenant?.openRouterApiKey ?? null,
    model,
    fallbackModels,
    timeoutMs: process.env.OPENROUTER_TIMEOUT_MS
      ? parseInt(process.env.OPENROUTER_TIMEOUT_MS, 10)
      : DEFAULT_TIMEOUT_MS,
  };
}
