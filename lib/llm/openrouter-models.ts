export type OpenRouterModelOption = {
  id: string;
  label: string;
};

/** Бесплатные модели OpenRouter, проверенные для ИИ-Админа. */
export const OPENROUTER_MODEL_OPTIONS: OpenRouterModelOption[] = [
  {
    id: "qwen/qwen3-next-80b-a3b-instruct:free",
    label: "Qwen3 Next 80B (free)",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    label: "Llama 3.3 70B (free)",
  },
  {
    id: "google/gemini-2.5-flash:free",
    label: "Gemini 2.5 Flash (free)",
  },
];

export const DEFAULT_OPENROUTER_MODEL = OPENROUTER_MODEL_OPTIONS[0].id;

export function isAllowedOpenRouterModel(model: string): boolean {
  const trimmed = model.trim();
  return OPENROUTER_MODEL_OPTIONS.some((m) => m.id === trimmed);
}

export function normalizeOpenRouterModel(model: string | null | undefined): string {
  const trimmed = model?.trim();
  if (trimmed && isAllowedOpenRouterModel(trimmed)) return trimmed;
  return DEFAULT_OPENROUTER_MODEL;
}
