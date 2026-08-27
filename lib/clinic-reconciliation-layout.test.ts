import { describe, expect, it } from "vitest";
import {
  RECON_COL_W_PT,
  RECON_PAGE_INNER_PT,
  reconColSpan,
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

  it("последняя колонка оставляет 2pt под вертикальные спины PDF", () => {
    const innerLast = RECON_COL_W_PT[9]! - 2;
    const innerSum =
      RECON_COL_W_PT.slice(0, 9).reduce((a, b) => a + b, 0) + innerLast;
    expect(innerSum).toBe(RECON_PAGE_INNER_PT - 2);
  });
});
