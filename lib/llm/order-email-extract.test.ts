import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  extractOrderFieldsFromSingleEmail,
  mergeAiPredictionJson,
} from "./order-email-extract";
import * as openrouterConfig from "./openrouter-config";
import * as openrouterClient from "./openrouter-client";

vi.mock("./openrouter-config", () => ({
  getAiSettings: vi.fn(),
}));

vi.mock("./openrouter-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./openrouter-client")>();
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
    vi.mocked(openrouterConfig.getAiSettings).mockResolvedValueOnce({
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
    vi.mocked(openrouterConfig.getAiSettings).mockResolvedValueOnce({
      enabled: true,
      apiKey: "sk-test",
      model: "test",
      fallbackModels: [],
      timeoutMs: 1000,
    });

    vi.mocked(openrouterClient.chatCompletion).mockResolvedValueOnce({
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
    vi.mocked(openrouterConfig.getAiSettings).mockResolvedValueOnce({
      enabled: true,
      apiKey: "sk-test",
      model: "test",
      fallbackModels: [],
      timeoutMs: 1000,
    });

    vi.mocked(openrouterClient.chatCompletion).mockResolvedValueOnce({
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
