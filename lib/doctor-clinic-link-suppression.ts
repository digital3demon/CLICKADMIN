import type { PrismaClient } from "@prisma/client";

type Db = Pick<PrismaClient, "doctorClinicLinkSuppression">;

/** Снимает подавление — вызывать перед явным созданием связи (наряд, восстановление версии). */
export async function clearDoctorClinicLinkSuppression(
  db: Db,
  doctorId: string,
  clinicId: string,
): Promise<void> {
  await db.doctorClinicLinkSuppression.deleteMany({
    where: { doctorId, clinicId },
  });
}
