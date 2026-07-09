import { describe, expect, it } from "vitest";
import {
  DEFAULT_AI_MODEL,
  initialAiModelState,
  isAllowedModel,
  isImageModelSlug,
  isTextChatModelSlug,
  isValidAiModelSlug,
  modelDisplayLabel,
  modelSourceKind,
  resolveModel,
} from "./ai-models";

describe("isValidAiModelSlug", () => {
  it("accepts preset and custom free slugs", () => {
    expect(isValidAiModelSlug("nvidia/nemotron-3-ultra-550b-a55b:free")).toBe(true);
    expect(isValidAiModelSlug("anthropic/claude-sonnet-4-6")).toBe(true);
  });

  it("rejects invalid slugs", () => {
    expect(isValidAiModelSlug("")).toBe(false);
    expect(isValidAiModelSlug("no-slash")).toBe(false);
    expect(isValidAiModelSlug("a/ b")).toBe(false);
  });
});

describe("initialAiModelState", () => {
  it("defaults to free Nvidia Ultra", () => {
    expect(initialAiModelState(null)).toEqual({
      source: "preset",
      presetModel: DEFAULT_AI_MODEL,
      customModel: "",
    });
  });

  it("restores custom slug from tenant settings", () => {
    expect(initialAiModelState("some-vendor/custom-model:beta")).toEqual({
      source: "custom",
      presetModel: DEFAULT_AI_MODEL,
      customModel: "some-vendor/custom-model:beta",
    });
  });
});

describe("resolveModel", () => {
  it("returns custom slug when source is custom", () => {
    expect(
      resolveModel(
        "custom",
        DEFAULT_AI_MODEL,
        "anthropic/claude-sonnet-4-6",
      ),
    ).toBe("anthropic/claude-sonnet-4-6");
  });

  it("allows saving resolved custom slug", () => {
    const slug = resolveModel(
      "custom",
      DEFAULT_AI_MODEL,
      "anthropic/claude-sonnet-4-6",
    );
    expect(isAllowedModel(slug)).toBe(true);
  });
});

describe("DEFAULT_AI_MODEL", () => {
  it("is free Nvidia Ultra on SprutDock", () => {
    expect(DEFAULT_AI_MODEL).toBe("nvidia/nemotron-3-ultra-550b-a55b:free");
  });
});

describe("modelDisplayLabel", () => {
  it("uses preset label for known models", () => {
    expect(modelDisplayLabel("google/gemini-2.5-flash")).toEqual({
      full: "google/gemini-2.5-flash",
      short: "Gemini 2.5 Flash",
      kind: "preset",
    });
  });

  it("uses slug tail for custom models", () => {
    expect(modelDisplayLabel("meta-llama/llama-3.3-70b-instruct:free")).toEqual({
      full: "meta-llama/llama-3.3-70b-instruct:free",
      short: "llama-3.3-70b-instruct:free",
      kind: "custom",
    });
  });

  it("falls back to default when model is empty", () => {
    expect(modelDisplayLabel(null).full).toBe(DEFAULT_AI_MODEL);
  });
});

describe("modelSourceKind", () => {
  it("marks presets and custom slugs", () => {
    expect(modelSourceKind("google/gemini-2.5-flash")).toBe("preset");
    expect(modelSourceKind("meta-llama/llama-3.3-70b-instruct:free")).toBe("custom");
  });
});

describe("isImageModelSlug", () => {
  it("detects SprutDock image model slugs", () => {
    expect(isImageModelSlug("openai/dall-e-3")).toBe(true);
    expect(isImageModelSlug("openai/gpt-image-1")).toBe(true);
    expect(isImageModelSlug("google/gemini-3.1-flash-image-preview")).toBe(true);
    expect(isImageModelSlug("google/gemini-2.5-flash")).toBe(false);
    expect(isImageModelSlug(DEFAULT_AI_MODEL)).toBe(false);
  });

  it("isTextChatModelSlug excludes image models", () => {
    expect(isTextChatModelSlug("openai/dall-e-3")).toBe(false);
    expect(isTextChatModelSlug(DEFAULT_AI_MODEL)).toBe(true);
  });
});
