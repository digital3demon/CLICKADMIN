import { describe, expect, it } from "vitest";
import {
  RECON_COL_W_PT,
  RECON_PAGE_INNER_PT,
  RECON_PDF_PAGE_BODY_PT,
  reconColSpan,
  reconEstimateFirstBlockPt,
  reconPdfBoxedSpan,
  reconPdfInnerCol,
  reconPdfInnerSpan,
  reconPdfPrefixBeforeCol,
  reconSummaryCompact,
  RECON_PDF_SPINE_PT,
} from "@/lib/clinic-reconciliation-layout";

describe("clinic-reconciliation-layout", () => {
  it("сумма колонок равна ширине страницы", () => {
    expect(reconColSpan(0, 9)).toBe(RECON_PAGE_INNER_PT);
    expect(RECON_COL_W_PT.reduce((a, b) => a + b, 0)).toBe(809);
  });

  it("имя сводки = только колонка «Выставлено» (6), не 1–6", () => {
    expect(RECON_COL_W_PT[5]).toBe(243);
    expect(reconColSpan(0, 4) + RECON_COL_W_PT[5]!).toBe(reconColSpan(0, 5));
  });

  it("11 спин + inner колонок = ширина страницы; сводка и оплата на той же сетке", () => {
    let innerSum = 0;
    for (let i = 0; i <= 9; i++) innerSum += reconPdfInnerCol(i);
    expect(innerSum + 11 * RECON_PDF_SPINE_PT).toBe(RECON_PAGE_INNER_PT);
    expect(
      reconPdfPrefixBeforeCol(0) + reconPdfBoxedSpan(0, 9),
    ).toBe(RECON_PAGE_INNER_PT);
    expect(
      reconPdfPrefixBeforeCol(5) +
        reconPdfBoxedSpan(5, 8) +
        reconPdfInnerCol(9) +
        RECON_PDF_SPINE_PT,
    ).toBe(RECON_PAGE_INNER_PT);
    expect(
      reconPdfPrefixBeforeCol(8) + reconPdfBoxedSpan(8, 9),
    ).toBe(RECON_PAGE_INNER_PT);
  });

  it("длинный список сводки ужимает ряд, пока блок влезает на страницу", () => {
    const roomy = reconSummaryCompact(8);
    expect(roomy.allowWrap).toBe(false);
    expect(roomy.rowMinH).toBe(15);

    const long = reconSummaryCompact(36);
    expect(long.allowWrap).toBe(false);
    expect(long.rowMinH).toBeLessThan(15);
    expect(reconEstimateFirstBlockPt(36, long)).toBeLessThanOrEqual(
      RECON_PDF_PAGE_BODY_PT,
    );
  });

  it("перенос сводки только если даже плотный ряд не влезает", () => {
    const huge = reconSummaryCompact(80);
    expect(huge.allowWrap).toBe(true);
    expect(huge.rowMinH).toBe(8);
  });
});
