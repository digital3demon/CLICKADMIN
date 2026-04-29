import { revalidatePath } from "next/cache";

/**
 * Сбрасывает кэш страниц после изменения связи врач ↔ клиника,
 * чтобы карточки и список «Клиенты» обновлялись без полной перезагрузки.
 */
export function revalidateAfterDoctorClinicLinkChange(
  clinicId: string,
  doctorId: string,
): void {
  revalidatePath(`/clients/${clinicId}`);
  revalidatePath(`/clients/doctors/${doctorId}`);
  revalidatePath("/clients");
}
