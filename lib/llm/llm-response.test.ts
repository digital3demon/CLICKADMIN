import { describe, expect, it } from "vitest";
import {
  extractMessageContent,
  formatLlmApiError,
  parseRateLimitWaitMs,
} from "./llm-response";

describe("parseRateLimitWaitMs", () => {
  it("uses retry_after_seconds from error body", () => {
    const response = new Response("", { status: 429 });
    const errText = JSON.stringify({
      error: { metadata: { retry_after_seconds: 5 } },
    });
    expect(parseRateLimitWaitMs(response, errText)).toBe(5500);
  });
});

describe("extractMessageContent", () => {
  it("joins array content parts from some providers", () => {
    expect(
      extractMessageContent([{ type: "text", text: '{"patientName":"Иванов"}' }]),
    ).toBe('{"patientName":"Иванов"}');
  });
});

describe("formatLlmApiError", () => {
  it("returns readable Russian message for SprutDock 429", () => {
    expect(formatLlmApiError(429, "{}")).toContain("60 запросов/мин");
  });

  it("uses message_ru from SprutDock error body", () => {
    const errText = JSON.stringify({
      error_code: "INSUFFICIENT_FUNDS",
      message_ru: "Недостаточно средств для выполнения запроса.",
    });
    expect(formatLlmApiError(402, errText)).toContain("Недостаточно средств");
  });
});
