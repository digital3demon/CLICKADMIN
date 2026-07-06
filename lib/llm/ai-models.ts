export type AiModelOption = {
  id: string;
  label: string;
};

/** Модели SprutDock для ИИ-Админа. */
export const AI_MODEL_OPTIONS: AiModelOption[] = [
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    label: "Nvidia Nemotron 3 Ultra (free)",
  },
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
  },
  {
    id: "google/gemini-3.1-pro-preview",
    label: "Gemini 3.1 Pro Preview",
  },
  {
    id: "anthropic/claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
  },
  {
    id: "openai/gpt-5.5",
    label: "GPT-5.5",
  },
];

export const AI_CUSTOM_MODEL_VALUE = "__custom__";

export const DEFAULT_AI_MODEL = AI_MODEL_OPTIONS[0].id;

/** Slug: provider/model или provider/model:variant */
export function isValidAiModelSlug(model: string): boolean {
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

export function isPresetModel(model: string): boolean {
  const trimmed = model.trim();
  return AI_MODEL_OPTIONS.some((m) => m.id === trimmed);
}

export function isAllowedModel(model: string): boolean {
  const trimmed = model.trim();
  return isPresetModel(trimmed) || isValidAiModelSlug(trimmed);
}

export function normalizeModel(model: string | null | undefined): string {
  const trimmed = model?.trim();
  if (trimmed && isAllowedModel(trimmed)) return trimmed;
  return DEFAULT_AI_MODEL;
}

export function initialAiModelState(model: string | null | undefined): {
  source: "preset" | "custom";
  presetModel: string;
  customModel: string;
} {
  const trimmed = model?.trim() ?? "";
  if (trimmed && isPresetModel(trimmed)) {
    return { source: "preset", presetModel: trimmed, customModel: "" };
  }
  if (trimmed && isValidAiModelSlug(trimmed)) {
    return { source: "custom", presetModel: DEFAULT_AI_MODEL, customModel: trimmed };
  }
  return { source: "preset", presetModel: DEFAULT_AI_MODEL, customModel: "" };
}

export function resolveModel(
  source: "preset" | "custom",
  presetModel: string,
  customModel: string,
): string {
  if (source === "custom") return customModel.trim();
  return presetModel.trim();
}
