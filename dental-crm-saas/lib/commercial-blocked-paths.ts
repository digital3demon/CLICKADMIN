/** В `commercial` эти пути (интеграция kaiten.ru) не обслуживаются — 404. */
export function isKaitenExternalPath(pathname: string): boolean {
  if (pathname.startsWith("/directory/kaiten")) return true;
  if (pathname === "/api/orders/kaiten-titles-sync") return true;
  if (pathname.startsWith("/api/kaiten")) return true;
  if (/^\/api\/orders\/[^/]+\/kaiten(\/|$)/.test(pathname)) return true;
  return false;
}
