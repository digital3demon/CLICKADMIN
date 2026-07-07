import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  extractOrderFieldsFromSingleEmail,
  mergeAiPredictionJson,
  OrderEmailExtractSchema,
} from "./order-email-extract";
import * as llmConfig from "./llm-config";
import * as llmClient from "./llm-client";

vi.mock("./llm-config", () => ({
  getAiSettings: vi.fn(),
}));

vi.mock("./llm-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./llm-client")>();
  return {
    ...actual,
    chatCompletion: vi.fn(),
  };
});

vi.mock("@/lib/get-domain-prisma", () => ({
  getClientsPrisma: vi.fn().mockResolvedValue({
    clinic: {
      findMany: vi.fn().mockResolvedValue([
        { id: "clinic-1", name: "Дента" },
      ]),
    },
    doctor: {
      findMany: vi.fn().mockResolvedValue([
        { id: "doctor-1", fullName: "Петров Петр Петрович" },
      ]),
    },
  }),
}));

describe("extractOrderFieldsFromEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null if AI is disabled", async () => {
    vi.mocked(llmConfig.getAiSettings).mockResolvedValueOnce({
      enabled: false,
      apiKey: null,
      model: "test",
      fallbackModels: [],
      timeoutMs: 1000,
    });

    const res = await extractOrderFieldsFromSingleEmail("t1", "Subj", "Body");
    expect(res.result).toBeNull();
    expect(res.error).toBe("AI is disabled");
  });

  it("parses valid JSON response with attachments and composition", async () => {
    vi.mocked(llmConfig.getAiSettings).mockResolvedValueOnce({
      enabled: true,
      apiKey: "sk-test",
      model: "test",
      fallbackModels: [],
      timeoutMs: 1000,
    });

    vi.mocked(llmClient.chatCompletion).mockResolvedValueOnce({
      ok: true,
      content: JSON.stringify({
        patientName: "Иванов Иван",
        clinicId: "clinic-1",
        doctorId: "doctor-1",
        clientOrderText: "Коронка Emax на 46",
        patientAppointmentAt: "2026-06-12T09:00:00.000Z",
        urgent: true,
        hasScans: true,
        hasCt: false,
        hasMri: false,
        hasPhoto: false,
        suggestedAttachmentIds: ["att-1"],
        compositionHints: [{ nameHint: "Коронка Emax", teethFdi: ["46"] }],
        confidenceScore: 88,
        warnings: [],
      }),
      model: "test",
      durationMs: 100,
    });

    const res = await extractOrderFieldsFromSingleEmail(
      "t1",
      "Заказ",
      "Срочно сделать коронку",
      {
        fromAddress: "doc@clinic.ru",
        emailAttachments: [{ id: "att-1", fileName: "scan.stl", mimeType: "model/stl" }],
      },
    );
    expect(res.result).toMatchObject({
      patientName: "Иванов Иван",
      clinicId: "clinic-1",
      doctorId: "doctor-1",
      clientOrderText: "Коронка Emax на 46",
      urgent: true,
      hasScans: true,
      suggestedAttachmentIds: ["att-1"],
      compositionHints: [{ nameHint: "Коронка Emax", teethFdi: ["46"] }],
      confidenceScore: 88,
      warnings: [],
    });
  });

  it("handles invalid JSON gracefully", async () => {
    vi.mocked(llmConfig.getAiSettings).mockResolvedValueOnce({
      enabled: true,
      apiKey: "sk-test",
      model: "test",
      fallbackModels: [],
      timeoutMs: 1000,
    });

    vi.mocked(llmClient.chatCompletion).mockResolvedValueOnce({
      ok: true,
      content: "This is not JSON",
      model: "test",
      durationMs: 100,
    });

    const res = await extractOrderFieldsFromSingleEmail("t1", "Subj", "Body");
    expect(res.result).toBeNull();
    expect(res.error).toContain("JSON parse/validation error");
  });
});

describe("OrderEmailExtractSchema", () => {
  it("coerces numeric teethFdi codes to strings", () => {
    const parsed = OrderEmailExtractSchema.parse({
      patientName: "Беляев Иван",
      clinicId: null,
      doctorId: null,
      clientOrderText: "марко росса",
      patientAppointmentAt: null,
      urgent: false,
      suggestedAttachmentIds: [],
      compositionHints: [{ nameHint: "Аппарат Марко Росса", teethFdi: [53, 63, 55, 65] }],
      confidenceScore: 80,
      warnings: [],
    });
    expect(parsed.compositionHints[0]?.teethFdi).toEqual(["53", "63", "55", "65"]);
  });

  it("coerces single teethFdi value and comma-separated string", () => {
    const single = OrderEmailExtractSchema.parse({
      patientName: "X",
      clinicId: null,
      doctorId: null,
      clientOrderText: "коронка 46",
      patientAppointmentAt: null,
      urgent: false,
      suggestedAttachmentIds: [],
      compositionHints: [{ nameHint: "Коронка", teethFdi: 46 }],
      confidenceScore: 80,
      warnings: [],
    });
    expect(single.compositionHints[0]?.teethFdi).toEqual(["46"]);

    const list = OrderEmailExtractSchema.parse({
      patientName: "X",
      clinicId: null,
      doctorId: null,
      clientOrderText: "коронки",
      patientAppointmentAt: null,
      urgent: false,
      suggestedAttachmentIds: [],
      compositionHints: [{ nameHint: "Коронка", teethFdi: "46, 47" }],
      confidenceScore: 80,
      warnings: [],
    });
    expect(list.compositionHints[0]?.teethFdi).toEqual(["46", "47"]);
  });
});

describe("mergeAiPredictionJson", () => {
  it("overrides client ids when matched by source email", () => {
    const merged = mergeAiPredictionJson(
      {
        clinicId: "wrong",
        doctorId: "wrong",
        patientName: "X",
        clientOrderText: "текст",
        suggestedAttachmentIds: [],
        confidenceScore: 50,
        warnings: [],
      },
      {
        preResolved: { clinicId: "c1", doctorId: "d1" },
        matchedBySourceEmail: true,
      },
    );
    expect(merged.clinicId).toBe("c1");
    expect(merged.doctorId).toBe("d1");
    expect(merged.matchedBySourceEmail).toBe(true);
  });
});
