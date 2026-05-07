/**
 * Публичная ссылка на сообщение в супергруппе (бот должен быть участником; пользователь — тоже).
 * Формат: https://t.me/c/<internal>/<messageId>
 */
export function telegramSupergroupMessagePublicUrl(
  telegramChatIdStr: string,
  messageId: number,
): string | null {
  if (!Number.isFinite(messageId) || messageId <= 0) return null;
  const raw = telegramChatIdStr.trim();
  const m = /^-100(\d+)$/.exec(raw);
  if (!m) return null;
  return `https://t.me/c/${m[1]}/${Math.trunc(messageId)}`;
}
