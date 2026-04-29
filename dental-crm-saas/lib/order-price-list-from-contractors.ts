import type { OrderPriceListKind, PrismaClient } from "@prisma/client";

/**
 * Прайс в наряде: сначала значение из карточки врача, иначе из карточки клиники
 * (при привязке к клинике).
 */
export function resolvedOrderPriceListKindFromContractors(input: {
  clinicId: string | null;
  doctorKind: OrderPriceListKind | null;
  clinicKind: OrderPriceListKind | null;
}): OrderPriceListKind | null {
  if (input.doctorKind != null) return input.doctorKind;
  if (input.clinicId != null && input.clinicKind != null) {
    return input.clinicKind;
  }
  return null;
}

export async function fetchOrderPriceListKindForOrder(
  prisma: PrismaClient,
  clinicId: string | null,
  doctorId: string,
): Promise<OrderPriceListKind | null> {
  const [doctor, clinic] = await Promise.all([
    prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { orderPriceListKind: true },
    }),
    clinicId
      ? prisma.clinic.findUnique({
          where: { id: clinicId },
          select: { orderPriceListKind: true },
        })
      : Promise.resolve(null),
  ]);
  if (!doctor) return null;
  return resolvedOrderPriceListKindFromContractors({
    clinicId,
    doctorKind: doctor.orderPriceListKind,
    clinicKind: clinic?.orderPriceListKind ?? null,
  });
}

export function orderPriceListKindRu(
  v: OrderPriceListKind | null | undefined,
): string {
  if (v === "MAIN") return "Основной каталог";
  if (v === "CUSTOM") return "Индивидуальный";
  return "Не задано";
}
