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

export const OPENROUTER_CUSTOM_MODEL_VALUE = "__custom__";

export const DEFAULT_OPENROUTER_MODEL = OPENROUTER_MODEL_OPTIONS[0].id;

/** Slug OpenRouter: provider/model или provider/model:variant */
export function isValidOpenRouterModelSlug(model: string): boolean {
  const trimmed = model.trim();
  if (trimmed.length < 3 || trimmed.length > 200) return false;
  if (/\s/.test(trimmed)) return false;

  const slashIdx = trimmed.indexOf("/");
  if (slashIdx <= 0 || slashIdx === trimmed.length - 1) return false;
  if (trimmed.indexOf("/", slashIdx + 1) !== -1) return false;

  const provider = trimmed.slice(0, slashIdx);
  const rest = trimmed.slice(slashIdx + 1);
  if (!/^[\w.-]+$/i.test(provider)) return false;
  if (!/^[\w.-]+(?::[\w.-]+)?$/i.test(rest)) return false;
  return true;
}

export function isPresetOpenRouterModel(model: string): boolean {
  const trimmed = model.trim();
  return OPENROUTER_MODEL_OPTIONS.some((m) => m.id === trimmed);
}

export function isAllowedOpenRouterModel(model: string): boolean {
  const trimmed = model.trim();
  return isPresetOpenRouterModel(trimmed) || isValidOpenRouterModelSlug(trimmed);
}

export function normalizeOpenRouterModel(model: string | null | undefined): string {
  const trimmed = model?.trim();
  if (trimmed && isAllowedOpenRouterModel(trimmed)) return trimmed;
  return DEFAULT_OPENROUTER_MODEL;
}

export function initialOpenRouterModelState(model: string | null | undefined): {
  source: "preset" | "custom";
  presetModel: string;
  customModel: string;
} {
  const trimmed = model?.trim() ?? "";
  if (trimmed && isPresetOpenRouterModel(trimmed)) {
    return { source: "preset", presetModel: trimmed, customModel: "" };
  }
  if (trimmed && isValidOpenRouterModelSlug(trimmed)) {
    return { source: "custom", presetModel: DEFAULT_OPENROUTER_MODEL, customModel: trimmed };
  }
  return { source: "preset", presetModel: DEFAULT_OPENROUTER_MODEL, customModel: "" };
}

export function resolveOpenRouterModel(source: "preset" | "custom", presetModel: string, customModel: string): string {
  if (source === "custom") return customModel.trim();
  return presetModel.trim();
}
