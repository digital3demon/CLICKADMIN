/** Where пользователя только своего tenant. null — нет tid в сессии. */
export function userInTenantWhere(
  id: string,
  tenantId: string | undefined,
): { id: string; tenantId: string } | null {
  const tid = tenantId?.trim();
  const uid = id.trim();
  if (!tid || !uid) return null;
  return { id: uid, tenantId: tid };
}
