import type { PrismaClient } from "@prisma/client";
import { normalizePatientKeyForDuplicate } from "@/lib/order-duplicate-preflight";

export async function validateContinuesFromOrderId(
  prisma: PrismaClient,
  params: {
    continuesFromOrderId: string;
    doctorId: string;
    clinicId: string | null;
    patientName: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parent = await prisma.order.findUnique({
    where: { id: params.continuesFromOrderId },
    select: {
      id: true,
      doctorId: true,
      clinicId: true,
      patientName: true,
    },
  });
  if (!parent) {
    return { ok: false, error: "Указанный предыдущий наряд не найден" };
  }
  if (
    parent.doctorId !== params.doctorId ||
    parent.clinicId !== params.clinicId
  ) {
    return {
      ok: false,
      error: "Врач и клиника должны совпадать с выбранным предыдущим нарядом",
    };
  }
  const pk = normalizePatientKeyForDuplicate(params.patientName);
  const ck = normalizePatientKeyForDuplicate(parent.patientName ?? "");
  if (!pk || pk !== ck) {
    return {
      ok: false,
      error: "ФИО пациента должно совпадать с предыдущим нарядом",
    };
  }
  return { ok: true };
}
