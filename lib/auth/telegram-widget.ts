import crypto from "node:crypto";

/** Поля, которые присылает виджет Telegram Login (кроме hash). */
export type TelegramWidgetAuthPayload = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

const MAX_AUTH_AGE_SEC = 86400;

/** Поля, участвующие в data-check-string по документации Telegram Login. */
const TELEGRAM_LOGIN_SIGNED_KEYS = new Set([
  "id",
  "first_name",
  "last_name",
  "username",
  "photo_url",
  "auth_date",
]);

function buildDataCheckString(
  payload: Record<string, string | number | undefined>,
): string {
  const entries = Object.entries(payload)
    .filter(
      ([k, v]) =>
        TELEGRAM_LOGIN_SIGNED_KEYS.has(k) &&
        v !== undefined &&
        v !== null &&
        k !== "hash",
    )
    .map(([k, v]) => [k, String(v)] as [string, string])
    .sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([k, v]) => `${k}=${v}`).join("\n");
}

/** SHA256(bot_token) — секрет для HMAC по документации Telegram. */
function secretKeyBytes(botToken: string): Buffer {
  return crypto.createHash("sha256").update(botToken, "utf8").digest();
}

/**
 * Проверка подписи виджета Login: https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramWidgetAuth(
  raw: Record<string, unknown>,
  botToken: string,
): TelegramWidgetAuthPayload | null {
  const hash = raw.hash;
  if (typeof hash !== "string" || !hash) return null;
  const id = raw.id;
  if (typeof id !== "number" && typeof id !== "string") return null;
  const authDate = raw.auth_date;
  if (typeof authDate !== "number" && typeof authDate !== "string") return null;
  const authNum =
    typeof authDate === "number" ? authDate : Number.parseInt(String(authDate), 10);
  if (!Number.isFinite(authNum)) return null;
  const now = Math.floor(Date.now() / 1000);
  if (now - authNum > MAX_AUTH_AGE_SEC) return null;

  const normalized: Record<string, string | number | undefined> = {
    id: typeof id === "number" ? id : Number.parseInt(String(id), 10),
    auth_date: authNum,
  };
  if (typeof raw.first_name === "string") normalized.first_name = raw.first_name;
  if (typeof raw.last_name === "string") normalized.last_name = raw.last_name;
  if (typeof raw.username === "string") normalized.username = raw.username;
  if (typeof raw.photo_url === "string") normalized.photo_url = raw.photo_url;

  const dataCheckString = buildDataCheckString(normalized);
  const sk = secretKeyBytes(botToken);
  const mac = crypto.createHmac("sha256", sk).update(dataCheckString).digest("hex");
  if (mac !== hash) return null;

  return {
    id: normalized.id as number,
    first_name: normalized.first_name as string | undefined,
    last_name: normalized.last_name as string | undefined,
    username: normalized.username as string | undefined,
    photo_url: normalized.photo_url as string | undefined,
    auth_date: authNum,
    hash,
  };
}

export function telegramIdString(id: number): string {
  return String(Math.trunc(id));
}
