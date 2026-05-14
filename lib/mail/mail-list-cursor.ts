export type MailListCursorPayload = { r: string; i: string };

export const MAIL_LIST_PAGE_SIZE_MIN = 20;
export const MAIL_LIST_PAGE_SIZE_MAX = 150;
export const MAIL_LIST_DEFAULT_PAGE_SIZE = 80;

export function clampMailPageSize(raw: string | number | null | undefined): number {
  const n = raw == null || raw === "" ? MAIL_LIST_DEFAULT_PAGE_SIZE : Number(raw);
  if (!Number.isFinite(n)) return MAIL_LIST_DEFAULT_PAGE_SIZE;
  return Math.min(MAIL_LIST_PAGE_SIZE_MAX, Math.max(MAIL_LIST_PAGE_SIZE_MIN, Math.floor(n)));
}

export function encodeMailListCursor(receivedAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ r: receivedAt.toISOString(), i: id }), "utf8").toString(
    "base64url",
  );
}

export function decodeMailListCursor(raw: string | null | undefined): MailListCursorPayload | null {
  if (!raw?.trim()) return null;
  try {
    const decoded = JSON.parse(Buffer.from(raw.trim(), "base64url").toString("utf8")) as unknown;
    if (!decoded || typeof decoded !== "object") return null;
    const r = (decoded as Record<string, unknown>).r;
    const i = (decoded as Record<string, unknown>).i;
    if (typeof r !== "string" || typeof i !== "string" || !i.trim()) return null;
    const d = new Date(r);
    if (Number.isNaN(d.getTime())) return null;
    return { r, i: i.trim() };
  } catch {
    return null;
  }
}
