export function financeOfficeListHref(input: {
  tag?: string | null;
  q?: string | null;
  tab?: string | null;
  from?: string | null;
  to?: string | null;
} = {}): string {
  const sp = new URLSearchParams();
  const tab = input.tab?.trim();
  const from = input.from?.trim();
  const to = input.to?.trim();
  const tag = input.tag?.trim();
  const q = input.q?.trim();
  if (tab) sp.set("tab", tab);
  if (from) sp.set("from", from);
  if (to) sp.set("to", to);
  if (tag) sp.set("tag", tag);
  if (q) sp.set("q", q);
  const qs = sp.toString();
  return qs ? `/finance-office?${qs}` : "/finance-office";
}
