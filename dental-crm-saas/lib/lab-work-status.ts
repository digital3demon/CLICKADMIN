/** Порядок этапов как колонки в Kaiten (слева направо). «Отправлено» — отдельный флаг `adminShippedOtpr`, не значение enum. */
export const LAB_WORK_STATUS_ORDER = [
  "TO_SCAN",
  "TO_EXECUTION",
  "APPROVAL",
  "PRODUCTION",
  "ASSEMBLY",
  "PROCESSING",
  "MANUAL",
  "TO_REVIEW",
  "TO_ADMINS",
] as const;

export type LabWorkStatus = (typeof LAB_WORK_STATUS_ORDER)[number];

/** Этап по умолчанию для новых нарядов (форма, API, колонка в БД при отсутствии значения). */
export const LAB_WORK_STATUS_DEFAULT: LabWorkStatus = "TO_EXECUTION";

export const LAB_WORK_STATUS_LABELS: Record<LabWorkStatus, string> = {
  TO_SCAN: "На скан",
  TO_EXECUTION: "К исполнению",
  APPROVAL: "Согласование",
  PRODUCTION: "Производство",
  ASSEMBLY: "Сборка",
  PROCESSING: "Обработка",
  MANUAL: "Мануал",
  TO_REVIEW: "На проверку",
  TO_ADMINS: "Сдана админам",
};

/** Цвет пилюли статуса в шапке наряда / меню */
export const LAB_WORK_STATUS_PILL_STYLES: Record<LabWorkStatus, string> = {
  TO_SCAN:
    "bg-slate-100 text-slate-950 ring-1 ring-slate-400/55 hover:bg-slate-200/90",
  TO_EXECUTION:
    "bg-sky-100 text-sky-950 ring-1 ring-sky-400/55 hover:bg-sky-200/90",
  APPROVAL:
    "bg-violet-100 text-violet-950 ring-1 ring-violet-400/55 hover:bg-violet-200/90",
  PRODUCTION:
    "bg-amber-100 text-amber-950 ring-1 ring-amber-400/60 hover:bg-amber-200/90",
  ASSEMBLY:
    "bg-teal-100 text-teal-950 ring-1 ring-teal-400/55 hover:bg-teal-200/90",
  PROCESSING:
    "bg-cyan-100 text-cyan-950 ring-1 ring-cyan-400/55 hover:bg-cyan-200/90",
  MANUAL:
    "bg-indigo-100 text-indigo-950 ring-1 ring-indigo-400/55 hover:bg-indigo-200/90",
  TO_REVIEW:
    "bg-fuchsia-100 text-fuchsia-950 ring-1 ring-fuchsia-400/55 hover:bg-fuchsia-200/90",
  TO_ADMINS:
    "bg-orange-100 text-orange-950 ring-1 ring-orange-400/55 hover:bg-orange-200/90",
};

export function isLabWorkStatus(v: string): v is LabWorkStatus {
  return (LAB_WORK_STATUS_ORDER as readonly string[]).includes(v);
}

/** Миграция со старых значений Prisma (до смены воронки). */
export function normalizeLegacyLabWorkStatus(raw: string): LabWorkStatus {
  if (isLabWorkStatus(raw)) return raw;
  if (raw === "SENT") return "TO_ADMINS";
  return LAB_WORK_STATUS_DEFAULT;
}
