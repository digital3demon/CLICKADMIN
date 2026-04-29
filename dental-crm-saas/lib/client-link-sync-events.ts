/** Кастомные события для синхронизации счётчиков без полной перезагрузки RSC. */

export const DOCTOR_CLINIC_LINK_DELTA = "crm:doctor-clinic-link-delta";
export const CLINIC_DOCTOR_LINK_DELTA = "crm:clinic-doctor-link-delta";

export function emitDoctorClinicLinkDelta(doctorId: string, delta: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(DOCTOR_CLINIC_LINK_DELTA, {
      detail: { doctorId, delta },
    }),
  );
}

export function emitClinicDoctorLinkDelta(clinicId: string, delta: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CLINIC_DOCTOR_LINK_DELTA, {
      detail: { clinicId, delta },
    }),
  );
}
