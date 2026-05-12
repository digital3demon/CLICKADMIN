export const THEME_STORAGE_KEY = "click-admin-theme" as const;
export const THEME_COOKIE_KEY = "click-admin-theme" as const;

export type ThemePreference = "light" | "dark" | "system";

export function isThemePreference(v: string | null): v is ThemePreference {
  return v === "light" || v === "dark" || v === "system";
}

export function readThemePreferenceFromLocalStorage(): ThemePreference | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeThemePreferenceToLocalStorage(pref: ThemePreference): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* приватный режим / запрет storage */
  }
  try {
    document.cookie = `${THEME_COOKIE_KEY}=${encodeURIComponent(
      pref,
    )}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    /* браузер запретил cookie */
  }
}

export function computeResolvedDark(
  pref: ThemePreference,
  systemIsDark: boolean,
): boolean {
  if (pref === "dark") return true;
  if (pref === "light") return false;
  return systemIsDark;
}

/** Скрипт для ранней установки темы — синхронно до первой отрисовки. */
export const THEME_BOOTSTRAP_INLINE_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var ck=${JSON.stringify(
  THEME_COOKIE_KEY,
)};var v=localStorage.getItem(k);if(v!=="dark"&&v!=="light"&&v!=="system"){var m=document.cookie.match(new RegExp("(?:^|; )"+ck.replace(/[.$?*|{}()\\[\\]\\\\\\/\\+^]/g,"\\\\$&")+"=([^;]*)"));v=m?decodeURIComponent(m[1]):null;}var d;if(v==="dark")d=!0;else if(v==="light")d=!1;else d=window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;
