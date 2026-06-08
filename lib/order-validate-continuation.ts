import type { Prisma, PrismaClient } from "@prisma/client";
import { patientSurnamesMatch } from "@/lib/order-continuation-match";

type OrderContinuationLinkRow = Prisma.OrderGetPayload<{
  select: { continuesFromOrderId: true };
}> | null;

async function wouldCreateContinuationCycle(
  prisma: PrismaClient,
  currentOrderId: string | null | undefined,
  parentId: string,
): Promise<boolean> {
  if (!currentOrderId) return false;
  if (currentOrderId === parentId) return true;
  let cursor: string | null = parentId;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === currentOrderId) return true;
    if (seen.has(cursor)) break;
    seen.add(cursor);
    const row: OrderContinuationLinkRow = await prisma.order.findUnique({
      where: { id: cursor },
      select: { continuesFromOrderId: true },
    });
    cursor = row?.continuesFromOrderId ?? null;
  }
  return false;
}

export async function validateContinuesFromOrderId(
  prisma: PrismaClient,
  params: {
    continuesFromOrderId: string;
    doctorId: string;
    patientName: string;
    /** При редактировании — id текущего наряда (запрет self-link и циклов). */
    currentOrderId?: string | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parent = await prisma.order.findUnique({
    where: { id: params.continuesFromOrderId },
    select: {
      id: true,
      doctorId: true,
      patientName: true,
      archivedAt: true,
    },
  });
  if (!parent || parent.archivedAt != null) {
    return { ok: false, error: "Указанный предыдущий наряд не найден" };
  }
  if (parent.doctorId !== params.doctorId) {
    return {
      ok: false,
      error: "Врач должен совпадать с выбранным предыдущим нарядом",
    };
  }
  if (!patientSurnamesMatch(params.patientName, parent.patientName)) {
    return {
      ok: false,
      error: "Фамилия пациента должна совпадать с предыдущим нарядом",
    };
  }
  if (
    await wouldCreateContinuationCycle(
      prisma,
      params.currentOrderId,
      params.continuesFromOrderId,
    )
  ) {
    return {
      ok: false,
      error: "Нельзя указать этот наряд: получится циклическая связь",
    };
  }
  return { ok: true };
}
