/** Kill switch и пауза фонового inbound sync members (не трогает outbound по действию пользователя). */
export function kaitenMembersSyncEnabled(): boolean {
  const raw = process.env.KAITEN_MEMBERS_SYNC_ENABLED?.trim().toLowerCase();
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return true;
}

export function kaitenMembersInboundGapMs(): number {
  const raw = process.env.KAITEN_MEMBERS_INBOUND_GAP_MS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 45_000;
  if (!Number.isFinite(n)) return 45_000;
  return Math.min(Math.max(n, 30_000), 120_000);
}

export const KAITEN_USERS_DIRECTORY_KEY = "kaitenUsersDirectoryV1";
export const KAITEN_USERS_DIRECTORY_TTL_MS = 24 * 60 * 60 * 1000;

export const KAITEN_MEMBERS_CURSOR_KEY = "kaitenMembersInboundCursorV1";
export const KAITEN_MEMBERS_THROTTLE_KEY = "kaitenMembersNextAllowedAt";
export const KAITEN_MEMBERS_BACKOFF_KEY = "kaitenMembersBackoffUntil";
