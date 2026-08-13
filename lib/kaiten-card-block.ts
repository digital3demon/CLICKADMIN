const MAX_BLOCK_REASON_LEN = 2000;

function parseTimeMs(value: unknown): number | null {
  if (typeof value === "string" && value.trim()) {
    const t = Date.parse(value);
    if (!Number.isNaN(t)) return t;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 1e12) return Math.round(value);
    if (value > 1e9) return Math.round(value * 1000);
  }
  return null;
}

function unreleasedBlockers(card: Record<string, unknown>): Record<string, unknown>[] {
  const raw = card.blockers;
  if (!Array.isArray(raw)) return [];
  const out: Record<string, unknown>[] = [];
  for (const row of raw) {
    if (row == null || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    if (o.released === true) continue;
    out.push(o);
  }
  return out;
}

function blockerReasonTrim(o: Record<string, unknown>): string {
  const r =
    (typeof o.reason === "string" && o.reason) ||
    (typeof o.block_reason === "string" && o.block_reason) ||
    "";
  return r.trim();
}

function blockerTimeMs(o: Record<string, unknown>): number | null {
  for (const key of [
    "updated",
    "updated_at",
    "created",
    "created_at",
    "blocked_at",
    "start_time",
    "startTime",
  ]) {
    const ms = parseTimeMs(o[key]);
    if (ms != null) return ms;
  }
  return null;
}

/** Активный блокировщик с максимальным временем; при равенстве — последний в массиве API. */
function pickLatestActiveBlocker(
  blockers: Record<string, unknown>[],
): Record<string, unknown> | null {
  if (blockers.length === 0) return null;
  const scored = blockers.map((o, index) => ({
    o,
    index,
    ms: blockerTimeMs(o),
  }));
  scored.sort((a, b) => {
    if (a.ms != null && b.ms != null) return b.ms - a.ms;
    if (a.ms != null) return -1;
    if (b.ms != null) return 1;
    return b.index - a.index;
  });
  return scored[0]!.o;
}

function cardLevelBlockedAtMs(card: Record<string, unknown>): number | null {
  for (const key of [
    "blocked_at",
    "blockedAt",
    "block_started_at",
    "blocked_since",
    "blockedSince",
  ]) {
    const ms = parseTimeMs(card[key]);
    if (ms != null) return ms;
  }
  return null;
}

function resolveBlockedReason(
  card: Record<string, unknown>,
  blockers: Record<string, unknown>[],
  latest: Record<string, unknown> | null,
): string {
  if (latest) {
    const t = blockerReasonTrim(latest);
    if (t) return t.slice(0, MAX_BLOCK_REASON_LEN);
  }
  const fromCard =
    (typeof card.block_reason === "string" && card.block_reason.trim()) ||
    (typeof card.blockReason === "string" && card.blockReason.trim()) ||
    (typeof card.blocking_reason === "string" && card.blocking_reason.trim()) ||
    (typeof card.block_comment === "string" && card.block_comment.trim()) ||
    "";
  if (fromCard) return fromCard.slice(0, MAX_BLOCK_REASON_LEN);
  for (const o of blockers) {
    const t = blockerReasonTrim(o);
    if (t) return t.slice(0, MAX_BLOCK_REASON_LEN);
  }
  return "";
}

export type KaitenBlockedMeta = {
  blocked: boolean;
  reason: string | null;
  /** ISO UTC, если API отдал время начала блокировки */
  blockedAtIso: string | null;
};

/**
 * Читает блокировку из ответа GET/PATCH `/cards/{id}` (Kaiten API v1).
 * Явный `blocked: false` с Kaiten — всегда снятие (не воскрешаем из устаревших blockers[]).
 * Если флага нет — смотрим активные `blockers`.
 */
export function kaitenBlockedMetaFromCard(card: Record<string, unknown>): KaitenBlockedMeta {
  const rawBlocked =
    card.blocked ??
    card.is_blocked ??
    card.blocked_state ??
    card.blocking;

  const hasExplicitFlag = rawBlocked !== undefined && rawBlocked !== null;
  const explicitFalse =
    rawBlocked === false ||
    rawBlocked === 0 ||
    rawBlocked === "false" ||
    rawBlocked === "0";
  const explicitTrue =
    rawBlocked === true ||
    rawBlocked === 1 ||
    rawBlocked === "true" ||
    rawBlocked === "1";

  /* Снятие в UI Kaiten часто оставляет «висячие» blockers — доверяем флагу. */
  if (hasExplicitFlag && explicitFalse) {
    return { blocked: false, reason: null, blockedAtIso: null };
  }

  const blockers = unreleasedBlockers(card);
  let blocked = explicitTrue;
  if (!hasExplicitFlag && blockers.length > 0) {
    blocked = true;
  }

  const latest = pickLatestActiveBlocker(blockers);
  const trimmed = resolveBlockedReason(card, blockers, latest).trim();

  let blockedAtIso: string | null = null;
  if (latest) {
    const ms = blockerTimeMs(latest);
    if (ms != null) blockedAtIso = new Date(ms).toISOString();
  }
  if (blockedAtIso == null && blocked) {
    const cardMs = cardLevelBlockedAtMs(card);
    if (cardMs != null) blockedAtIso = new Date(cardMs).toISOString();
  }

  if (!blocked) {
    return { blocked: false, reason: null, blockedAtIso: null };
  }
  return {
    blocked: true,
    reason: trimmed.length > 0 ? trimmed : null,
    blockedAtIso,
  };
}

export function kaitenBlockStateFromCard(
  card: Record<string, unknown>,
): { blocked: boolean; reason: string | null } {
  const m = kaitenBlockedMetaFromCard(card);
  return { blocked: m.blocked, reason: m.reason };
}

export function normalizeKaitenBlockReasonInput(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().slice(0, MAX_BLOCK_REASON_LEN);
  return s.length > 0 ? s : null;
}
