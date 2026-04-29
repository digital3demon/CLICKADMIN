/** Одна строка из разбора счёта (PDF и т.п.). */
export type InvoiceParsedLineV1 = {
  name: string;
  qty: number;
  code?: string | null;
  /** Сумма по строке (руб., целые), если извлечена из колонки «Сумма». */
  lineTotalRub?: number | null;
};

export function normalizeInvoiceParsedLines(
  raw: unknown,
): InvoiceParsedLineV1[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const out: InvoiceParsedLineV1[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name.trim() : "";
    if (!name) continue;
    const qtyRaw = o.qty;
    const qty =
      typeof qtyRaw === "number" && Number.isFinite(qtyRaw)
        ? qtyRaw
        : typeof qtyRaw === "string"
          ? Number.parseFloat(qtyRaw.replace(",", "."))
          : NaN;
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const code =
      typeof o.code === "string" && o.code.trim() ? o.code.trim() : null;
    let lineTotalRub: number | null = null;
    if (o.lineTotalRub != null) {
      const lt =
        typeof o.lineTotalRub === "number"
          ? o.lineTotalRub
          : typeof o.lineTotalRub === "string"
            ? Number.parseFloat(String(o.lineTotalRub).replace(",", "."))
            : NaN;
      if (Number.isFinite(lt) && lt >= 0 && lt <= 99_999_999) {
        lineTotalRub = Math.round(lt);
      }
    }
    out.push({
      name,
      qty,
      code,
      ...(lineTotalRub != null ? { lineTotalRub } : {}),
    });
  }
  return out.length ? out : null;
}

/** Текст для поля «ВЫСТАВЛЕНО»: только код и наименование по строкам счёта. */
export function formatInvoiceParsedLinesAsText(
  lines: InvoiceParsedLineV1[],
): string {
  return lines
    .map((l) => {
      const c = l.code ? `${l.code} · ` : "";
      return `${c}${l.name}`;
    })
    .join("\n");
}
