/**
 * Долги ФинОтдела: оплата не/частично (или пусто) + дата счёта старше N раб. дней МСК.
 * Cutoff: subtractMskWorkingDaysBeforeYmd(сегодня, N), затем invoiceIssuedAt
 * (иначе createdAt файла счёта) < endExclusive этого дня (границы как у фильтра счёта).
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { resolveClinicInvoiceEmail } from "@/lib/clinic-invoice-email";
import { financeOfficeInvoiceIssuedBeforeEndExclusive } from "@/lib/finance-office-list-filter";
import {
  canonicalOrderPayment,
  ORDER_PAYMENT_EXPECTED,
  ORDER_PAYMENT_NOT_PAID,
  ORDER_PAYMENT_PARTIAL,
} from "@/lib/order-clinic-client-fields";
import {
  formatYmdInMsk,
  subtractMskWorkingDaysBeforeYmd,
} from "@/lib/msk-calendar";
import { moscowDayBoundsUtc } from "@/lib/shipments-date-range";

export const FINANCE_OFFICE_DEBT_LIST_TAKE = 400;
export const FINANCE_OFFICE_DEBT_NOTIFY_MAX = 80;

export function looksLikeDebtNotifyEmail(value: string): boolean {
  const v = value.trim();
  if (!v || /\s/.test(v)) return false;
  const at = v.indexOf("@");
  if (at <= 0 || at !== v.lastIndexOf("@")) return false;
  const local = v.slice(0, at);
  const domain = v.slice(at + 1);
  return Boolean(local && domain.includes("."));
}

export type FinanceOfficeDebtRow = {
  orderId: string;
  orderNumber: string;
  patientName: string | null;
  doctorName: string | null;
  clinicName: string | null;
  ourLegalEntity: string | null;
  theirLegalName: string | null;
  theirInn: string | null;
  email: string;
  payment: string;
  paymentPartialRub: number | null;
  hasInvoice: boolean;
  hasUpd: boolean;
  invoiceNumber: string | null;
  updNumber: string | null;
  invoiceAttachmentId: string | null;
  updAttachmentId: string | null;
  issuedAtIso: string | null;
  updAtIso: string | null;
};

export function financeOfficeDebtPaymentLabel(
  payment: string | null | undefined,
  paymentPartialRub?: number | null,
): string {
  const p = canonicalOrderPayment(payment);
  if (p === ORDER_PAYMENT_PARTIAL && paymentPartialRub != null) {
    return `${ORDER_PAYMENT_PARTIAL} · ${paymentPartialRub} ₽`;
  }
  return p;
}

export function financeOfficeDebtPaymentWhere(): Prisma.OrderWhereInput {
  return {
    OR: [
      { payment: null },
      { payment: "" },
      { payment: ORDER_PAYMENT_NOT_PAID },
      { payment: ORDER_PAYMENT_EXPECTED },
      { payment: ORDER_PAYMENT_PARTIAL },
    ],
  };
}

export function financeOfficeDebtScopeWhere(input: {
  tenantId: string;
  workingDays: number;
  now?: Date;
}): Prisma.OrderWhereInput {
  const days = Math.max(1, Math.trunc(input.workingDays || 0));
  const todayYmd = formatYmdInMsk(input.now ?? new Date());
  const cutoffYmd = subtractMskWorkingDaysBeforeYmd(todayYmd, days);
  const { endExclusive } = moscowDayBoundsUtc(cutoffYmd);
  return {
    AND: [
      { tenantId: input.tenantId, archivedAt: null },
      financeOfficeDebtPaymentWhere(),
      financeOfficeInvoiceIssuedBeforeEndExclusive(endExclusive),
    ],
  };
}

export async function listFinanceOfficeDebts(
  db: PrismaClient,
  tenantId: string,
  workingDays: number,
): Promise<FinanceOfficeDebtRow[]> {
  const orders = await db.order.findMany({
    where: financeOfficeDebtScopeWhere({ tenantId, workingDays }),
    orderBy: [{ invoiceIssuedAt: "asc" }, { orderNumber: "asc" }],
    take: FINANCE_OFFICE_DEBT_LIST_TAKE,
    select: {
      id: true,
      orderNumber: true,
      patientName: true,
      payment: true,
      paymentPartialRub: true,
      legalEntity: true,
      invoiceIssuedAt: true,
      invoiceNumber: true,
      updNumber: true,
      invoiceAttachmentId: true,
      updAttachmentId: true,
      invoiceAttachment: { select: { createdAt: true } },
      updAttachment: { select: { createdAt: true } },
      doctor: { select: { fullName: true } },
      clinic: {
        select: {
          name: true,
          legalFullName: true,
          inn: true,
          email: true,
          invoiceEmail: true,
          useEmailForInvoices: true,
        },
      },
    },
  });

  return orders.map((o) => {
    const issued = o.invoiceIssuedAt ?? o.invoiceAttachment?.createdAt ?? null;
    return {
      orderId: o.id,
      orderNumber: o.orderNumber,
      patientName: o.patientName,
      doctorName: o.doctor?.fullName?.trim() || null,
      clinicName: o.clinic?.name ?? null,
      ourLegalEntity: o.legalEntity,
      theirLegalName: o.clinic?.legalFullName ?? null,
      theirInn: o.clinic?.inn ?? null,
      email: o.clinic ? resolveClinicInvoiceEmail(o.clinic) : "",
      payment: canonicalOrderPayment(o.payment),
      paymentPartialRub: o.paymentPartialRub,
      hasInvoice: Boolean(o.invoiceAttachmentId),
      hasUpd: Boolean(o.updAttachmentId),
      invoiceNumber: o.invoiceNumber?.trim() || null,
      updNumber: o.updNumber?.trim() || null,
      invoiceAttachmentId: o.invoiceAttachmentId,
      updAttachmentId: o.updAttachmentId,
      issuedAtIso: issued?.toISOString() ?? null,
      updAtIso: o.updAttachment?.createdAt?.toISOString() ?? null,
    };
  });
}

export async function countFinanceOfficeDebts(
  db: PrismaClient,
  tenantId: string,
  workingDays: number,
): Promise<number> {
  return db.order.count({
    where: financeOfficeDebtScopeWhere({ tenantId, workingDays }),
  });
}
