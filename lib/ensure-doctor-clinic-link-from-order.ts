import type { PrismaClient } from "@prisma/client";
import { ensureDoctorClinicLink } from "@/lib/ensure-doctor-clinic-link";
import { revalidateAfterDoctorClinicLinkChange } from "@/lib/revalidate-after-doctor-clinic-link";
import { logger } from "@/lib/server/logger";

/**
 * После создания/смены врача или клиники в наряде: upsert DoctorOnClinic.
 * Вызывается только по явному триггеру (POST наряда, PATCH с новым doctorId/clinicId).
 */
export async function ensureDoctorClinicLinkAfterOrderSave(
  clientsDb: PrismaClient,
  order: { doctorId: string; clinicId: string | null },
): Promise<void> {
  const doctorId = order.doctorId?.trim();
  const clinicId = order.clinicId?.trim() || null;
  if (!doctorId || !clinicId) return;

  try {
    const linked = await ensureDoctorClinicLink(clientsDb, doctorId, clinicId);
    if (!linked.ok) {
      logger.warn(
        { doctorId, clinicId, error: linked.error },
        "ensureDoctorClinicLinkAfterOrderSave",
      );
      return;
    }
    revalidateAfterDoctorClinicLinkChange(clinicId, doctorId);
  } catch (e) {
    logger.error(
      { err: e, doctorId, clinicId },
      "ensureDoctorClinicLinkAfterOrderSave",
    );
  }
}
