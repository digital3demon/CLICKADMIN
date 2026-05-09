/**
 * Telegram иногда отдаёт id как number, иногда как строку (без потери точности для больших значений).
 */
export function telegramPeerIdToString(id: unknown): string | null {
  if (id == null) return null;
  if (typeof id === "string") {
    const t = id.trim();
    return /^-?\d+$/.test(t) ? t : null;
  }
  if (typeof id === "number" && Number.isFinite(id)) {
    return String(Math.trunc(id));
  }
  return null;
}
