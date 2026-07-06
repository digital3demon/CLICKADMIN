import { describe, expect, it } from "vitest";
import {
  extractOpenRouterMessageContent,
  formatOpenRouterError,
  parseRateLimitWaitMs,
} from "./openrouter-response";

describe("parseRateLimitWaitMs", () => {
  it("uses retry_after_seconds from OpenRouter error body", () => {
    const response = new Response("", { status: 429 });
    const errText = JSON.stringify({
      error: { metadata: { retry_after_seconds: 5 } },
    });
    expect(parseRateLimitWaitMs(response, errText)).toBe(5500);
  });
});

describe("extractOpenRouterMessageContent", () => {
  it("joins array content parts from some providers", () => {
    expect(
      extractOpenRouterMessageContent([{ type: "text", text: '{"patientName":"Иванов"}' }]),
    ).toBe('{"patientName":"Иванов"}');
  });
});

describe("formatOpenRouterError", () => {
  it("returns readable Russian message for 429", () => {
    expect(formatOpenRouterError(429, "{}")).toContain("Лимит бесплатных моделей");
  });
});
