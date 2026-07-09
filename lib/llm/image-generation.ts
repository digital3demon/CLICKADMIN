import "server-only";
import { type AiSettings } from "./llm-config";
import {
  formatLlmApiError,
  isTransientLlmNetworkError,
  normalizeLlmNetworkError,
  parseRateLimitWaitMs,
} from "./llm-response";
import { SPRUTDOCK_IMAGES_GENERATIONS_URL, sprutdockAuthHeaders } from "./sprutdock";
import { logger } from "@/lib/server/logger";

export type ImageGenerationOptions = {
  model: string;
  prompt: string;
  n?: number;
  size?: string;
  quality?: "standard" | "hd" | null;
  style?: "vivid" | "natural" | null;
  /** url — OpenAI/DALL-E; b64_json — Google gemini-*-image-* (по доке SprutDock). */
  responseFormat?: "url" | "b64_json" | null;
  timeoutMs?: number;
  maxRateLimitRetries?: number;
};

export type GeneratedImage = {
  url?: string;
  b64Json?: string;
};

export type ImageGenerationResult =
  | {
      ok: true;
      images: GeneratedImage[];
      model: string;
      durationMs: number;
    }
  | {
      ok: false;
      error: string;
      durationMs: number;
    };

const MAX_RATE_LIMIT_RETRIES = 4;
const DEFAULT_IMAGE_TIMEOUT_MS = 120_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Парсит тело OpenAI Images API (url или b64_json). */
export function extractImageGenerationData(data: unknown): {
  images: GeneratedImage[];
  responseModel: string | null;
} {
  if (!data || typeof data !== "object") {
    return { images: [], responseModel: null };
  }

  const body = data as { model?: unknown; data?: unknown };
  const rows = Array.isArray(body.data) ? body.data : [];
  const images: GeneratedImage[] = [];

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const item = row as { url?: unknown; b64_json?: unknown };
    const url = typeof item.url === "string" && item.url.trim() ? item.url.trim() : undefined;
    const b64Json =
      typeof item.b64_json === "string" && item.b64_json.trim()
        ? item.b64_json.trim()
        : undefined;
    if (url || b64Json) images.push({ url, b64Json });
  }

  return {
    images,
    responseModel: typeof body.model === "string" ? body.model : null,
  };
}

/**
 * POST /v1/images/generations — биллинг за изображение, промпт с премодерацией.
 * @see https://sprutdock.ru/docs#tag/генерация-изображений
 */
export async function imageGeneration(
  settings: AiSettings,
  opts: ImageGenerationOptions,
): Promise<ImageGenerationResult> {
  if (!settings.enabled || !settings.apiKey) {
    return { ok: false, error: "AI is disabled or API key is missing", durationMs: 0 };
  }

  const model = opts.model.trim();
  const prompt = opts.prompt.trim();
  if (!model) return { ok: false, error: "Укажите model (slug из витрины modality=image)", durationMs: 0 };
  if (!prompt) return { ok: false, error: "Укажите prompt", durationMs: 0 };

  const startTime = Date.now();
  const timeoutMs = opts.timeoutMs ?? settings.timeoutMs ?? DEFAULT_IMAGE_TIMEOUT_MS;
  const maxRateLimitRetries = opts.maxRateLimitRetries ?? MAX_RATE_LIMIT_RETRIES;
  let lastError = "Unknown error";

  for (let rateLimitAttempt = 0; rateLimitAttempt <= maxRateLimitRetries; rateLimitAttempt++) {
    let retriedNetwork = false;
    attempt: while (true) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const body: Record<string, unknown> = {
          model,
          prompt,
          n: opts.n ?? 1,
        };
        if (opts.size) body.size = opts.size;
        if (opts.quality) body.quality = opts.quality;
        if (opts.style) body.style = opts.style;
        if (opts.responseFormat) body.response_format = opts.responseFormat;

        const response = await fetch(SPRUTDOCK_IMAGES_GENERATIONS_URL, {
          method: "POST",
          headers: sprutdockAuthHeaders(settings.apiKey),
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          lastError = formatLlmApiError(response.status, errText);
          logger.warn(
            { model, status: response.status, errText },
            "SprutDock images/generations error",
          );

          if (response.status === 429 && rateLimitAttempt < maxRateLimitRetries) {
            const waitMs = parseRateLimitWaitMs(response, errText);
            await sleep(waitMs);
            break attempt;
          }

          if (response.status === 502 && rateLimitAttempt < maxRateLimitRetries) {
            await sleep(2000);
            break attempt;
          }

          break;
        }

        const data = await response.json();
        const parsed = extractImageGenerationData(data);
        if (parsed.images.length === 0) {
          lastError = "SprutDock вернул ответ без url/b64_json";
          break;
        }

        return {
          ok: true,
          images: parsed.images,
          model: parsed.responseModel ?? model,
          durationMs: Date.now() - startTime,
        };
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") {
          const timeoutSec = Math.round(timeoutMs / 1000);
          return {
            ok: false,
            error: `Таймаут SprutDock (${timeoutSec} с) при генерации изображения.`,
            durationMs: Date.now() - startTime,
          };
        }
        lastError = normalizeLlmNetworkError(e);
        logger.warn({ model, err: e, retriedNetwork }, "SprutDock images fetch failed");
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

  return {
    ok: false,
    error: lastError,
    durationMs: Date.now() - startTime,
  };
}
