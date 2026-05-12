/** Публичная витрина по QR с этикетки: выбор роли (админ / техник / курьер / клиент). */
export function stickerPublicHubPath(tenantSlug: string, token: string): string {
  const s = String(tenantSlug || "").trim();
  const t = String(token || "").trim();
  return `/p/t/${encodeURIComponent(s)}/s/${encodeURIComponent(t)}`;
}

export function stickerPublicClientPath(tenantSlug: string, token: string): string {
  return `${stickerPublicHubPath(tenantSlug, token)}/client`;
}

export function stickerPublicHubAbsoluteUrl(
  origin: string | null | undefined,
  tenantSlug: string,
  token: string,
): string {
  const path = stickerPublicHubPath(tenantSlug, token);
  const o = String(origin || "")
    .trim()
    .replace(/\/+$/, "");
  return o ? `${o}${path}` : path;
}
