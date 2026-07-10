import { describe, expect, it } from "vitest";
import {
  listTagKaitenColumnTitle,
  listTagParamsEqual,
  listTagUrgentCoefficient,
  parseListTagParam,
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
  });

  it("parses admin-memo (колонка Пометки)", () => {
    expect(parseListTagParam("admin-memo")).toEqual({ kind: "adminMemo" });
  });
});
