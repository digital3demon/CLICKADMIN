import { describe, expect, it } from "vitest";
import {
  initialOpenRouterModelState,
  isAllowedOpenRouterModel,
  isValidOpenRouterModelSlug,
  resolveOpenRouterModel,
} from "./openrouter-models";

describe("isValidOpenRouterModelSlug", () => {
  it("accepts preset and custom free slugs", () => {
    expect(isValidOpenRouterModelSlug("qwen/qwen3-next-80b-a3b-instruct:free")).toBe(true);
    expect(isValidOpenRouterModelSlug("nvidia/nemotron-3-ultra-550b-a55b:free")).toBe(true);
  });

  it("rejects invalid slugs", () => {
    expect(isValidOpenRouterModelSlug("")).toBe(false);
    expect(isValidOpenRouterModelSlug("no-slash")).toBe(false);
    expect(isValidOpenRouterModelSlug("a/ b")).toBe(false);
  });
});

describe("initialOpenRouterModelState", () => {
  it("restores custom slug from tenant settings", () => {
    expect(
      initialOpenRouterModelState("nvidia/nemotron-3-ultra-550b-a55b:free"),
    ).toEqual({
      source: "custom",
      presetModel: "qwen/qwen3-next-80b-a3b-instruct:free",
      customModel: "nvidia/nemotron-3-ultra-550b-a55b:free",
    });
  });
});

describe("resolveOpenRouterModel", () => {
  it("returns custom slug when source is custom", () => {
    expect(
      resolveOpenRouterModel(
        "custom",
        "qwen/qwen3-next-80b-a3b-instruct:free",
        "nvidia/nemotron-3-ultra-550b-a55b:free",
      ),
    ).toBe("nvidia/nemotron-3-ultra-550b-a55b:free");
  });

  it("allows saving resolved custom slug", () => {
    const slug = resolveOpenRouterModel(
      "custom",
      "qwen/qwen3-next-80b-a3b-instruct:free",
      "nvidia/nemotron-3-ultra-550b-a55b:free",
    );
    expect(isAllowedOpenRouterModel(slug)).toBe(true);
  });
});
