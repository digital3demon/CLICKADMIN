export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatCompletionOptions = {
  messages: ChatMessage[];
  responseFormat?: "json_object";
  temperature?: number;
  /** Ограничивает длину ответа; ускоряет большие модели. */
  maxTokens?: number;
  /** Переопределяет tenant timeout (например, короткий smoke-test). */
  timeoutMs?: number;
  /** По умолчанию 4; для ping-test лучше 0–1. */
  maxRateLimitRetries?: number;
  /** Для smoke-test: HTTP 200 + choice без текста всё равно считаем успехом. */
  acceptEmptyContent?: boolean;
};

export type ChatCompletionResult = {
  ok: true;
  content: string;
  model: string;
  durationMs: number;
} | {
  ok: false;
  error: string;
  durationMs: number;
};
