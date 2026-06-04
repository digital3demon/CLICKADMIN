export const UI_DESIGN_STORAGE_KEY = "click-admin-ui-design" as const;
export const UI_DESIGN_COOKIE_KEY = "click-admin-ui-design" as const;
export const UI_DESIGN_CLIENT_STATE_KEY = "ui-design" as const;

export type UiDesign = "classic" | "harmony";

export function isUiDesign(v: string | null): v is UiDesign {
  return v === "classic" || v === "harmony";
}

export const DEFAULT_UI_DESIGN: UiDesign = "classic";

export function readUiDesignFromLocalStorage(): UiDesign | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(UI_DESIGN_STORAGE_KEY);
    return isUiDesign(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeUiDesignToLocalStorage(design: UiDesign): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(UI_DESIGN_STORAGE_KEY, design);
  } catch {
    /* private mode */
  }
  try {
    document.cookie = `${UI_DESIGN_COOKIE_KEY}=${encodeURIComponent(
      design,
    )}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    /* cookie blocked */
  }
  try {
    document.documentElement.dataset.ui = design;
  } catch {
    /* ignore */
  }
}

/** Скрипт до первой отрисовки — вместе с темой в layout. */
export const UI_DESIGN_BOOTSTRAP_INLINE_SCRIPT = `(function(){try{var k=${JSON.stringify(
  UI_DESIGN_STORAGE_KEY,
)};var ck=${JSON.stringify(UI_DESIGN_COOKIE_KEY)};var v=localStorage.getItem(k);if(v!=="classic"&&v!=="harmony"){var m=document.cookie.match(new RegExp("(?:^|; )"+ck.replace(/[.$?*|{}()\\[\\]\\\\\\/\\+^]/g,"\\\\$&")+"=([^;]*)"));v=m?decodeURIComponent(m[1]):null;}if(v!=="classic"&&v!=="harmony")v="classic";document.documentElement.dataset.ui=v;}catch(e){try{document.documentElement.dataset.ui="classic";}catch(x){}}})();`;
