/**
 * Свободный разбор Excel ФОТ: ищем пары «текст + число > 0».
 * Роли и прайс не угадываем.
 */
export type FreeformPayrollCandidate = {
  name: string;
  amountRub: number;
  sheet: string;
  row: number;
  col: number;
};

const SKIP_LABELS = new Set(["₽", "руб", "руб.", "?", "-", "—", "сумма", "цена"]);

function cellAsText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) return "";
  if (typeof value === "boolean") return "";
  if (value instanceof Date) return "";
  if (typeof value === "object" && value !== null && "richText" in value) {
    const rt = (value as { richText: { text: string }[] }).richText;
    return rt.map((p) => p.text).join("").trim();
  }
  if (typeof value === "object" && value !== null && "text" in value) {
    return String((value as { text: unknown }).text ?? "").trim();
  }
  if (typeof value === "object" && value !== null && "result" in value) {
    const r = (value as { result: unknown }).result;
    if (typeof r === "number") return "";
    return String(r ?? "").trim();
  }
  return String(value).trim();
}

function cellAsAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value === "object" && value !== null && "result" in value) {
    const r = (value as { result: unknown }).result;
    if (typeof r === "number" && Number.isFinite(r) && r > 0) return Math.round(r);
  }
  const text = cellAsText(value).replace(/\s/g, "").replace(",", ".");
  if (!text || SKIP_LABELS.has(text.toLowerCase())) return null;
  const n = Number.parseFloat(text);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function isSkipLabel(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return true;
  if (SKIP_LABELS.has(t)) return true;
  if (/^₽+$/.test(t)) return true;
  return false;
}

/**
 * @param sheets — массив листов: имя + матрица значений (row-major, 0-index).
 */
export function extractFreeformPayrollCandidates(
  sheets: readonly { name: string; rows: unknown[][] }[],
): FreeformPayrollCandidate[] {
  const out: FreeformPayrollCandidate[] = [];
  const seen = new Set<string>();

  for (const sheet of sheets) {
    for (let r = 0; r < sheet.rows.length; r++) {
      const row = sheet.rows[r] ?? [];
      for (let c = 0; c < row.length; c++) {
        const label = cellAsText(row[c]);
        if (!label || isSkipLabel(label)) continue;
        // число справа в той же строке (часто через пустую колонку)
        let amount: number | null = null;
        let amountCol = -1;
        for (let k = c + 1; k <= Math.min(c + 3, row.length - 1); k++) {
          const a = cellAsAmount(row[k]);
          if (a != null) {
            amount = a;
            amountCol = k;
            break;
          }
          const mid = cellAsText(row[k]);
          if (mid && !isSkipLabel(mid) && cellAsAmount(row[k]) == null) break;
        }
        if (amount == null) continue;
        const key = `${sheet.name}|${r}|${c}|${amountCol}|${label}|${amount}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          name: label,
          amountRub: amount,
          sheet: sheet.name,
          row: r + 1,
          col: c + 1,
        });
      }
    }
  }
  return out;
}
