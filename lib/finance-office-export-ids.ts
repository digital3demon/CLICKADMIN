/**
 * Выгрузка ФинОтдела: только выбранные id.
 * Query: повторяющиеся `id=` и/или `ids=` через запятую/пробел.
 * Без id API не отдаёт список по фильтру.
 */
export const FINANCE_OFFICE_EXPORT_MAX_IDS = 500;

export function parseFinanceOfficeExportIds(searchParams: URLSearchParams): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const pushToken = (raw: string) => {
    const id = raw.trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    out.push(id);
  };

  const pushChunk = (raw: string) => {
    for (const part of raw.split(/[,;\s]+/)) {
      if (out.length >= FINANCE_OFFICE_EXPORT_MAX_IDS) return;
      pushToken(part);
    }
  };

  for (const value of searchParams.getAll("id")) {
    if (out.length >= FINANCE_OFFICE_EXPORT_MAX_IDS) break;
    pushChunk(value);
  }
  const csv = searchParams.get("ids");
  if (csv && out.length < FINANCE_OFFICE_EXPORT_MAX_IDS) {
    pushChunk(csv);
  }
  return out;
}

export function financeOfficeExportHref(orderIds: Iterable<string>): string {
  const ids = parseFinanceOfficeExportIds(
    new URLSearchParams([...orderIds].map((id) => ["id", id])),
  );
  const params = new URLSearchParams();
  if (ids.length > 0) params.set("ids", ids.join(","));
  const q = params.toString();
  return q ? `/api/finance-office/export?${q}` : "/api/finance-office/export";
}
