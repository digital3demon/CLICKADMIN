export function financeOfficeListHref(input: {
  tag?: string | null;
  q?: string | null;
} = {}): string {
  const sp = new URLSearchParams();
  const tag = input.tag?.trim();
  const q = input.q?.trim();
  if (tag) sp.set("tag", tag);
  if (q) sp.set("q", q);
  const qs = sp.toString();
  return qs ? `/finance-office?${qs}` : "/finance-office";
}
