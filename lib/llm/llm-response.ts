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

export function extractMessageContent(content: unknown): string | null {
  if (typeof content === "string") {
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
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

type ChatCompletionChoice = {
  message?: {
    content?: unknown;
    reasoning?: unknown;
    refusal?: unknown;
  };
  text?: unknown;
  finish_reason?: unknown;
};

/** Извлекает текст из тела OpenAI-совместимого chat/completions. */
export function extractChatCompletionText(data: unknown): {
  content: string | null;
  finishReason: string | null;
  responseModel: string | null;
  hasChoice: boolean;
} {
  if (!data || typeof data !== "object") {
    return { content: null, finishReason: null, responseModel: null, hasChoice: false };
  }

  const body = data as {
    model?: unknown;
    choices?: ChatCompletionChoice[];
  };
  const choice = Array.isArray(body.choices) ? body.choices[0] : undefined;
  if (!choice) {
    return {
      content: null,
      finishReason: null,
      responseModel: typeof body.model === "string" ? body.model : null,
      hasChoice: false,
    };
  }

  const message = choice.message;
  const fromMessage =
    extractMessageContent(message?.content) ||
    (typeof message?.reasoning === "string" && message.reasoning.trim()
      ? message.reasoning.trim()
      : null) ||
    (typeof message?.refusal === "string" && message.refusal.trim()
      ? message.refusal.trim()
      : null);
  const fromLegacyText =
    typeof choice.text === "string" && choice.text.trim() ? choice.text.trim() : null;

  return {
    content: fromMessage || fromLegacyText,
    finishReason:
      typeof choice.finish_reason === "string" ? choice.finish_reason : null,
    responseModel: typeof body.model === "string" ? body.model : null,
    hasChoice: true,
  };
}

function parseSprutDockErrorMessage(errText: string): string | null {
  try {
    const parsed = JSON.parse(errText) as {
      message_ru?: unknown;
      message?: unknown;
      error_code?: unknown;
    };
    if (typeof parsed.message_ru === "string" && parsed.message_ru.trim()) {
      return parsed.message_ru.trim();
    }
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message.trim();
    }
    if (typeof parsed.error_code === "string" && parsed.error_code.trim()) {
      return parsed.error_code.trim();
    }
  } catch {
    // ignore malformed error body
  }
  return null;
}

export function formatLlmApiError(status: number, errText: string): string {
  if (status === 429) {
    return "Лимит SprutDock (60 запросов/мин). Подождите минуту и повторите.";
  }

  const message = parseSprutDockErrorMessage(errText);
  if (message) {
    return message;
  }

  return `SprutDock API error (${status}): ${errText}`;
}

/** Node fetch без деталей — типично DNS/SSL/файрвол на сервере CRM. */
export function normalizeLlmNetworkError(err: unknown): string {
  const msg =
    err instanceof Error
      ? err.message.trim()
      : String(err ?? "").trim();
  const lower = msg.toLowerCase();
  if (!lower || lower === "fetch failed") {
    return "Сеть до sprutdock.ru недоступна с сервера CRM (fetch failed). Проверьте исходящий HTTPS/DNS на хосте или нажмите «Заполнить без ИИ-расчёта».";
  }
  if (lower.includes("getaddrinfo") || lower.includes("enotfound")) {
    return "Не удалось разрешить имя sprutdock.ru на сервере CRM. Проверьте DNS.";
  }
  return msg;
}

export function isTransientLlmNetworkError(err: unknown): boolean {
  const lower = normalizeLlmNetworkError(err).toLowerCase();
  return (
    lower.includes("fetch failed") ||
    lower.includes("недоступна") ||
    lower.includes("dns") ||
    lower.includes("econnreset") ||
    lower.includes("econnrefused") ||
    lower.includes("socket hang up")
  );
}
