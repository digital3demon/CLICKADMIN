import { describe, expect, it } from "vitest";
import {
  RECON_COL_W_PT,
  RECON_PAGE_INNER_PT,
  reconColSpan,
} from "@/lib/clinic-reconciliation-layout";

describe("clinic-reconciliation-layout", () => {
  it("сумма колонок равна ширине страницы", () => {
    expect(reconColSpan(0, 9)).toBe(RECON_PAGE_INNER_PT);
    expect(RECON_COL_W_PT.reduce((a, b) => a + b, 0)).toBe(810);
  });

  it("сводка стоимость/сумма = колонки цена и стоим. детализации", () => {
    expect(RECON_COL_W_PT[7]).toBe(RECON_COL_W_PT[7]);
    expect(reconColSpan(5, 8)).toBe(
      RECON_COL_W_PT[5]! +
        RECON_COL_W_PT[6]! +
        RECON_COL_W_PT[7]! +
        RECON_COL_W_PT[8]!,
    );
  });
});
