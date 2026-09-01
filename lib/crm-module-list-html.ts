/**
 * HTML-кадр списка модуля: не React-дерево.
 * Держим в памяти модуля (как раньше listPageCache), без sessionStorage —
 * кадр большой для quota, а вкладка и так жива.
 *
 * Пилюли/ссылки в кадре кликабельны (обычные <a href>).
 * Полные файберы только у текущего модуля.
 */

import { CRM_MODULE_LIST_SNAPSHOT_MAX_BODY_ROWS } from "@/lib/crm-module-list-snapshot";

/** Потолок кадра: два модуля × ~400 КБ ≪ сотни МБ React. */
export const CRM_MODULE_LIST_HTML_MAX_CHARS = 400_000;

const htmlByPath = new Map<string, string>();

export function readCrmModuleListHtml(path: string): string | null {
  const html = htmlByPath.get(path);
  return html && html.length > 0 ? html : null;
}

export function rememberCrmModuleListHtml(
  path: string,
  html: string | null,
): void {
  const clean = path.startsWith("/") ? path : null;
  if (!clean) return;
  const sanitized = sanitizeCrmModuleListHtml(html);
  if (!sanitized) {
    htmlByPath.delete(clean);
    return;
  }
  htmlByPath.set(clean, sanitized);
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
