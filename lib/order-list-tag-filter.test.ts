import { describe, expect, it } from "vitest";
import {
  humanListTagLabel,
  listTagKaitenColumnTitle,
  listTagKaitenTrackLane,
  listTagKaitenTrackLaneOrNull,
  listTagParamsEqual,
  listTagUrgentCoefficient,
  listTagWhere,
  parseKaitenTrackLaneValue,
  parseListTagParam,
  relatedOrdersListTagQuickFilters,
  LIST_TAG_PROSTHETICS_PENDING,
  LIST_TAG_WAIT_PAYMENT,
} from "@/lib/order-list-tag-filter";

describe("parseListTagParam / urgent", () => {
  it("parses all urgent", () => {
    expect(parseListTagParam("urgent")).toEqual({ kind: "urgent", filter: "all" });
  });

  it("parses urgent without coefficient", () => {
    expect(parseListTagParam("urgent-nc")).toEqual({ kind: "urgent", filter: "noCoef" });
  });

  it("parses urgent with coefficient (кириллица в URL не нужна — только число)", () => {
    expect(parseListTagParam("urgent-cf~1.2")).toEqual({
      kind: "urgent",
      filter: "coef",
      coef: 1.2,
    });
    expect(parseListTagParam("urgent-cf~1,5")).toEqual({
      kind: "urgent",
      filter: "coef",
      coef: 1.5,
    });
  });

  it("listTagParamsEqual treats k: encoding variants as same column", () => {
    const a = parseListTagParam(listTagKaitenColumnTitle("К исполнению"));
    const b = parseListTagParam("k:К исполнению");
    expect(a?.kind).toBe("kaitenColumn");
    expect(b?.kind).toBe("kaitenColumn");
    if (a?.kind === "kaitenColumn" && b?.kind === "kaitenColumn") {
      expect(listTagParamsEqual(a, b)).toBe(true);
    }
  });

  it("listTagUrgentCoefficient falls back for invalid", () => {
    expect(listTagUrgentCoefficient(Number.NaN)).toBe("urgent");
  });

  it("parses finance and EDO tags", () => {
    expect(parseListTagParam("finance-not-calculated")).toEqual({
      kind: "financeNotCalculated",
    });
    expect(parseListTagParam("edo")).toEqual({ kind: "edo" });
    expect(parseListTagParam("no-edo")).toEqual({ kind: "noEdo" });
    expect(parseListTagParam("edo-paper")).toEqual({ kind: "edoPaper" });
    expect(humanListTagLabel({ kind: "noEdo" })).toBe("бумдоки");
    expect(humanListTagLabel({ kind: "edoPaper" })).toBe("ЭДО+бумдоки");
  });

  it("parses admin-memo (колонка Пометки)", () => {
    expect(parseListTagParam("admin-memo")).toEqual({ kind: "adminMemo" });
  });

  it("wait-payment: ключ и c: с хвостом — один фильтр ЖДЕМ ОПЛАТУ", () => {
    expect(parseListTagParam(LIST_TAG_WAIT_PAYMENT)).toEqual({
      kind: "waitPayment",
    });
    expect(parseListTagParam("c:ждем оплату тест")).toEqual({
      kind: "waitPayment",
    });
    expect(humanListTagLabel({ kind: "waitPayment" })).toBe("ЖДЕМ ОПЛАТУ");
    expect(listTagWhere({ kind: "waitPayment" }).listCustomTags).toBeTruthy();
  });
});

describe("kaiten track lane tag", () => {
  it("parses lane keys and maps cyrillic labels", () => {
    expect(parseListTagParam("lane:ORTHOPEDICS")).toEqual({
      kind: "kaitenTrackLane",
      lane: "ORTHOPEDICS",
    });
    expect(parseListTagParam("lane:orthodontics")).toEqual({
      kind: "kaitenTrackLane",
      lane: "ORTHODONTICS",
    });
    expect(parseKaitenTrackLaneValue("тест")).toBe(null);
    expect(parseKaitenTrackLaneValue("TEST")).toBe("TEST");
    expect(listTagKaitenTrackLaneOrNull("ORTHOPEDICS")).toBe("lane:ORTHOPEDICS");
    expect(listTagKaitenTrackLaneOrNull("ортопедия")).toBe(null);
    expect(humanListTagLabel({ kind: "kaitenTrackLane", lane: "ORTHOPEDICS" })).toBe(
      "Ортопедия",
    );
    expect(humanListTagLabel({ kind: "kaitenTrackLane", lane: "ORTHODONTICS" })).toBe(
      "Ортодонтия",
    );
  });

  it("filters by kaitenTrackLane and keeps cyrillic labels in related chips", () => {
    const parsed = parseListTagParam(listTagKaitenTrackLane("ORTHODONTICS"));
    expect(parsed?.kind).toBe("kaitenTrackLane");
    if (parsed?.kind !== "kaitenTrackLane") return;
    expect(listTagWhere(parsed)).toEqual({ kaitenTrackLane: "ORTHODONTICS" });
    const labels = relatedOrdersListTagQuickFilters(parsed).map((x) => x.label);
    expect(labels).toContain("Ортопедия");
    expect(labels).toContain("Ортодонтия");
    expect(labels).toContain("Тест");
  });

  it("listTagParamsEqual distinguishes boards", () => {
    const a = parseListTagParam("lane:ORTHOPEDICS");
    const b = parseListTagParam("lane:ORTHODONTICS");
    expect(a && b && listTagParamsEqual(a, b)).toBe(false);
    expect(a && listTagParamsEqual(a, a)).toBe(true);
  });
});

describe("listTagWhere prostheticsPending", () => {
  it("включает pending из inbox и legacy (как счётчик чипа)", () => {
    const parsed = parseListTagParam(LIST_TAG_PROSTHETICS_PENDING);
    expect(parsed?.kind).toBe("prostheticsPending");
    if (parsed?.kind !== "prostheticsPending") return;
    const json = JSON.stringify(listTagWhere(parsed));
    expect(json).toContain("prostheticsOrdered");
    expect(json).toContain("prostheticsRequests");
    expect(json).toContain("chatInboxItems");
    expect(json).toContain("PROSTHETICS");
  });
});
