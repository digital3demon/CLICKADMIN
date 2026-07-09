import "server-only";

/** OpenAI-совместимый шлюз SprutDock — https://sprutdock.ru/docs */
export const SPRUTDOCK_BASE_URL = "https://sprutdock.ru/v1";

export const SPRUTDOCK_CHAT_COMPLETIONS_URL = "https://sprutdock.ru/v1/chat/completions";
export const SPRUTDOCK_IMAGES_GENERATIONS_URL = "https://sprutdock.ru/v1/images/generations";
export const SPRUTDOCK_MODELS_URL = "https://sprutdock.ru/v1/models";

export function sprutdockAuthHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}
