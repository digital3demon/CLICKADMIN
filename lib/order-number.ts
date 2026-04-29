import { type PrismaClient, Prisma } from "@prisma/client";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-constants";

/** id строки настроек нумерации = id тенанта (см. OrderNumberSettings ↔ Tenant) */
export const ORDER_NUMBER_SETTINGS_ID = DEFAULT_TENANT_ID;

/** Наряд: YYMM-NNN (напр. 2601-001) */
export const ORDER_NUMBER_PATTERN = /^(\d{4})-(\d{3})$/;

/** У архивного наряда номер заменяется на это значение — не формат YYMM-NNN, уникально по id, освобождает прежний номер. */
export function archivedOrderNumberPlaceholder(orderId: string): string {
  return `ARCH:${orderId}`;
}

export function isArchivedOrderNumberPlaceholder(orderNumber: string): boolean {
  return String(orderNumber ?? "").trim().startsWith("ARCH:");
}

const MONTH_NAMES_RU = [
  "январь",
  "февраль",
  "март",
  "апрель",
  "май",
  "июнь",
  "июль",
  "август",
  "сентябрь",
  "октябрь",
  "ноябрь",
  "декабрь",
] as const;

/** Текущий календарный YYMM (локальное время сервера) */
export function yymmFromDate(d: Date): string {
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

export function formatOrderNumber(yymm: string, seq: number): string {
  return `${yymm}-${String(seq).padStart(3, "0")}`;
}

/** Следующий календарный месяц после YYMM (локальная арифметика даты) */
export function addOneMonthYYMM(yymm: string): string {
  if (!/^\d{4}$/.test(yymm)) {
    throw new Error(`Некорректный YYMM: ${yymm}`);
  }
  const yy = parseInt(yymm.slice(0, 2), 10);
  const mm = parseInt(yymm.slice(2, 4), 10);
  if (mm < 1 || mm > 12 || Number.isNaN(yy)) {
    throw new Error(`Некорректный месяц в YYMM: ${yymm}`);
  }
  const fullYear = 2000 + yy;
  const d = new Date(fullYear, mm - 1, 1);
  d.setMonth(d.getMonth() + 1);
  const y2 = String(d.getFullYear()).slice(2);
  const m2 = String(d.getMonth() + 1).padStart(2, "0");
  return `${y2}${m2}`;
}

export function postingMonthLabelRu(yymm: string): string {
  if (!/^\d{4}$/.test(yymm)) return yymm;
  const yy = parseInt(yymm.slice(0, 2), 10);
  const mm = parseInt(yymm.slice(2, 4), 10);
  const year = 2000 + yy;
  const name = MONTH_NAMES_RU[mm - 1] ?? yymm;
  return `${name} ${year}`;
}

/** Максимальный префикс YYMM среди номеров вида YYMM-NNN (лексикографически). */
export function maxYYMMPrefixFromOrderNumbers(numbers: string[]): string | null {
  let best: string | null = null;
  for (const raw of numbers) {
    const m = ORDER_NUMBER_PATTERN.exec(String(raw).trim());
    if (!m) continue;
    const yymm = m[1];
    if (!best || yymm > best) best = yymm;
  }
  return best;
}

export async function getMaxSequenceForPrefix(
  db: PrismaClient,
  yymm: string,
  tenantId: string = DEFAULT_TENANT_ID,
): Promise<number> {
  const prefix = `${yymm}-`;
  const row = await db.order.findFirst({
    where: {
      tenantId,
      archivedAt: null,
      orderNumber: { startsWith: prefix },
    },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  if (!row) return 0;
  const m = ORDER_NUMBER_PATTERN.exec(row.orderNumber.trim());
  if (!m || m[1] !== yymm) return 0;
  const n = parseInt(m[2], 10);
  return Number.isNaN(n) ? 0 : n;
}

export async function getOrCreateOrderNumberSettings(
  db: PrismaClient,
  tenantId: string = DEFAULT_TENANT_ID,
): Promise<{ postingYearMonth: string; nextSequenceFloor: number | null }> {
  const existing = await db.orderNumberSettings.findUnique({
    where: { id: tenantId },
  });
  if (existing) {
    return {
      postingYearMonth: existing.postingYearMonth,
      nextSequenceFloor: existing.nextSequenceFloor,
    };
  }
  const last = await db.order.findFirst({
    where: { tenantId, archivedAt: null },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  let initial: string;
  if (last?.orderNumber) {
    const m = ORDER_NUMBER_PATTERN.exec(last.orderNumber.trim());
    initial = m ? m[1] : yymmFromDate(new Date());
  } else {
    initial = yymmFromDate(new Date());
  }
  const created = await db.orderNumberSettings.create({
    data: {
      id: tenantId,
      postingYearMonth: initial,
    },
  });
  return {
    postingYearMonth: created.postingYearMonth,
    nextSequenceFloor: created.nextSequenceFloor,
  };
}

/** Следующий свободный номер для текущего «месяца нумерации» (без записи в БД). */
export async function computeNextOrderNumber(
  db: PrismaClient,
  tenantId: string = DEFAULT_TENANT_ID,
): Promise<string> {
  const { postingYearMonth, nextSequenceFloor } =
    await getOrCreateOrderNumberSettings(db, tenantId);
  const max = await getMaxSequenceForPrefix(db, postingYearMonth, tenantId);
  const naturalNext = max + 1;
  const nextSeq =
    nextSequenceFloor != null
      ? Math.max(naturalNext, nextSequenceFloor)
      : naturalNext;
  return formatOrderNumber(postingYearMonth, nextSeq);
}

export type SetManualNextOrderNumberResult =
  | { ok: true; nextOrderNumber: string }
  | { ok: false; error: string };

/**
 * Задать вручную следующий номер (суффикс NNN): не ниже max+1 для текущего YYMM нумерации.
 * Сохраняется в настройках как нижняя граница; дальнейшие номера идут по max(..., эта граница).
 */
export async function setManualNextOrderNumber(
  db: PrismaClient,
  orderNumberFull: string,
  tenantId: string = DEFAULT_TENANT_ID,
): Promise<SetManualNextOrderNumberResult> {
  const trimmed = String(orderNumberFull).trim();
  const m = ORDER_NUMBER_PATTERN.exec(trimmed);
  if (!m) {
    return {
      ok: false,
      error: "Номер должен быть вида YYMM-NNN (например, 2604-005).",
    };
  }
  const yymm = m[1];
  const seq = parseInt(m[2], 10);
  if (!Number.isFinite(seq) || seq < 1 || seq > 999) {
    return { ok: false, error: "Суффикс номера должен быть от 001 до 999." };
  }

  await getOrCreateOrderNumberSettings(db, tenantId);
  const row = await db.orderNumberSettings.findUniqueOrThrow({
    where: { id: tenantId },
  });
  if (yymm !== row.postingYearMonth) {
    return {
      ok: false,
      error: `Префикс должен совпадать с текущим месяцем нумерации (${row.postingYearMonth}).`,
    };
  }

  const max = await getMaxSequenceForPrefix(db, yymm, tenantId);
  if (seq <= max) {
    return {
      ok: false,
      error: `Такой номер уже занят или меньше максимального. Сейчас максимум: ${formatOrderNumber(yymm, max)}.`,
    };
  }

  await db.orderNumberSettings.update({
    where: { id: tenantId },
    data: { nextSequenceFloor: seq },
  });
  const nextOrderNumber = await computeNextOrderNumber(db, tenantId);
  return { ok: true, nextOrderNumber };
}

/** Перевести нумерацию на следующий календарный месяц (первый следующий наряд — …-001). */
export async function advanceOrderPostingMonth(
  db: PrismaClient,
  tenantId: string = DEFAULT_TENANT_ID,
): Promise<{ previousYearMonth: string; nextYearMonth: string }> {
  await getOrCreateOrderNumberSettings(db, tenantId);
  const row = await db.orderNumberSettings.findUniqueOrThrow({
    where: { id: tenantId },
  });
  const nextYearMonth = addOneMonthYYMM(row.postingYearMonth);
  await db.orderNumberSettings.update({
    where: { id: tenantId },
    data: { postingYearMonth: nextYearMonth, nextSequenceFloor: null },
  });
  return {
    previousYearMonth: row.postingYearMonth,
    nextYearMonth,
  };
}

export function isPrismaUniqueOrderNumberError(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2002"
  );
}
