import type { PrismaClient } from "@prisma/client";
import { clearDoctorClinicLinkSuppression } from "@/lib/doctor-clinic-link-suppression";

/**
 * Гарантирует связь врач ↔ клиника (для нарядов и форм выбора).
 * Если связи не было — создаётся запись DoctorOnClinic.
 */
export async function ensureDoctorClinicLink(
  db: PrismaClient,
  doctorId: string,
  clinicId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    select: { id: true, deletedAt: true },
  });
  if (!clinic) {
    return { ok: false, error: "Клиника не найдена" };
  }
  if (clinic.deletedAt) {
    return {
      ok: false,
      error: "Клиника удалена. Восстановите её в разделе «История и удалённые».",
    };
  }

  const doctor = await db.doctor.findUnique({
    where: { id: doctorId },
    select: { id: true, deletedAt: true },
  });
  if (!doctor) {
    return { ok: false, error: "Врач не найден" };
  }
  if (doctor.deletedAt) {
    return {
      ok: false,
      error: "Врач удалён. Восстановите его в разделе «История и удалённые».",
    };
  }
  await clearDoctorClinicLinkSuppression(db, doctorId, clinicId);
  await db.doctorOnClinic.upsert({
    where: {
      doctorId_clinicId: { doctorId, clinicId },
    },
    create: { doctorId, clinicId },
    update: {},
  });
  return { ok: true };
}
