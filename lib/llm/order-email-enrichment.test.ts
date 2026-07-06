import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/get-domain-prisma", () => ({
  getClientsPrisma: vi.fn().mockResolvedValue({
    clinic: {
      findFirst: vi.fn().mockResolvedValue({
        billingLegalForm: "OOO",
        worksWithReconciliation: true,
      }),
    },
    doctor: { findFirst: vi.fn().mockResolvedValue(null) },
  }),
}));

vi.mock("@/lib/get-lab-due-hm-slots-for-tenant", () => ({
  getLabDueSettingsForTenant: vi.fn().mockResolvedValue({
    slots: ["12:00"],
    country: "RU",
  }),
}));

vi.mock("@/lib/order-due-datetime", () => ({
  autoLabDueLocalFromLeadWorkingDays: vi.fn().mockReturnValue("2026-06-11T12:00"),
}));

vi.mock("./resolve-ai-composition-lines", () => ({
  resolveAiCompositionLines: vi.fn().mockResolvedValue({
    lines: [
      {
        priceListItemId: "pli-1",
        code: "001",
        name: "Аппарат Андрезена",
        quantity: 1,
        unitPrice: 12000,
        leadWorkingDays: 5,
        teethFdi: [],
      },
      {
        priceListItemId: "pli-2",
        code: "002",
        name: "Коронка Emax",
        quantity: 1,
        unitPrice: 8000,
        leadWorkingDays: 3,
        teethFdi: ["46"],
      },
    ],
    warnings: [],
    maxLeadWorkingDays: 5,
  }),
  compositionLinesToOrderConstructions: vi.fn().mockReturnValue([]),
}));

import { enrichOrderEmailPrediction } from "./order-email-enrichment";
import { ORDER_EMAIL_ENRICHMENT_VERSION } from "./order-email-enrichment-version";

describe("enrichOrderEmailPrediction Lebedeva-like case", () => {
  const db = {
    email: {
      findUnique: vi.fn().mockResolvedValue({
        receivedAt: new Date("2026-06-02T10:00:00.000Z"),
        sentAt: null,
        createdAt: new Date("2026-06-02T10:00:00.000Z"),
        textBody: null,
        htmlBody: null,
        preview: null,
      }),
    },
    emailSourceOrder: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enriches STL ids, appointment date, composition and strips signature fallback", async () => {
    const enriched = await enrichOrderEmailPrediction(db as never, "tenant-1", {
      orderId: "order-1",
      primaryEmailId: "email-1",
      ai: {
        patientName: "Лебедева Мария",
        clientOrderText: "Аппарат на нижнюю челюсть, зуб 46 Emax, доставка 12.06 или 15.06",
        patientAppointmentAt: "2026-06-12T09:00:00.000Z",
        urgent: false,
        suggestedAttachmentIds: ["stl-1", "stl-2", "stl-3"],
        hasScans: true,
        compositionHints: [
          { nameHint: "Аппарат Андрезена" },
          { nameHint: "Коронка Emax", teethFdi: ["46"] },
        ],
        confidenceScore: 92,
        warnings: ["Несколько дат записи/доставки — выбрана первая"],
      },
      attachments: [
        { id: "stl-1", fileName: "lower.stl", mimeType: "model/stl" },
        { id: "stl-2", fileName: "upper.stl", mimeType: "model/stl" },
        { id: "stl-3", fileName: "bite.stl", mimeType: "model/stl" },
      ],
      resolvedClinicId: "clinic-1",
      resolvedDoctorId: "doctor-1",
    });

    expect(enriched.suggestedAttachmentIds).toEqual(["stl-1", "stl-2", "stl-3"]);
    expect(enriched.hasScans).toBe(true);
    expect(enriched.dueToAdminsAt).toBe("2026-06-12T09:00:00.000Z");
    expect(enriched.workReceivedAt).toBe("2026-06-02T10:00:00.000Z");
    expect(enriched.compositionLineCount).toBe(2);
    expect(enriched.enrichmentVersion).toBe(ORDER_EMAIL_ENRICHMENT_VERSION);
    expect(enriched.clientOrderText).not.toMatch(/с уважением/i);
    expect(enriched.warnings).toEqual(
      expect.arrayContaining(["Несколько дат записи/доставки — выбрана первая"]),
    );
  });

  it("falls back clientOrderText from primary email body when AI text empty", async () => {
    vi.mocked(db.email.findUnique).mockResolvedValueOnce({
      receivedAt: new Date("2026-06-02T10:00:00.000Z"),
      sentAt: null,
      createdAt: new Date("2026-06-02T10:00:00.000Z"),
      textBody: "Коронка 46\n\nС уважением,\nКлиника",
      htmlBody: null,
      preview: null,
    });

    const enriched = await enrichOrderEmailPrediction(db as never, "tenant-1", {
      primaryEmailId: "email-1",
      ai: { suggestedAttachmentIds: [], compositionHints: [], warnings: [] },
      attachments: [],
      resolvedClinicId: "clinic-1",
      resolvedDoctorId: "doctor-1",
    });

    expect(enriched.clientOrderText).toBe("Коронка 46");
  });
});
