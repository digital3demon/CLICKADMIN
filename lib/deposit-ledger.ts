/**
 * Депозит / переплата: клиника или врач.
 * Баланс кэшируется на Clinic/Doctor.depositBalanceRub; движения — DepositLedgerEntry.
 * Timezone не влияет (целые рубли). Без даты в журнале — createdAt = now().
 */
import type {
  DepositLedgerKind,
  DepositParty,
  Prisma,
  PrismaClient,
} from "@prisma/client";
import {
  orderCompositionSubtotalAfterDiscountsRub,
} from "@/lib/format-order-construction";
import { ORDER_CLINIC_PRIVATE } from "@/lib/clients-order-ui";

/** Юрлицо наряда «Частное лицо» — депозит врача, не клиники. */
export const ORDER_LEGAL_ENTITY_PRIVATE = "Частное лицо";

export function isOrderClinicAbsent(
  clinicId: string | null | undefined,
): boolean {
  const id = String(clinicId ?? "").trim();
  return !id || id === ORDER_CLINIC_PRIVATE;
}

export function isOrderPrivatePersonLegalEntity(
  legalEntity: string | null | undefined,
): boolean {
  return String(legalEntity ?? "").trim() === ORDER_LEGAL_ENTITY_PRIVATE;
}

export type DepositDb = PrismaClient | Prisma.TransactionClient;

export function clampNonNegIntRub(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}

/** Сколько можно учесть: min(баланс, сумма к оплате до депозита). */
export function computeDepositApplyRub(
  balanceRub: number,
  payableBeforeDepositRub: number,
): number {
  const bal = clampNonNegIntRub(balanceRub);
  const pay = clampNonNegIntRub(payableBeforeDepositRub);
  return Math.min(bal, pay);
}

/** К оплате после учёта депозита (≥ 0). */
export function payableAfterDepositRub(
  payableBeforeDepositRub: number,
  depositAppliedRub: number | null | undefined,
): number {
  const before = clampNonNegIntRub(payableBeforeDepositRub);
  const applied = clampNonNegIntRub(depositAppliedRub ?? 0);
  return Math.max(0, before - applied);
}

/**
 * Сумма к оплате до депозита: состав после % скидок × срочность.
 */
export function orderPayableBeforeDepositRub(opts: {
  lines: Array<{
    quantity: number;
    unitPrice: number | null;
    lineDiscountPercent?: number | null;
  }>;
  compositionDiscountPercent: number | null | undefined;
  urgentMultiplier: number;
}): number {
  const sub = orderCompositionSubtotalAfterDiscountsRub(
    opts.lines,
    opts.compositionDiscountPercent,
  );
  const m =
    Number.isFinite(opts.urgentMultiplier) && opts.urgentMultiplier > 0
      ? opts.urgentMultiplier
      : 1;
  return clampNonNegIntRub(Math.round(sub * m));
}

/**
 * Сторона депозита наряда: клиника, если клиника реально выбрана
 * и юрлицо не «Частное лицо». Иначе врач (частная практика / частное лицо).
 */
export function depositPartyForOrder(
  clinicId: string | null | undefined,
  legalEntity?: string | null,
): DepositParty {
  if (isOrderPrivatePersonLegalEntity(legalEntity)) return "DOCTOR";
  return isOrderClinicAbsent(clinicId) ? "DOCTOR" : "CLINIC";
}

export type DepositMutationResult = {
  balanceRub: number;
  entryId: string;
  amountRub: number;
};

