import "server-only";
import { type AiSettings } from "./openrouter-config";
import {
  extractOpenRouterMessageContent,
  formatOpenRouterError,
  parseRateLimitWaitMs,
} from "./openrouter-response";
import { type ChatCompletionOptions, type ChatCompletionResult } from "./types";
import { logger } from "@/lib/server/logger";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_RATE_LIMIT_RETRIES = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function chatCompletion(
  settings: AiSettings,
  opts: ChatCompletionOptions,
): Promise<ChatCompletionResult> {
  if (!settings.enabled || !settings.apiKey) {
    return { ok: false, error: "AI is disabled or API key is missing", durationMs: 0 };
  }

  const modelsToTry = [settings.model, ...settings.fallbackModels];
  let lastError = "Unknown error";
  const startTime = Date.now();

  for (const model of modelsToTry) {
    for (let rateLimitAttempt = 0; rateLimitAttempt <= MAX_RATE_LIMIT_RETRIES; rateLimitAttempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), settings.timeoutMs);

        const body: Record<string, unknown> = {
          model,
          messages: opts.messages,
        };

        if (opts.responseFormat === "json_object") {
          body.response_format = { type: "json_object" };
        }
        if (opts.temperature !== undefined) {
          body.temperature = opts.temperature;
        }

        const response = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${settings.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER || "https://crm.click-lab.online",
            "X-Title": process.env.OPENROUTER_APP_TITLE || "ClickAdmin CRM",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          lastError = formatOpenRouterError(response.status, errText);
          logger.warn({ model, status: response.status, errText }, "OpenRouter API error");

          if (response.status === 429 && rateLimitAttempt < MAX_RATE_LIMIT_RETRIES) {
            const waitMs = parseRateLimitWaitMs(response, errText);
            logger.warn({ model, waitMs, attempt: rateLimitAttempt + 1 }, "OpenRouter rate limit, retrying");
            await sleep(waitMs);
            continue;
          }

          if (response.status === 429 || response.status >= 500) {
            break;
          }
          break;
        }

        const data = await response.json();
        const content = extractOpenRouterMessageContent(data.choices?.[0]?.message?.content);

        if (!content) {
          lastError = "Invalid response format from OpenRouter";
          break;
        }

        return {
          ok: true,
          content,
          model,
          durationMs: Date.now() - startTime,
        };
      } catch (e: any) {
        lastError = e.name === "AbortError" ? "Timeout" : e.message;
        logger.warn({ model, err: e }, "OpenRouter fetch failed");
        break;
      }
    }
  }

  return {
    ok: false,
    error: `All models failed. Last error: ${lastError}`,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Очищает ответ от Markdown-разметки (```json ... ```), чтобы получить чистый JSON.
 */
export function stripMarkdownFences(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "");
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.replace(/\s*```$/, "");
  }
  return cleaned.trim();
}
