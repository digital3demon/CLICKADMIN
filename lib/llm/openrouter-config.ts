import "server-only";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";

export type AiSettings = {
  enabled: boolean;
  apiKey: string | null;
  model: string;
  fallbackModels: string[];
  timeoutMs: number;
};

const DEFAULT_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";
const DEFAULT_FALLBACKS = [
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "meta-llama/llama-3.2-3b-instruct:free",
];
const DEFAULT_TIMEOUT_MS = 35000;

/**
 * Получает настройки ИИ из конфигурации организации (Tenant).
 */
export async function getAiSettings(tenantId: string): Promise<AiSettings> {
  const db = await getOrdersPrisma();
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { aiEnabled: true, openRouterApiKey: true },
  });

  return {
    enabled: tenant?.aiEnabled ?? false,
    apiKey: tenant?.openRouterApiKey ?? null,
    model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
    fallbackModels: process.env.OPENROUTER_MODEL_FALLBACKS
      ? process.env.OPENROUTER_MODEL_FALLBACKS.split(",").map((s) => s.trim()).filter(Boolean)
      : DEFAULT_FALLBACKS,
    timeoutMs: process.env.OPENROUTER_TIMEOUT_MS
      ? parseInt(process.env.OPENROUTER_TIMEOUT_MS, 10)
      : DEFAULT_TIMEOUT_MS,
  };
}
