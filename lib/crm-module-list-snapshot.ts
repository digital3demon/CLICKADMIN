/**
 * Снимок списка модуля: sessionStorage, ключ = путь + отсортированный query.
 * Не БД и не localStorage — закрыли вкладку, кадры пропали.
 * TTL отсекает протухший JSON внутри той же вкладки.
 */

export const CRM_MODULE_LIST_SNAPSHOT_PREFIX = "dental-crm:list-snap:v2:";
export const CRM_MODULE_LIST_SNAPSHOT_TTL_MS = 2 * 60 * 60 * 1000;
export const CRM_MODULE_LIST_SNAPSHOT_MAX_ROWS = 150;
/** Сколько рядов tbody оставляем в HTML-кадре (шапка и фильтры целиком). */
export const CRM_MODULE_LIST_SNAPSHOT_MAX_BODY_ROWS = 80;
export const CRM_MODULE_LIST_PREFETCH_KEY = "dental-crm:list-prefetch:v1";
/** Один соседний список: второй prefetch снова кладёт Flight в память. */
export const CRM_MODULE_LIST_PREFETCH_MAX = 1;

export type CrmModuleListSnapshotRow = {
  id: string;
  orderNumber: string;
  patientName: string;
  doctorName: string;
  clinicName: string;
  columnTitle: string;
  payment: string;
};

export type CrmModuleListSnapshot = {
  savedAt: number;
  rows: CrmModuleListSnapshotRow[];
  /** outerHTML живой страницы (фильтры + таблица), не компактные 6 колонок. */
  html?: string;
};

/** Рамка ФинОтдела в loading — как ModuleFrame на живой странице. */
export const CRM_FINANCE_OFFICE_SNAPSHOT_FRAME =
  "[&_.module-frame-header]:hidden !px-2 !pb-6 !pt-4 sm:!px-3 sm:!pb-7 sm:!pt-5 md:!px-4 md:!pb-8 md:!pt-6 lg:!px-4 lg:!pb-9 lg:!pt-7";

/** Путь без хвоста `/`; query сортируется, кириллица канонизируется через URLSearchParams. */
export function crmModuleListSnapshotKey(pathname: string, search: string): string {
  const pathOnly = (pathname.split("?")[0] || "/").replace(/\/+$/, "") || "/";
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const kept = new URLSearchParams();
  for (const [k, v] of params.entries()) {
    if (v !== "") kept.append(k, v);
  }
  kept.sort();
  const q = kept.toString();
  return q ? `${pathOnly}?${q}` : pathOnly;
}

export function parseCrmModuleListSnapshot(
  raw: string | null,
  now = Date.now(),
): CrmModuleListSnapshot | null {
  if (raw == null || raw.trim() === "") return null;
  try {
    const parsed = JSON.parse(raw) as CrmModuleListSnapshot;
    const html =
      typeof parsed.html === "string" && parsed.html.trim() !== ""
        ? parsed.html
        : undefined;
    const rowsOk = Array.isArray(parsed.rows);
    if (
      !parsed ||
      typeof parsed.savedAt !== "number" ||
      !Number.isFinite(parsed.savedAt) ||
      (!rowsOk && !html)
    ) {
      return null;
    }
    if (now - parsed.savedAt > CRM_MODULE_LIST_SNAPSHOT_TTL_MS) return null;
    return {
      savedAt: parsed.savedAt,
      rows: rowsOk ? compactCrmModuleListRows(parsed.rows) : [],
      html,
    };
  } catch {
    return null;
  }
}

export function compactCrmModuleListRows(
  rows: readonly Partial<CrmModuleListSnapshotRow>[],
): CrmModuleListSnapshotRow[] {
  const out: CrmModuleListSnapshotRow[] = [];
  for (const r of rows) {
    if (out.length >= CRM_MODULE_LIST_SNAPSHOT_MAX_ROWS) break;
    const id = String(r.id ?? "").trim();
    if (!id) continue;
    out.push({
      id,
      orderNumber: String(r.orderNumber ?? ""),
      patientName: String(r.patientName ?? ""),
      doctorName: String(r.doctorName ?? ""),
      clinicName: String(r.clinicName ?? ""),
      columnTitle: String(r.columnTitle ?? ""),
      payment: String(r.payment ?? ""),
    });
  }
  return out;
}

export function readCrmModuleListSnapshot(key: string): CrmModuleListSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    return parseCrmModuleListSnapshot(
      window.sessionStorage.getItem(CRM_MODULE_LIST_SNAPSHOT_PREFIX + key),
    );
  } catch {
    return null;
  }
}

export function writeCrmModuleListSnapshot(
  key: string,
  rows: readonly Partial<CrmModuleListSnapshotRow>[],
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: CrmModuleListSnapshot = {
      savedAt: Date.now(),
      rows: compactCrmModuleListRows(rows),
    };
    window.sessionStorage.setItem(
      CRM_MODULE_LIST_SNAPSHOT_PREFIX + key,
      JSON.stringify(payload),
    );
    rememberCrmModuleListPrefetchHref(key);
  } catch {
    /* quota / private mode */
  }
}

export function rememberCrmModuleListPrefetchHref(href: string): void {
  if (typeof window === "undefined") return;
  const clean = href.trim();
  if (!clean.startsWith("/")) return;
  try {
    const prev = readCrmModuleListPrefetchHrefs();
    const next = [clean, ...prev.filter((h) => h !== clean)].slice(
      0,
      CRM_MODULE_LIST_PREFETCH_MAX,
    );
    window.sessionStorage.setItem(CRM_MODULE_LIST_PREFETCH_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export function readCrmModuleListPrefetchHrefs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(CRM_MODULE_LIST_PREFETCH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((h): h is string => typeof h === "string" && h.startsWith("/"))
      .slice(0, CRM_MODULE_LIST_PREFETCH_MAX);
  } catch {
    return [];
  }
}

/** Список модуля для keep-alive: без карточки наряда и без истории. Query не входит — возвращаем последний визит модуля. */
export function crmModuleListKeepAlivePath(pathname: string): string | null {
  const p = (pathname.split("?")[0] || "/").replace(/\/+$/, "") || "/";
  if (p === "/finance-office") return p;
  if (p === "/orders" || p === "/shipments") return p;
  return null;
}

export function crmModuleTitleForPath(pathname: string): string {
  const p = (pathname.split("?")[0] || "/").replace(/\/+$/, "") || "/";
  if (p.startsWith("/finance-office")) return "ФинОтдел";
  if (p.startsWith("/orders/history")) return "История изменений";
  if (p === "/orders" || p === "/shipments" || p.startsWith("/shipments")) {
    return "Заказы";
  }
  if (p.startsWith("/orders/")) return "Наряд";
  if (p.startsWith("/kanban")) return "Канбан";
  if (p.startsWith("/analytics")) return "Аналитика";
  if (p.startsWith("/payroll")) return "Зарплата";
  if (p.startsWith("/clickmig")) return "КликМиг";
  if (p.startsWith("/mail")) return "Почта";
  if (p.startsWith("/warehouse")) return "Склад";
  if (p.startsWith("/work-examples")) return "Примеры работ";
  if (p.startsWith("/protocols")) return "Протоколы и справочники";
  if (p.startsWith("/clients")) return "Клиенты";
  if (p.startsWith("/directory")) return "Конфигурация";
  if (p.startsWith("/ai-admin")) return "ИИ-Админ";
  return "CRM";
}
