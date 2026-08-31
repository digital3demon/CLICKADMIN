/**
 * Когда список/чипы имеют право на router.refresh:
 * канбан → CRM (тосты/inbox) — сразу; Kaiten — только если реально что-то импортировал.
 */

/** Интервал лёгкого GET /api/order-notifications/toasts (без Kaiten). */
export function orderCorrectionToastPollMs(raw?: string | null): number {
  const n =
    raw != null && String(raw).trim()
      ? Number.parseInt(String(raw).trim(), 10)
      : 4_000;
  if (!Number.isFinite(n)) return 4_000;
  return Math.min(Math.max(n, 3_000), 60_000);
}

/** Фон titles-sync на списках — редко; шапка наряда использует kaitenClientPollIntervalMs. */
export function kaitenListTitlesPollIntervalMs(raw?: string | null): number {
  const n =
    raw != null && String(raw).trim()
      ? Number.parseInt(String(raw).trim(), 10)
      : 45_000;
  if (!Number.isFinite(n)) return 45_000;
  return Math.min(Math.max(n, 20_000), 180_000);
}

const LIST_PATHS = new Set(["/orders", "/finance-office", "/shipments"]);

/** После клика в меню не гонять второй SSR списка, пока модуль ещё рисуется. */
export const TOAST_LIST_REFRESH_QUIET_AFTER_NAV_MS = 8_000;

export function toastListRefreshAllowedAfterNav(
  lastNavAt: number,
  now = Date.now(),
): boolean {
  if (!Number.isFinite(lastNavAt) || lastNavAt <= 0) return true;
  return now - lastNavAt >= TOAST_LIST_REFRESH_QUIET_AFTER_NAV_MS;
}

/** Чипы корр/протетики/упоминаний живут на этих экранах — не refresh формы наряда. */
export function toastFingerprintShouldRefreshListPath(pathname: string): boolean {
  const p = pathname.split("?")[0]?.replace(/\/$/, "") || "/";
  if (LIST_PATHS.has(p)) return true;
  if (p.startsWith("/finance-office/")) return true;
  if (p.startsWith("/shipments/")) return true;
  return false;
}

/**
 * Первый снимок тостов не refresh (иначе каждый заход на /orders).
 * Дальше — только смена id / счётчика упоминаний (текст «коррекция от 10.02» в id не входит).
 */
export function shouldRefreshListFromToastFingerprint(
  prevFp: string,
  nextFp: string,
): boolean {
  if (!nextFp) return false;
  if (!prevFp) return false;
  return prevFp !== nextFp;
}

export function shouldRefreshListFromKaitenPoll(opts: {
  importHit: boolean;
  mentionChanged: boolean;
  listUiChanged: boolean;
}): boolean {
  return opts.importHit || opts.mentionChanged || opts.listUiChanged;
}

/**
 * Фон не пишет колонку/дорожку/sort. Расхождение с Kaiten — не повод update + refresh.
 */
export function kaitenBackgroundShouldWriteOrder(opts: {
  applyColumnFromKaiten: boolean;
  sameTitle: boolean;
  sameDescription: boolean;
  sameBlock: boolean;
  sameSort: boolean;
  sameUrgent: boolean;
  sameLane: boolean;
}): boolean {
  if (!opts.applyColumnFromKaiten) {
    return !opts.sameDescription || !opts.sameUrgent;
  }
  return (
    !opts.sameTitle ||
    !opts.sameDescription ||
    !opts.sameBlock ||
    !opts.sameSort ||
    !opts.sameUrgent ||
    !opts.sameLane
  );
}

export function kaitenWrittenFieldsListUiChanged(opts: {
  sameDescription: boolean;
  sameUrgent: boolean;
  wroteBlock: boolean;
}): boolean {
  return !opts.sameDescription || !opts.sameUrgent || opts.wroteBlock;
}
