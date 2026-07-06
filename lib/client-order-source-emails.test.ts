import { describe, expect, it } from "vitest";
import {
  buildOrderSourceEmailPairIndex,
  mergeDistinctOrderSourceEmails,
  normalizeOrderSourceEmailAddress,
  resolveClientIdsFromPairIndex,
  resolveOrderSourceEmailClientMatch,
} from "./client-order-source-emails";
import {
  buildVirtualOrderDraftFromPrediction,
  resolveClientIdsFromPrediction,
  resolveSuggestedAttachments,
} from "./ai-order-draft-from-prediction";
import { ORDER_CLINIC_PRIVATE } from "./clients-order-ui";
import { URGENT_NO_COEF, URGENT_UNSET } from "./order-urgency";

describe("normalizeOrderSourceEmailAddress", () => {
  it("extracts address from display name format", () => {
    expect(normalizeOrderSourceEmailAddress("Денис <denis@clinic.ru>")).toBe(
      "denis@clinic.ru",
    );
  });

  it("lowercases bare address", () => {
    expect(normalizeOrderSourceEmailAddress("Me@Abdulabekov.ru")).toBe(
      "me@abdulabekov.ru",
    );
  });

  it("returns null for empty or invalid", () => {
    expect(normalizeOrderSourceEmailAddress("")).toBeNull();
    expect(normalizeOrderSourceEmailAddress("не-почта")).toBeNull();
  });
});

describe("mergeDistinctOrderSourceEmails", () => {
  it("deduplicates case-insensitively and sorts", () => {
    expect(
      mergeDistinctOrderSourceEmails([
        "b@x.ru",
        "A@x.ru",
        "B@x.ru",
        null,
        "  ",
      ]),
    ).toEqual(["a@x.ru", "b@x.ru"]);
  });
});

describe("resolveOrderSourceEmailClientMatch", () => {
  const catalogDoctor = {
    clinicId: "c-catalog",
    doctorId: "d-catalog",
    matched: true,
    ambiguous: false,
  };
  const catalogEmpty = {
    clinicId: null,
    doctorId: null,
    matched: false,
    ambiguous: false,
  };

  it("uses unambiguous history pair", () => {
    expect(
      resolveOrderSourceEmailClientMatch(
        [{ clinicId: "c1", doctorId: "d1" }],
        catalogEmpty,
      ),
    ).toEqual({
      clinicId: "c1",
      doctorId: "d1",
      matched: true,
      ambiguous: false,
    });
  });

  it("prefers current order client when history is ambiguous", () => {
    expect(
      resolveOrderSourceEmailClientMatch(
        [
          { clinicId: "c1", doctorId: "d1" },
          { clinicId: "c2", doctorId: "d2" },
        ],
        catalogEmpty,
        { clinicId: "c2", doctorId: "d2" },
      ),
    ).toEqual({
      clinicId: "c2",
      doctorId: "d2",
      matched: true,
      ambiguous: false,
    });
  });

  it("uses CRM catalog when history is ambiguous and order has no pair", () => {
    expect(
      resolveOrderSourceEmailClientMatch(
        [
          { clinicId: "c1", doctorId: "d1" },
          { clinicId: "c2", doctorId: "d2" },
        ],
        catalogDoctor,
        { clinicId: "c-other", doctorId: "d-other" },
      ),
    ).toEqual(catalogDoctor);
  });

  it("stays ambiguous when history and catalog disagree", () => {
    expect(
      resolveOrderSourceEmailClientMatch(
        [
          { clinicId: "c1", doctorId: "d1" },
          { clinicId: "c2", doctorId: "d2" },
        ],
        catalogEmpty,
      ),
    ).toEqual({
      clinicId: null,
      doctorId: null,
      matched: false,
      ambiguous: true,
    });
  });
});

describe("resolveClientIdsFromPairIndex", () => {
  const index = buildOrderSourceEmailPairIndex([
    { fromAddress: "a@clinic.ru", clinicId: "c1", doctorId: "d1" },
    { fromAddress: "b@x.ru", clinicId: "c2", doctorId: "d2" },
    { fromAddress: "b@x.ru", clinicId: "c3", doctorId: "d3" },
  ]);

  it("matches unambiguous address", () => {
    expect(resolveClientIdsFromPairIndex(index, "a@clinic.ru")).toEqual({
      clinicId: "c1",
      doctorId: "d1",
      matched: true,
      ambiguous: false,
    });
  });

  it("returns ambiguous for multiple clients on same email", () => {
    expect(resolveClientIdsFromPairIndex(index, "b@x.ru")).toEqual({
      clinicId: null,
      doctorId: null,
      matched: false,
      ambiguous: true,
    });
  });

  it("returns no match for unknown email", () => {
    expect(resolveClientIdsFromPairIndex(index, "unknown@x.ru")).toEqual({
      clinicId: null,
      doctorId: null,
      matched: false,
      ambiguous: false,
    });
  });
});

describe("buildVirtualOrderDraftFromPrediction", () => {
  it("builds empty draft with only AI fields", () => {
    const draft = buildVirtualOrderDraftFromPrediction(
      {
        patientName: "Иванов",
        workDescription: "Коронка",
        urgent: true,
      },
      { clinicId: "c1", doctorId: "d1" },
    );
    expect(draft.patientName).toBe("Иванов");
    expect(draft.clientOrderText).toBe("Коронка");
    expect(draft.clinicId).toBe("c1");
    expect(draft.doctorId).toBe("d1");
    expect(draft.urgentSelection).toBe(URGENT_NO_COEF);
    expect(draft.detailLines).toEqual([]);
  });

  it("uses source email match over AI ids", () => {
    const ids = resolveClientIdsFromPrediction(
      { clinicId: "wrong", doctorId: "wrong" },
      { clinicId: "c-real", doctorId: "d-real", matched: true },
    );
    expect(ids).toEqual({ clinicId: "c-real", doctorId: "d-real" });
  });

  it("maps null clinic to private practice sentinel", () => {
    const ids = resolveClientIdsFromPrediction(
      { clinicId: null, doctorId: "d1" },
      undefined,
    );
    expect(ids.clinicId).toBe(ORDER_CLINIC_PRIVATE);
  });

  it("leaves urgent unset when false", () => {
    const draft = buildVirtualOrderDraftFromPrediction(
      { urgent: false },
      { clinicId: "", doctorId: "" },
    );
    expect(draft.urgentSelection).toBe(URGENT_UNSET);
  });
});

describe("resolveSuggestedAttachments", () => {
  it("filters attachments by suggested ids", () => {
    const rows = [
      { id: "a1", fileName: "scan.stl", mimeType: "model/stl" },
      { id: "a2", fileName: "photo.jpg", mimeType: "image/jpeg" },
    ];
    expect(resolveSuggestedAttachments(rows, ["a2", "missing"])).toEqual([
      rows[1],
    ]);
  });
});
