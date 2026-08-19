/**
 * Сброс пароля по коду от владельца (не лаб-срок / не почтовая ссылка).
 * Код — тот же формат, что приглашение: 10 символов A–F0–9.
 */
import { generateInviteCodePlain, normalizeInviteCodeInput } from "@/lib/auth/invite-code";

/** Код сброса живёт 24 часа с момента генерации. */
export const PASSWORD_RESET_TTL_MS = 24 * 60 * 60 * 1000;

export function generatePasswordResetCodePlain(): string {
  return generateInviteCodePlain();
}

export function normalizePasswordResetCodeInput(raw: string): string {
  const compact = normalizeInviteCodeInput(raw);
  if (/^[A-F0-9]{10}$/.test(compact)) return compact;
  // Кириллица не \b: 10 hex с явными границами (не буква/цифра Unicode).
  const m = raw
    .toUpperCase()
    .match(/(?:^|[^\p{L}\p{N}])([A-F0-9]{10})(?:$|[^\p{L}\p{N}])/u);
  return m?.[1] ?? compact;
}

/** Для показа владельцу / копирования в мессенджер. */
export function formatPasswordResetCodeForDisplay(code: string): string {
  const n = normalizePasswordResetCodeInput(code);
  return n.replace(/(.{2})/g, "$1 ").trim();
}

export function isPasswordResetCodeFormat(code: string): boolean {
  return /^[A-F0-9]{10}$/.test(code);
}

export function passwordResetExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + PASSWORD_RESET_TTL_MS);
}

export function isPasswordResetExpired(
  expiresAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() <= now.getTime();
}
