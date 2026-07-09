import { describe, expect, it } from "vitest";
import {
  extractChatCompletionText,
  extractMessageContent,
  formatLlmApiError,
  normalizeLlmNetworkError,
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

  it("returns null for empty string content", () => {
    expect(extractMessageContent("   ")).toBeNull();
  });
});

describe("extractChatCompletionText", () => {
  it("reads message.content from standard OpenAI shape", () => {
    expect(
      extractChatCompletionText({
        model: "nvidia/nemotron-nano-9b-v2:free",
        choices: [{ message: { content: "OK" }, finish_reason: "stop" }],
      }),
    ).toEqual({
      content: "OK",
      finishReason: "stop",
      responseModel: "nvidia/nemotron-nano-9b-v2:free",
      hasChoice: true,
    });
  });

  it("falls back to reasoning field for reasoning models", () => {
    expect(
      extractChatCompletionText({
        choices: [{ message: { content: "", reasoning: "OK" } }],
      }).content,
    ).toBe("OK");
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
    expect(formatLlmApiError(402, errText)).toBe(
      "Недостаточно средств для выполнения запроса.",
    );
  });

  it("uses message_ru for content policy violation", () => {
    const errText = JSON.stringify({
      error_code: "CONTENT_POLICY_VIOLATION",
      message_ru: "Запрос нарушает политику допустимого контента.",
    });
    expect(formatLlmApiError(400, errText)).toBe(
      "Запрос нарушает политику допустимого контента.",
    );
  });
});

describe("normalizeLlmNetworkError", () => {
  it("расшифровывает fetch failed для UI", () => {
    expect(normalizeLlmNetworkError(new Error("fetch failed"))).toContain(
      "sprutdock.ru",
    );
  });
});
