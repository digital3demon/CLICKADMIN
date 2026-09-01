/**
 * HTML-кадр списка модуля: не React-дерево.
 * Память модуля — мгновенный кадр; sessionStorage — тот же кадр после
 * 5–10 мин в другом модуле (Next сбрасывает RSC, Map теряется при remount).
 *
 * Пилюли/ссылки в кадре кликабельны (обычные <a href>).
 * Полные файберы только у текущего модуля.
 */

import { CRM_MODULE_LIST_SNAPSHOT_MAX_BODY_ROWS } from "@/lib/crm-module-list-snapshot";

/** Потолок кадра: два модуля × ~400 КБ ≪ сотни МБ React. */
export const CRM_MODULE_LIST_HTML_MAX_CHARS = 400_000;
export const CRM_MODULE_LIST_HTML_STORAGE_PREFIX = "dental-crm:list-html:v1:";

const htmlByPath = new Map<string, string>();

function htmlSessionKey(path: string): string {
  return CRM_MODULE_LIST_HTML_STORAGE_PREFIX + path;
}

function writeHtmlSession(path: string, html: string): void {
  if (typeof window === "undefined") return;
  const key = htmlSessionKey(path);
  const sizes = [html.length, 180_000, 90_000, 45_000];
  const seen = new Set<number>();
  for (const n of sizes) {
    if (seen.has(n)) continue;
    seen.add(n);
    const payload = n >= html.length ? html : html.slice(0, n);
    try {
      window.sessionStorage.setItem(key, payload);
      return;
    } catch {
      /* quota */
    }
    try {
      const prefix = CRM_MODULE_LIST_HTML_STORAGE_PREFIX;
      const drop: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i);
        if (k && k.startsWith(prefix) && k !== key) drop.push(k);
      }
      for (const k of drop) window.sessionStorage.removeItem(k);
      window.sessionStorage.setItem(key, payload);
      return;
    } catch {
      /* пробуем короче */
    }
  }
}

function readHtmlSession(path: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(htmlSessionKey(path));
    return raw && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

function dropHtmlSession(path: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(htmlSessionKey(path));
  } catch {
    /* private mode */
  }
}

export function readCrmModuleListHtml(path: string): string | null {
  const mem = htmlByPath.get(path);
  if (mem && mem.length > 0) return mem;
  const stored = readHtmlSession(path);
  if (stored) {
    htmlByPath.set(path, stored);
    return stored;
  }
  return null;
}

/** Заголовок loading.tsx без таблицы — не кадр списка. */
export function isCrmModuleListLoadingHtml(html: string | null | undefined): boolean {
  if (html == null || html.trim() === "") return true;
  if (/Загрузка списка/.test(html) && !/<table/i.test(html)) return true;
  return false;
}

export function rememberCrmModuleListHtml(
  path: string,
  html: string | null,
): void {
  const clean = path.startsWith("/") ? path : null;
  if (!clean) return;
  if (html == null) {
    htmlByPath.delete(clean);
    dropHtmlSession(clean);
    return;
  }
  const sanitized = sanitizeCrmModuleListHtml(html);
  if (!sanitized || isCrmModuleListLoadingHtml(sanitized)) {
    /* Пустой/loading при уходе с заказов не должен стирать рабочий кадр. */
    return;
  }
  htmlByPath.set(clean, sanitized);
  writeHtmlSession(clean, sanitized);
}

/** Только тесты: забыть Map, как после remount бандла. */
export function dropCrmModuleListHtmlMemory(path: string): void {
  htmlByPath.delete(path);
}

/**
 * Убирает script/обработчики, режет лишние ряды tbody.
 * Кириллица в тексте не трогаем — только теги и атрибуты.
 */
export function sanitizeCrmModuleListHtml(
  html: string | null | undefined,
): string | null {
  if (html == null) return null;
  let s = html.replace(/\u0000/g, "").trim();
  if (!s) return null;
  s = s.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "");
  s = s.replace(/<object\b[\s\S]*?<\/object>/gi, "");
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  s = trimTbodyRows(s, CRM_MODULE_LIST_SNAPSHOT_MAX_BODY_ROWS);
  if (s.length > CRM_MODULE_LIST_HTML_MAX_CHARS) {
    s = s.slice(0, CRM_MODULE_LIST_HTML_MAX_CHARS);
  }
  return s.trim() ? s : null;
}

function trimTbodyRows(html: string, maxRows: number): string {
  if (maxRows < 1 || html.length <= CRM_MODULE_LIST_HTML_MAX_CHARS / 2) {
    return html;
  }
  return html.replace(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/gi, (full, inner: string) => {
    const parts = inner.split(/<\/tr>/i);
    if (parts.length <= maxRows + 1) return full;
    const kept = parts.slice(0, maxRows).join("</tr>");
    const close = kept.trimEnd().toLowerCase().endsWith("</tr>") ? "" : "</tr>";
    const open = full.slice(0, full.indexOf(">") + 1);
    return `${open}${kept}${close}</tbody>`;
  });
}
