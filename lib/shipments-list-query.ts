/** Ссылка на страницу «Отгрузки» с вкладкой, периодом и опциональным фильтром по отметке (`tag=`). */
export function shipmentsListHref(opts: {
  tab: string;
  /** Ключ фильтра как в списке заказов (`payment-paid`, `c:…`, `k:…`). */
  tag?: string | null;
  from?: string | null;
  to?: string | null;
}): string {
  const p = new URLSearchParams();
  const tab = String(opts.tab || "").trim() || "today";
  p.set("tab", tab);
  const from = opts.from?.trim() || "";
  const to = opts.to?.trim() || "";
  if (from) p.set("from", from);
  if (to) p.set("to", to);
  const tag = opts.tag?.trim() || "";
  if (tag) p.set("tag", tag);
  const q = p.toString();
  return q ? `/shipments?${q}` : "/shipments";
}

/** Печать этикеток 58×40 мм для текущего списка отгрузки (те же query, что и у `/shipments`). */
export function shipmentsStickersPrintHref(opts: {
  tab: string;
  tag?: string | null;
  from?: string | null;
  to?: string | null;
}): string {
  const p = new URLSearchParams();
  const tab = String(opts.tab || "").trim() || "today";
  p.set("tab", tab);
  const from = opts.from?.trim() || "";
  const to = opts.to?.trim() || "";
  if (from) p.set("from", from);
  if (to) p.set("to", to);
  const tag = opts.tag?.trim() || "";
  if (tag) p.set("tag", tag);
  const q = p.toString();
  return q ? `/shipments/stickers-print?${q}` : "/shipments/stickers-print";
}
