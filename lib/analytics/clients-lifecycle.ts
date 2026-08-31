/**
 * Жизненный цикл клиник и врачей (вкладка аналитики «Клиники и врачи»).
 *
 * Окно дат — рабочие дни MSK (как в parseAnalyticsRange).
 * «Новые» — createdAt в окне и не помечены «не новый».
 * «Вернувшиеся» — пауза ≥ 90 календарных дней, затем заказ в окне.
 * «Пропали» — был хотя бы один заказ, последний старше 45 дней на asOf.
 */

export const CLIENT_RETURN_GAP_DAYS = 90;
export const CLIENT_DISAPPEARED_DAYS = 45;

const DAY_MS = 24 * 60 * 60 * 1000;

export type NewContractorRow = {
  id: string;
  name: string;
  clinicNames: string[];
  inDbOn: string;
};

export type ReturnedContractorRow = {
  id: string;
  name: string;
  clinicNames: string[];
  returnedOn: string;
  previousOn: string;
  gapDays: number;
};

export type DisappearedContractorRow = {
  id: string;
  name: string;
  clinicNames: string[];
  lastOrderOn: string;
  idleDays: number;
};

export type ContractorsLifecycleReport = {
  newDoctors: NewContractorRow[];
  newClinics: NewContractorRow[];
  returnedDoctors: ReturnedContractorRow[];
  returnedClinics: ReturnedContractorRow[];
  disappearedDoctors: DisappearedContractorRow[];
  disappearedClinics: DisappearedContractorRow[];
};

export function isNewInPeriod(opts: {
  createdAt: Date;
  from: Date;
  to: Date;
  treatAsExisting: boolean;
  deletedAt: Date | null;
}): boolean {
  if (opts.treatAsExisting) return false;
  if (opts.deletedAt) return false;
  return opts.createdAt >= opts.from && opts.createdAt <= opts.to;
}

/**
 * Первая дата заказа в [from, to], если до неё уже был заказ и пауза ≥ gapDays.
 * «Работа» = момент createdAt наряда (не архив / не отмена — отсекается на загрузке).
 */
export function findReturnInPeriod(
  orderAts: Date[],
  from: Date,
  to: Date,
  gapDays = CLIENT_RETURN_GAP_DAYS,
): { returnedAt: Date; previousAt: Date; gapDays: number } | null {
  if (orderAts.length === 0) return null;
  const sorted = [...orderAts].sort((a, b) => a.getTime() - b.getTime());
  const firstInPeriod = sorted.find((d) => d >= from && d <= to);
  if (!firstInPeriod) return null;
  let prev: Date | null = null;
  for (const d of sorted) {
    if (d < firstInPeriod) prev = d;
    else break;
  }
  if (!prev) return null;
  const days = (firstInPeriod.getTime() - prev.getTime()) / DAY_MS;
  if (days < gapDays) return null;
  return {
    returnedAt: firstInPeriod,
    previousAt: prev,
    gapDays: Math.floor(days),
  };
}

/** Нет заказов строго больше `days` на момент asOf. Без заказов — не «пропал». */
export function isDisappeared(opts: {
  lastOrderAt: Date | null;
  asOf: Date;
  days?: number;
}): boolean {
  if (!opts.lastOrderAt) return false;
  const threshold = opts.days ?? CLIENT_DISAPPEARED_DAYS;
  return (
    opts.asOf.getTime() - opts.lastOrderAt.getTime() > threshold * DAY_MS
  );
}

export function lastOrderAt(orderAts: Date[]): Date | null {
  if (orderAts.length === 0) return null;
  let max = orderAts[0]!;
  for (const d of orderAts) {
    if (d.getTime() > max.getTime()) max = d;
  }
  return max;
}

export function idleDaysSince(last: Date, asOf: Date): number {
  return Math.floor((asOf.getTime() - last.getTime()) / DAY_MS);
}

export function emptyContractorsLifecycle(): ContractorsLifecycleReport {
  return {
    newDoctors: [],
    newClinics: [],
    returnedDoctors: [],
    returnedClinics: [],
    disappearedDoctors: [],
    disappearedClinics: [],
  };
}
