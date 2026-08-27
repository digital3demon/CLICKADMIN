/**
 * Общая сетка сверки (PDF и Excel): 10 колонок детализации.
 * Сводка справа: имя = кол. 6 («Выставлено» / юрлицо клиента),
 * кол-во = 7, цена = 8, сумма = 9. Колонки 1–5 пустые.
 *
 * A4 landscape ~842pt, поля 16+16 → 809pt (1pt справа, чтобы Yoga
 * не срезала правую рамку последней ячейки).
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
