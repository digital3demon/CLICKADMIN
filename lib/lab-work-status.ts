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

/**
 * Пилюли этапов лаборатории: приглушённые тона, без красного и «сигнальных» (жёлтый/оранжевый).
 * «К исполнению» — светло-серый; «Сдана админам» — зелёный.
 */
export const LAB_WORK_STATUS_PILL_STYLES: Record<LabWorkStatus, string> = {
  TO_SCAN:
    "bg-slate-200/80 text-slate-700 ring-1 ring-slate-300/55 hover:bg-slate-200 dark:bg-slate-700/40 dark:text-slate-200 dark:ring-slate-500/40",
  TO_EXECUTION:
    "bg-zinc-200/75 text-zinc-600 ring-1 ring-zinc-300/50 hover:bg-zinc-200/90 dark:bg-zinc-700/35 dark:text-zinc-300 dark:ring-zinc-500/35",
  APPROVAL:
    "bg-violet-100/90 text-violet-800 ring-1 ring-violet-300/50 hover:bg-violet-100 dark:bg-violet-950/35 dark:text-violet-300 dark:ring-violet-600/40",
  PRODUCTION:
    "bg-stone-200/80 text-stone-700 ring-1 ring-stone-300/50 hover:bg-stone-200 dark:bg-stone-700/35 dark:text-stone-300 dark:ring-stone-500/35",
  ASSEMBLY:
    "bg-teal-100/85 text-teal-800 ring-1 ring-teal-300/45 hover:bg-teal-100 dark:bg-teal-950/30 dark:text-teal-300 dark:ring-teal-600/35",
  PROCESSING:
    "bg-cyan-100/80 text-cyan-800 ring-1 ring-cyan-300/45 hover:bg-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-300 dark:ring-cyan-600/35",
  MANUAL:
    "bg-indigo-100/85 text-indigo-800 ring-1 ring-indigo-300/45 hover:bg-indigo-100 dark:bg-indigo-950/35 dark:text-indigo-300 dark:ring-indigo-600/40",
  TO_REVIEW:
    "bg-purple-100/85 text-purple-800 ring-1 ring-purple-300/45 hover:bg-purple-100 dark:bg-purple-950/35 dark:text-purple-300 dark:ring-purple-600/40",
  TO_ADMINS:
    "bg-emerald-100/90 text-emerald-800 ring-1 ring-emerald-400/45 hover:bg-emerald-100 dark:bg-emerald-950/35 dark:text-emerald-300 dark:ring-emerald-600/40",
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
