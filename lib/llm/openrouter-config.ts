import "server-only";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";

export type AiSettings = {
  enabled: boolean;
  apiKey: string | null;
  model: string;
  fallbackModels: string[];
  timeoutMs: number;
};

const DEFAULT_MODEL = "qwen/qwen3-next-80b-a3b-instruct:free";
const DEFAULT_FALLBACKS = [
  "deepseek/deepseek-chat:free",
  "meta-llama/llama-3.3-70b-instruct:free",
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
