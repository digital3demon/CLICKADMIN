import { describe, expect, it } from "vitest";
import {
  DEFAULT_AI_MODEL,
  initialAiModelState,
  isAllowedModel,
  isValidAiModelSlug,
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
