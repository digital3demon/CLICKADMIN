/** Срок жизни демо после первого входа по коду (12 ч). */
export const DEMO_ACCESS_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const DEMO_ACCESS_SESSION_TTL_SEC = DEMO_ACCESS_SESSION_TTL_MS / 1000;
export const DEMO_ACCESS_SESSION_JWT_TTL = "12h" as const;

export function demoAccessSessionExpiresAt(consumedAt: Date): Date {
  return new Date(consumedAt.getTime() + DEMO_ACCESS_SESSION_TTL_MS);
}

export function isDemoAccessSessionExpired(input: {
  consumedAt: Date | null;
  revokedAt: Date | null;
  now?: number;
}): boolean {
  if (input.revokedAt) return true;
  if (!input.consumedAt) return true;
  const now = input.now ?? Date.now();
  return demoAccessSessionExpiresAt(input.consumedAt).getTime() <= now;
}