async function appendLedgerAndUpdateBalance(
  db: DepositDb,
  opts: {
    tenantId: string;
    party: DepositParty;
    clinicId?: string | null;
    doctorId?: string | null;
    amountRub: number;
    kind: DepositLedgerKind;
    orderId?: string | null;
    note?: string | null;
    createdByUserId?: string | null;
  },
): Promise<DepositMutationResult> {
  const amountRub = Math.round(opts.amountRub);
  if (amountRub === 0) {
    throw new Error("Сумма движения должна быть ненулевой");
  }
  if (opts.party === "CLINIC") {
    if (!opts.clinicId) throw new Error("Нужен clinicId");
    const clinic = await db.clinic.findFirst({
      where: { id: opts.clinicId, tenantId: opts.tenantId, deletedAt: null },
      select: { id: true, depositBalanceRub: true },
    });
    if (!clinic) throw new Error("Клиника не найдена");
    const next = clinic.depositBalanceRub + amountRub;
    if (next < 0) throw new Error("Недостаточно депозита");
    const entry = await db.depositLedgerEntry.create({
      data: {
        tenantId: opts.tenantId,
        party: "CLINIC",
        clinicId: clinic.id,
        doctorId: null,
        amountRub,
        kind: opts.kind,
        orderId: opts.orderId ?? null,
        note: opts.note?.trim() || null,
        createdByUserId: opts.createdByUserId ?? null,
      },
      select: { id: true },
    });
    await db.clinic.update({
      where: { id: clinic.id },
      data: { depositBalanceRub: next },
    });
    return { balanceRub: next, entryId: entry.id, amountRub };
  }

  if (!opts.doctorId) throw new Error("Нужен doctorId");
  const doctor = await db.doctor.findFirst({
    where: { id: opts.doctorId, tenantId: opts.tenantId, deletedAt: null },
    select: { id: true, depositBalanceRub: true },
  });
  if (!doctor) throw new Error("Врач не найден");
  const next = doctor.depositBalanceRub + amountRub;
  if (next < 0) throw new Error("Недостаточно депозита");
  const entry = await db.depositLedgerEntry.create({
    data: {
      tenantId: opts.tenantId,
      party: "DOCTOR",
      clinicId: null,
      doctorId: doctor.id,
      amountRub,
      kind: opts.kind,
      orderId: opts.orderId ?? null,
      note: opts.note?.trim() || null,
      createdByUserId: opts.createdByUserId ?? null,
    },
    select: { id: true },
  });
  await db.doctor.update({
    where: { id: doctor.id },
    data: { depositBalanceRub: next },
  });
  return { balanceRub: next, entryId: entry.id, amountRub };
}

export async function topUpDeposit(
  db: DepositDb,
  opts: {
    tenantId: string;
    party: DepositParty;
    clinicId?: string | null;
    doctorId?: string | null;
    amountRub: number;
    note?: string | null;
    createdByUserId?: string | null;
    orderId?: string | null;
  },
): Promise<DepositMutationResult> {
  const amount = clampNonNegIntRub(opts.amountRub);
  if (amount <= 0) throw new Error("Сумма пополнения должна быть больше 0");
  return appendLedgerAndUpdateBalance(db, {
    ...opts,
    amountRub: amount,
    kind: "TOPUP",
  });
}

export async function writeOffDeposit(
  db: DepositDb,
  opts: {
    tenantId: string;
    party: DepositParty;
    clinicId?: string | null;
    doctorId?: string | null;
    amountRub: number;
    note?: string | null;
    createdByUserId?: string | null;
  },
): Promise<DepositMutationResult> {
  const amount = clampNonNegIntRub(opts.amountRub);
  if (amount <= 0) throw new Error("Сумма списания должна быть больше 0");
  return appendLedgerAndUpdateBalance(db, {
    ...opts,
    amountRub: -amount,
    kind: "WRITE_OFF",
  });
}

export type ApplyDepositResult = {
  depositAppliedRub: number;
  depositAppliedParty: DepositParty;
  balanceRub: number;
  payableBeforeDepositRub: number;
  payableAfterDepositRub: number;
};

/**
 * Учесть депозит в наряде. Повторный вызов: сначала откатывает предыдущий APPLY, затем применяет заново.
 */
