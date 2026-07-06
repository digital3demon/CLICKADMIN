export function parseRateLimitWaitMs(response: Response, errText: string): number {
  const resetHeader = response.headers.get("X-RateLimit-Reset");
  if (resetHeader) {
    const resetMs = Number(resetHeader);
    if (Number.isFinite(resetMs) && resetMs > 0) {
      const wait = resetMs - Date.now();
      if (wait > 0 && wait <= 120_000) return wait + 500;
    }
  }

  try {
    const parsed = JSON.parse(errText) as {
      error?: { metadata?: { retry_after_seconds?: number } };
    };
    const retryAfter = parsed.error?.metadata?.retry_after_seconds;
    if (typeof retryAfter === "number" && retryAfter > 0) {
      return retryAfter * 1000 + 500;
    }
  } catch {
    // ignore malformed error body
  }

  return 8000;
}

export function extractOpenRouterMessageContent(content: unknown): string | null {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;

  const parts = content
    .map((part) => {
      if (!part || typeof part !== "object") return null;
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? text : null;
    })
    .filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join("\n") : null;
}

export function formatOpenRouterError(status: number, errText: string): string {
  if (status === 429) {
    return "Лимит бесплатных моделей OpenRouter (≈16 запросов/мин). Подождите минуту или добавьте свой API-ключ с балансом.";
  }
  return `OpenRouter API error (${status}): ${errText}`;
}
