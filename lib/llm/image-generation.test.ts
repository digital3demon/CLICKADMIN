import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { extractImageGenerationData } from "./image-generation";

describe("extractImageGenerationData", () => {
  it("reads url from OpenAI/DALL-E style response", () => {
    expect(
      extractImageGenerationData({
        model: "openai/dall-e-3",
        data: [{ url: "https://example.com/cat.png" }],
      }),
    ).toEqual({
      images: [{ url: "https://example.com/cat.png", b64Json: undefined }],
      responseModel: "openai/dall-e-3",
    });
  });

  it("reads b64_json from Google gemini image models", () => {
    expect(
      extractImageGenerationData({
        data: [{ b64_json: "aGVsbG8=" }],
      }),
    ).toEqual({
      images: [{ url: undefined, b64Json: "aGVsbG8=" }],
      responseModel: null,
    });
  });

  it("returns empty for malformed body", () => {
    expect(extractImageGenerationData(null)).toEqual({
      images: [],
      responseModel: null,
    });
  });
});
