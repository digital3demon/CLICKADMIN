/**
 * Общая сетка сверки (PDF и Excel): 10 колонок детализации.
 * Сводка справа: имя = кол. 6 («Выставлено» / юрлицо клиента),
 * кол-во = 7, цена = 8, сумма = 9. Колонки 1–5 пустые.
 *
 * A4 landscape ~842pt, поля 16+16 → 809pt (1pt справа, чтобы Yoga
 * не срезала правую рамку последней ячейки).
 *
 * PDF: первый блок (сводка) ужимаем по числу строк, чтобы не
 * переносить одну позицию под шапку детализации. Перенос — только
 * если даже самый плотный ряд не влезает в тело страницы.
 */

export const RECON_PAGE_INNER_PT = 809;

/** Ширины колонок 1…10, сумма 809. */
export const RECON_COL_W_PT = [49, 45, 61, 85, 85, 243, 49, 61, 69, 62] as const;

export const RECON_ROW_GRAY = "#F3F3F3";
export const RECON_HEAD_GRAY = "#5A5A5A";
export const RECON_BORDER = "#000000";

export function reconColSpan(from: number, to: number): number {
  let s = 0;
  for (let i = from; i <= to; i++) s += RECON_COL_W_PT[i]!;
  return s;
}

/** Ширина колонки Excel (символы ≈ pt/7). */
export function reconExcelColWidth(pt: number): number {
  return Math.round((pt / 7) * 100) / 100;
}

export const RECON_EXCEL_NUMFMT_RUB = '"р." #,##0.00';

/** Короткая сторона A4 и поля страницы PDF (см. clinic-reconciliation-pdf-document). */
export const RECON_PDF_PAGE_SHORT_PT = 595.28;
export const RECON_PDF_PAGE_PAD_TOP = 18;
export const RECON_PDF_PAGE_PAD_BOTTOM = 16;
export const RECON_PDF_PAGE_BODY_PT =
  RECON_PDF_PAGE_SHORT_PT - RECON_PDF_PAGE_PAD_TOP - RECON_PDF_PAGE_PAD_BOTTOM;

const RECON_PDF_SPINE_PT = 1;
const RECON_PDF_PAY_BLOCK_PT = 36;

export type ReconSummaryCompact = {
  headMinH: number;
  rowMinH: number;
  yellowMinH: number;
  fontSize: number;
  cellPad: number;
  /** true — список физически не влезает даже в самый плотный ряд. */
  allowWrap: boolean;
};

const RECON_SUMMARY_COMPACT_LEVELS: ReadonlyArray<
  Omit<ReconSummaryCompact, "allowWrap">
> = [
  { headMinH: 18, rowMinH: 15, yellowMinH: 20, fontSize: 6.2, cellPad: 2 },
  { headMinH: 14, rowMinH: 11, yellowMinH: 16, fontSize: 5.6, cellPad: 1 },
  { headMinH: 12, rowMinH: 9, yellowMinH: 14, fontSize: 5.2, cellPad: 1 },
  { headMinH: 11, rowMinH: 8, yellowMinH: 13, fontSize: 5, cellPad: 0.5 },
];

export function reconEstimateFirstBlockPt(
  summaryCount: number,
  compact: Omit<ReconSummaryCompact, "allowWrap">,
): number {
  const n = Math.max(0, Math.floor(summaryCount));
  return (
    RECON_PDF_SPINE_PT +
    compact.headMinH +
    RECON_PDF_SPINE_PT +
    n * (compact.rowMinH + RECON_PDF_SPINE_PT) +
    compact.yellowMinH +
    RECON_PDF_SPINE_PT +
    RECON_PDF_PAY_BLOCK_PT
  );
}

export function reconSummaryCompact(summaryCount: number): ReconSummaryCompact {
  const slack = 4;
  for (const level of RECON_SUMMARY_COMPACT_LEVELS) {
    if (reconEstimateFirstBlockPt(summaryCount, level) <= RECON_PDF_PAGE_BODY_PT - slack) {
      return { ...level, allowWrap: false };
    }
  }
  const tight = RECON_SUMMARY_COMPACT_LEVELS[RECON_SUMMARY_COMPACT_LEVELS.length - 1]!;
  return { ...tight, allowWrap: true };
}
