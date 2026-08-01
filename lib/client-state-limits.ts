/** Лимит JSON-тела PUT /api/client-state (байты UTF-8).
 *  ~850KB уже валит прокси/Node на Timeweb; держим запас под slim-снимок канбана. */
export const CLIENT_STATE_MAX_JSON_BYTES = 600_000;

export function jsonUtf8ByteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

export function clientStatePayloadTooLarge(
  scope: string,
  key: string,
  value: unknown,
  maxBytes = CLIENT_STATE_MAX_JSON_BYTES,
): { tooLarge: true; bytes: number } | { tooLarge: false; bytes: number } {
  const bytes = jsonUtf8ByteLength({ scope, key, value });
  if (bytes > maxBytes) return { tooLarge: true, bytes };
  return { tooLarge: false, bytes };
}
