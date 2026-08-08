/**
 * Параметры запуска Mini App из URL (hash / query), без telegram-web-app.js.
 * @see https://docs.telegram-mini-apps.com/platform/launch-parameters
 */

function parseHashParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  const hash = window.location.hash.replace(/^#/, "").trim();
  if (!hash) return new URLSearchParams();
  // Иногда hash = "tgWebAppData=..." без ведущего "?"
  try {
    return new URLSearchParams(hash.startsWith("?") ? hash.slice(1) : hash);
  } catch {
    return new URLSearchParams();
  }
}

/** initData для проверки на сервере (как Telegram.WebApp.initData). */
export function readTelegramWebAppInitData(): string {
  if (typeof window === "undefined") return "";
  const fromApi = window.Telegram?.WebApp?.initData?.trim();
  if (fromApi) return fromApi;

  const hash = parseHashParams();
  const fromHash = hash.get("tgWebAppData");
  if (fromHash) {
    // URLSearchParams уже декодирует один раз
    return fromHash.trim();
  }

  const q = new URLSearchParams(window.location.search);
  return q.get("tgWebAppData")?.trim() || "";
}

/** startapp / start_param из ссылки t.me/...?...startapp= */
export function readTelegramWebAppStartParam(): string | null {
  if (typeof window === "undefined") return null;

  const fromUnsafe = window.Telegram?.WebApp?.initDataUnsafe?.start_param?.trim();
  if (fromUnsafe) return fromUnsafe;

  const q = new URLSearchParams(window.location.search);
  const fromQuery =
    q.get("tgWebAppStartParam")?.trim() ||
    q.get("startapp")?.trim() ||
    null;
  if (fromQuery) return fromQuery;

  const hash = parseHashParams();
  const fromHash = hash.get("tgWebAppStartParam")?.trim();
  if (fromHash) return fromHash;

  // Иногда start_param лежит внутри initData (query-string)
  const initData = readTelegramWebAppInitData();
  if (initData) {
    try {
      const p = new URLSearchParams(initData).get("start_param")?.trim();
      if (p) return p;
    } catch {
      /* ignore */
    }
  }

  return null;
}

export function tryTelegramWebAppReadyExpand(): void {
  const wa = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
  if (!wa) return;
  try {
    wa.ready();
    wa.expand();
  } catch {
    /* ignore */
  }
}
