const MAX_BLOCK_REASON_LEN = 2000;

/**
 * Читает состояние блокировки из ответа GET/PATCH `/cards/{id}` (Kaiten API v1).
 * Поля в разных версиях могут называться по-разному — перебираем варианты.
 */
function activeBlockerReasonFromCard(card: Record<string, unknown>): string | null {
  const raw = card.blockers;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  for (const row of raw) {
    if (row == null || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    if (o.released === true) continue;
    const r =
      (typeof o.reason === "string" && o.reason) ||
      (typeof o.block_reason === "string" && o.block_reason) ||
      "";
    const t = r.trim().slice(0, MAX_BLOCK_REASON_LEN);
    if (t.length > 0) return t;
    return "";
  }
  return null;
}

export function kaitenBlockStateFromCard(
  card: Record<string, unknown>,
): { blocked: boolean; reason: string | null } {
  const rawBlocked =
    card.blocked ??
    card.is_blocked ??
    card.blocked_state ??
    card.blocking;
  let blocked =
    rawBlocked === true ||
    rawBlocked === 1 ||
    rawBlocked === "true" ||
    rawBlocked === "1";

  const fromBlockers = activeBlockerReasonFromCard(card);
  if (!blocked && fromBlockers !== null) {
    blocked = true;
  }

  const rawReason =
    (typeof card.block_reason === "string" && card.block_reason) ||
    (typeof card.blockReason === "string" && card.blockReason) ||
    (typeof card.blocking_reason === "string" && card.blocking_reason) ||
    (typeof card.block_comment === "string" && card.block_comment) ||
    (fromBlockers !== null ? fromBlockers : "") ||
    "";

  const trimmed = rawReason.trim().slice(0, MAX_BLOCK_REASON_LEN);
  if (!blocked) {
    return { blocked: false, reason: null };
  }
  return { blocked: true, reason: trimmed.length > 0 ? trimmed : null };
}

export function normalizeKaitenBlockReasonInput(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().slice(0, MAX_BLOCK_REASON_LEN);
  return s.length > 0 ? s : null;
}
