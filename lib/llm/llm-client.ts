import "server-only";
import { type AiSettings } from "./llm-config";
import {
  extractChatCompletionText,
  formatLlmApiError,
  isTransientLlmNetworkError,
  normalizeLlmNetworkError,
  parseRateLimitWaitMs,
} from "./llm-response";
import { type ChatCompletionOptions, type ChatCompletionResult } from "./types";
import { SPRUTDOCK_CHAT_COMPLETIONS_URL, sprutdockAuthHeaders } from "./sprutdock";
import { logger } from "@/lib/server/logger";
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
  const timeoutMs = opts.timeoutMs ?? settings.timeoutMs;
  const maxRateLimitRetries = opts.maxRateLimitRetries ?? MAX_RATE_LIMIT_RETRIES;

  for (const model of modelsToTry) {
    for (let rateLimitAttempt = 0; rateLimitAttempt <= maxRateLimitRetries; rateLimitAttempt++) {
      let retriedNetwork = false;
      attempt: while (true) {
        try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
        if (opts.maxTokens !== undefined) {
          body.max_tokens = opts.maxTokens;
        }

        const response = await fetch(SPRUTDOCK_CHAT_COMPLETIONS_URL, {
          method: "POST",
          headers: sprutdockAuthHeaders(settings.apiKey),
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          lastError = formatLlmApiError(response.status, errText);
          logger.warn({ model, status: response.status, errText }, "SprutDock API error");

          if (response.status === 429 && rateLimitAttempt < maxRateLimitRetries) {
            const waitMs = parseRateLimitWaitMs(response, errText);
            logger.warn({ model, waitMs, attempt: rateLimitAttempt + 1 }, "SprutDock rate limit, retrying");
            await sleep(waitMs);
            break attempt;
          }

          if (response.status === 429 || response.status >= 500) {
            break;
          }
          break;
        }

        const data = await response.json();
        const parsed = extractChatCompletionText(data);
        const content = parsed.content;

        if (!content) {
          if (opts.acceptEmptyContent && parsed.hasChoice) {
            return {
              ok: true,
              content: "",
              model: parsed.responseModel ?? model,
              durationMs: Date.now() - startTime,
            };
          }
          lastError = parsed.finishReason
            ? `SprutDock вернул пустой ответ (finish_reason: ${parsed.finishReason})`
            : "SprutDock вернул ответ без текста";
          break;
        }

        return {
          ok: true,
          content,
          model: parsed.responseModel ?? model,
          durationMs: Date.now() - startTime,
        };
      } catch (e: any) {
        if (e.name === "AbortError") {
          const timeoutSec = Math.round(timeoutMs / 1000);
          lastError = `Таймаут SprutDock (${timeoutSec} с). Модель ${model} не успела ответить — попробуйте снова или выберите более быструю модель.`;
          logger.warn({ model, timeoutMs }, "SprutDock request timed out");
          return {
            ok: false,
            error: lastError,
            durationMs: Date.now() - startTime,
          };
        }
        lastError = normalizeLlmNetworkError(e);
        logger.warn({ model, err: e, timeoutMs, retriedNetwork }, "SprutDock fetch failed");
        if (!retriedNetwork && isTransientLlmNetworkError(e)) {
          retriedNetwork = true;
          await sleep(1200);
          continue attempt;
        }
        break;
      }
      break;
      }
    }
  }

  const userError =
    lastError.includes("sprutdock.ru") ||
    lastError.startsWith("Таймаут SprutDock") ||
    lastError.startsWith("Лимит SprutDock")
      ? lastError
      : `Не удалось получить ответ ИИ. ${lastError}`;

  return {
    ok: false,
    error: userError,
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