export async function applyDepositToOrder(
  db: DepositDb,
  opts: {
    tenantId: string;
    orderId: string;
    createdByUserId?: string | null;
  },
): Promise<ApplyDepositResult> {
  const order = await db.order.findFirst({
    where: { id: opts.orderId, tenantId: opts.tenantId, archivedAt: null },
    select: {
      id: true,
      clinicId: true,
      doctorId: true,
      legalEntity: true,
      compositionDiscountPercent: true,
      urgentCoefficient: true,
      isUrgent: true,
      depositAppliedRub: true,
      depositAppliedParty: true,
      constructions: {
        select: {
          quantity: true,
          unitPrice: true,
          lineDiscountPercent: true,
        },
      },
    },
  });
  if (!order) throw new Error("Наряд не найден");

  if (order.depositAppliedRub != null && order.depositAppliedRub > 0) {
    await unapplyDepositFromOrder(db, {
      tenantId: opts.tenantId,
      orderId: order.id,
      createdByUserId: opts.createdByUserId,
      skipIfNone: false,
    });
  }

  const refreshed = await db.order.findFirst({
    where: { id: order.id },
    select: {
      clinicId: true,
      doctorId: true,
      legalEntity: true,
      compositionDiscountPercent: true,
      urgentCoefficient: true,
      constructions: {
        select: {
          quantity: true,
          unitPrice: true,
          lineDiscountPercent: true,
        },
      },
    },
  });
  if (!refreshed) throw new Error("Наряд не найден");

  const party = depositPartyForOrder(refreshed.clinicId, refreshed.legalEntity);
  const urgentMult =
    refreshed.urgentCoefficient != null &&
    Number.isFinite(refreshed.urgentCoefficient) &&
    refreshed.urgentCoefficient > 0
      ? refreshed.urgentCoefficient
      : 1;

  const payableBefore = orderPayableBeforeDepositRub({
    lines: refreshed.constructions,
    compositionDiscountPercent: refreshed.compositionDiscountPercent,
    urgentMultiplier: urgentMult,
  });

  let balance = 0;
  if (party === "CLINIC") {
    if (!refreshed.clinicId) throw new Error("Нет клиники у наряда");
    const clinic = await db.clinic.findFirst({
      where: { id: refreshed.clinicId, tenantId: opts.tenantId },
      select: { depositBalanceRub: true },
    });
    balance = clinic?.depositBalanceRub ?? 0;
  } else {
    const doctor = await db.doctor.findFirst({
      where: { id: refreshed.doctorId, tenantId: opts.tenantId },
      select: { depositBalanceRub: true },
    });
    balance = doctor?.depositBalanceRub ?? 0;
  }

  const applied = computeDepositApplyRub(balance, payableBefore);
  if (applied <= 0) {
    await db.order.update({
      where: { id: order.id },
      data: { depositAppliedRub: null, depositAppliedParty: null },
    });
    return {
      depositAppliedRub: 0,
      depositAppliedParty: party,
      balanceRub: balance,
      payableBeforeDepositRub: payableBefore,
      payableAfterDepositRub: payableBefore,
    };
  }

  const mut = await appendLedgerAndUpdateBalance(db, {
    tenantId: opts.tenantId,
    party,
    clinicId: party === "CLINIC" ? refreshed.clinicId : null,
    doctorId: party === "DOCTOR" ? refreshed.doctorId : null,
    amountRub: -applied,
    kind: "APPLY_ORDER",
    orderId: order.id,
    createdByUserId: opts.createdByUserId,
    note: "Учтено в наряде",
  });

  await db.order.update({
    where: { id: order.id },
    data: {
      depositAppliedRub: applied,
      depositAppliedParty: party,
    },
  });

  return {
    depositAppliedRub: applied,
    depositAppliedParty: party,
    balanceRub: mut.balanceRub,
    payableBeforeDepositRub: payableBefore,
    payableAfterDepositRub: payableAfterDepositRub(payableBefore, applied),
  };
}

export async function unapplyDepositFromOrder(
  db: DepositDb,
  opts: {
    tenantId: string;
    orderId: string;
    createdByUserId?: string | null;
    skipIfNone?: boolean;
  },
): Promise<{ balanceRub: number; restoredRub: number }> {
  const order = await db.order.findFirst({
    where: { id: opts.orderId, tenantId: opts.tenantId },
    select: {
      id: true,
      clinicId: true,
      doctorId: true,
      depositAppliedRub: true,
      depositAppliedParty: true,
    },
  });
  if (!order) throw new Error("Наряд не найден");

  const applied = order.depositAppliedRub ?? 0;
  const party = order.depositAppliedParty;
  if (applied <= 0 || !party) {
    if (opts.skipIfNone !== false) {
      let balanceRub = 0;
      if (order.clinicId) {
        const c = await db.clinic.findFirst({
          where: { id: order.clinicId },
          select: { depositBalanceRub: true },
        });
        balanceRub = c?.depositBalanceRub ?? 0;
      } else {
        const d = await db.doctor.findFirst({
          where: { id: order.doctorId },
          select: { depositBalanceRub: true },
        });
        balanceRub = d?.depositBalanceRub ?? 0;
      }
      return { balanceRub, restoredRub: 0 };
    }
    throw new Error("Депозит на наряде не учтён");
  }

  const mut = await appendLedgerAndUpdateBalance(db, {
    tenantId: opts.tenantId,
    party,
    clinicId: party === "CLINIC" ? order.clinicId : null,
    doctorId: party === "DOCTOR" ? order.doctorId : null,
    amountRub: applied,
    kind: "ADJUST",
    orderId: order.id,
    createdByUserId: opts.createdByUserId,
    note: "Отмена учёта депозита в наряде",
  });

  await db.order.update({
    where: { id: order.id },
    data: { depositAppliedRub: null, depositAppliedParty: null },
  });

  return { balanceRub: mut.balanceRub, restoredRub: applied };
}

export async function listRecentDepositEntries(
  db: DepositDb,
  opts: {
    tenantId: string;
    party: DepositParty;
    clinicId?: string | null;
    doctorId?: string | null;
    take?: number;
  },
) {
  const take = Math.min(50, Math.max(1, opts.take ?? 15));
  return db.depositLedgerEntry.findMany({
    where: {
      tenantId: opts.tenantId,
      party: opts.party,
      ...(opts.party === "CLINIC"
        ? { clinicId: opts.clinicId ?? undefined }
        : { doctorId: opts.doctorId ?? undefined }),
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      amountRub: true,
      kind: true,
      note: true,
      orderId: true,
      createdAt: true,
    },
  });
}
