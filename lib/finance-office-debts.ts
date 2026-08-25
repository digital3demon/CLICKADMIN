/**
 * Долги ФинОтдела: оплата не/частично (или пусто) + дата счёта старше N раб. дней МСК.
 * Cutoff: subtractMskWorkingDaysBeforeYmd(сегодня, N), затем invoiceIssuedAt
 * (иначе createdAt файла счёта) < endExclusive этого дня (границы как у фильтра счёта).
 */
import type { Prisma, PrismaClient } from "@prisma/client";
import { resolveClinicInvoiceEmail } from "@/lib/clinic-invoice-email";
import { financeOfficeInvoiceIssuedBeforeEndExclusive } from "@/lib/finance-office-list-filter";
import {
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
  clinicName: string | null;
  ourLegalEntity: string | null;
  theirLegalName: string | null;
  theirInn: string | null;
  email: string;
  hasInvoice: boolean;
  hasUpd: boolean;
  issuedAtIso: string | null;
};

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
      legalEntity: true,
      invoiceIssuedAt: true,
      invoiceAttachmentId: true,
      updAttachmentId: true,
      invoiceAttachment: { select: { createdAt: true } },
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
      clinicName: o.clinic?.name ?? null,
      ourLegalEntity: o.legalEntity,
      theirLegalName: o.clinic?.legalFullName ?? null,
      theirInn: o.clinic?.inn ?? null,
      email: o.clinic ? resolveClinicInvoiceEmail(o.clinic) : "",
      hasInvoice: Boolean(o.invoiceAttachmentId),
      hasUpd: Boolean(o.updAttachmentId),
      issuedAtIso: issued?.toISOString() ?? null,
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
