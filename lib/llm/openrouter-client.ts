import "server-only";
import { type AiSettings } from "./openrouter-config";
import { type ChatCompletionOptions, type ChatCompletionResult } from "./types";
import { logger } from "@/lib/server/logger";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

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
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), settings.timeoutMs);

      const body: any = {
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
          "Authorization": `Bearer ${settings.apiKey}`,
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
        lastError = `OpenRouter API error (${response.status}): ${errText}`;
        logger.warn({ model, status: response.status, errText }, "OpenRouter API error");
        
        // If 429 (Rate Limit) or 5xx, try next model
        if (response.status === 429 || response.status >= 500) {
          continue;
        }
        break; // Other errors (e.g. 401 Unauthorized) should not retry with fallback models
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (typeof content !== "string") {
        lastError = "Invalid response format from OpenRouter";
        continue;
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
      // Try next model on network error or timeout
      continue;
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
