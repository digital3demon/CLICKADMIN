import crypto from "node:crypto";

/** Проверенные данные Telegram WebApp initData. */
export type TelegramWebAppInitData = {
  authDate: number;
  userId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  startParam?: string;
  /** Сырой query-string без hash — для отладки. */
  raw: string;
};

const MAX_AUTH_AGE_SEC = 86400;

/**
 * Секрет для WebApp: HMAC_SHA256(bot_token, "WebAppData").
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function webAppSecretKey(botToken: string): Buffer {
  return crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
}

function parseInitDataQuery(initData: string): URLSearchParams | null {
  const raw = String(initData || "").trim();
  if (!raw) return null;
  try {
    return new URLSearchParams(raw);
  } catch {
    return null;
  }
}

/**
 * Проверка подписи `Telegram.WebApp.initData`.
 * Возвращает null при неверной подписи, просроченном auth_date или отсутствии user.id.
 */
export function verifyTelegramWebAppInitData(
  initData: string,
  botToken: string,
): TelegramWebAppInitData | null {
  const token = String(botToken || "").trim();
  if (!token) return null;

  const params = parseInitDataQuery(initData);
  if (!params) return null;

  const hash = params.get("hash");
  if (!hash) return null;

  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secret = webAppSecretKey(token);
  const mac = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");
  if (mac !== hash) return null;

  const authDateRaw = params.get("auth_date");
  const authDate = authDateRaw ? Number.parseInt(authDateRaw, 10) : NaN;
  if (!Number.isFinite(authDate)) return null;
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > MAX_AUTH_AGE_SEC) return null;

  const userRaw = params.get("user");
  if (!userRaw) return null;
  let user: {
    id?: number;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  try {
    user = JSON.parse(userRaw) as typeof user;
  } catch {
    return null;
  }
  const userId = typeof user.id === "number" ? user.id : Number(user.id);
  if (!Number.isFinite(userId)) return null;

  const startParam = params.get("start_param")?.trim() || undefined;

  return {
    authDate,
    userId: Math.trunc(userId),
    username: typeof user.username === "string" ? user.username : undefined,
    firstName: typeof user.first_name === "string" ? user.first_name : undefined,
    lastName: typeof user.last_name === "string" ? user.last_name : undefined,
    startParam,
    raw: String(initData).trim(),
  };
}
