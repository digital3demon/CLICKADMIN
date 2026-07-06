import "server-only";
import type { PrismaClient } from "@prisma/client";
import { ORDER_CLINIC_PRIVATE } from "@/lib/clients-order-ui";
import {
  legalEntitySelectFromClinicBilling,
  ORDER_PAYMENT_NOT_PAID,
  ORDER_PAYMENT_RECON_UNPAID,
} from "@/lib/order-clinic-client-fields";

export type ClientBillingForOrder = {
  legalEntity: string;
  payment: string;
};

/**
 * Юрлицо и оплата из карточки клиники (как useEffect в NewOrderForm / OrderEditForm).
 */
export async function resolveClientBillingForOrder(
  clientsPrisma: PrismaClient,
  tenantId: string,
  clinicId: string | null,
  doctorId: string | null,
): Promise<ClientBillingForOrder> {
  const resolvedClinicId =
    clinicId && clinicId !== ORDER_CLINIC_PRIVATE ? clinicId : null;

  if (resolvedClinicId) {
    const clinic = await clientsPrisma.clinic.findFirst({
      where: { id: resolvedClinicId, tenantId },
      select: {
        billingLegalForm: true,
        worksWithReconciliation: true,
      },
    });
    if (clinic) {
      return {
        legalEntity: legalEntitySelectFromClinicBilling(clinic.billingLegalForm),
        payment: clinic.worksWithReconciliation
          ? ORDER_PAYMENT_RECON_UNPAID
          : ORDER_PAYMENT_NOT_PAID,
      };
    }
  }

  if (doctorId) {
    const doctor = await clientsPrisma.doctor.findFirst({
      where: { id: doctorId, tenantId },
      select: {
        isIpEntrepreneur: true,
        ipClinicAsSource: {
          select: {
            billingLegalForm: true,
            worksWithReconciliation: true,
          },
        },
      },
    });
    if (doctor?.isIpEntrepreneur && doctor.ipClinicAsSource) {
      return {
        legalEntity: "ИП",
        payment: doctor.ipClinicAsSource.worksWithReconciliation
          ? ORDER_PAYMENT_RECON_UNPAID
          : ORDER_PAYMENT_NOT_PAID,
      };
    }
  }

  return {
    legalEntity: legalEntitySelectFromClinicBilling(null),
    payment: ORDER_PAYMENT_NOT_PAID,
  };
}
