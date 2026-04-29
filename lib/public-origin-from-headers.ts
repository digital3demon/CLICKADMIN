/** Заголовки с `get(name)` — `Headers` из Request или `next/headers`. */
export type HeaderGetter = Pick<Headers, "get">;

function firstSegment(raw: string | null): string {
  return raw?.trim().split(",")[0]?.trim() ?? "";
}

/**
 * Публичный `https://домен` из `X-Forwarded-*` / `Host` (прокси перед Node).
 */
export function publicOriginFromHeaders(h: HeaderGetter): string | null {
  const host =
    firstSegment(h.get("x-forwarded-host")) ||
    firstSegment(h.get("host"));
  if (!host) return null;

  const firstProto = firstSegment(h.get("x-forwarded-proto")).replace(/:$/, "");
  const looksLocal =
    /^(localhost|127\.0\.0\.1|\[::1\])/i.test(host) ||
    host.endsWith(".localhost");
  const proto = firstProto || (looksLocal ? "http" : "https");

  return `${proto}://${host}`;
}
