/** Карта модуля: корзина 5 суток, подписи в МСК, даты в БД — ISO DateTime. */

export const WORK_EXAMPLE_TRASH_DAYS = 5;
export const WORK_EXAMPLE_TRASH_MS = WORK_EXAMPLE_TRASH_DAYS * 24 * 60 * 60 * 1000;
export const WORK_EXAMPLE_MAX_FILE_BYTES = 25 * 1024 * 1024;
/** CLI d3d-html-export: AGENTS.md рекомендует 120–300 с. */
export const D3D_HTML_EXPORT_TIMEOUT_MS = 300_000;
export const WORK_EXAMPLE_MAX_FILES_PER_UPLOAD = 40;

export const WORK_EXAMPLE_FILE_KINDS = ["PHOTO", "CAD", "FILE"] as const;
export type WorkExampleFileKindValue = (typeof WORK_EXAMPLE_FILE_KINDS)[number];

export const WORK_EXAMPLE_TITLE_MAX = 160;
export const WORK_EXAMPLE_SHOWCASE_NAME_MAX = 120;
export const WORK_EXAMPLE_SHOWCASE_LOGO_MAX_BYTES = 2 * 1024 * 1024;
/** Как карточки канбана: TenantClientState, ключ тенанта. Имя и путь лого — не ПИИ. */
export const WORK_EXAMPLE_SHOWCASE_STATE_KEY = "workExampleShowcaseV1";

export function parseWorkExampleTitle(raw: unknown): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, WORK_EXAMPLE_TITLE_MAX);
}

/** Имя на витрине. Не `\b`: кириллица и пробелы вокруг не обрезаем криво. */
export function parseWorkExampleShowcaseName(raw: unknown): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, WORK_EXAMPLE_SHOWCASE_NAME_MAX);
}

/** Своё имя витрины, иначе имя тенанта, иначе «Лаборатория». */
export function resolveWorkExampleShowcaseName(
  displayName: unknown,
  tenantName: unknown,
): string {
  const custom = parseWorkExampleShowcaseName(displayName);
  if (custom) return custom;
  const tenant = String(tenantName ?? "").replace(/\s+/g, " ").trim();
  return tenant || "Лаборатория";
}

export type WorkExampleShowcaseBrand = {
  displayName: string;
  logoRelPath: string | null;
  logoMime: string | null;
};

export function parseWorkExampleShowcaseBrand(raw: unknown): WorkExampleShowcaseBrand {
  const o =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const rel = String(o.logoRelPath || "").trim();
  const mime = String(o.logoMime || "").trim().toLowerCase();
  return {
    displayName: parseWorkExampleShowcaseName(o.displayName),
    logoRelPath: rel && !rel.includes("..") ? rel.slice(0, 240) : null,
    logoMime: mime.startsWith("image/") ? mime.slice(0, 80) : null,
  };
}

export type WorkExampleCardTypeSnap = { id: string; name: string };

export type WorkExampleCompositionLine = {
  name: string;
  quantity: number;
  unitPriceRub: number;
  lineTotalRub: number;
};
