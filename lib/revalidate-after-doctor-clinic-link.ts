import { revalidatePath } from "next/cache";

/**
 * Сбрасывает кэш карточек после изменения связи врач ↔ клиника.
 * Список /clients не инвалидируем — он и так force-dynamic.
 */
export function revalidateAfterDoctorClinicLinkChange(
  clinicId: string,
  doctorId: string,
): void {
  revalidatePath(`/clients/${clinicId}`);
  revalidatePath(`/clients/doctors/${doctorId}`);
}
