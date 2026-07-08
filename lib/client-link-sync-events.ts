/** События для синхронизации связей клиника ↔ врач без полной перезагрузки RSC. */

export const DOCTOR_CLINIC_LINK_DELTA = "crm:doctor-clinic-link-delta";
export const CLINIC_DOCTOR_LINK_DELTA = "crm:clinic-doctor-link-delta";
export const DOCTOR_CLINIC_LINK_CHANGED = "crm:doctor-clinic-link-changed";

const BROADCAST_CHANNEL = "crm-doctor-clinic-link";

export type DoctorClinicLinkChangeDetail = {
  clinicId: string;
  doctorId: string;
  action: "link" | "unlink";
  clinic?: { id: string; name: string; address: string | null };
  doctor?: { id: string; fullName: string };
};

function postBroadcast(detail: DoctorClinicLinkChangeDetail) {
  if (typeof window === "undefined") return;
  try {
    const ch = new BroadcastChannel(BROADCAST_CHANNEL);
    ch.postMessage(detail);
    ch.close();
  } catch {
    /* BroadcastChannel недоступен — только события в этой вкладке */
  }
}

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

/** Одно событие: обновляет счётчики и списки на обеих карточках (и в других вкладках). */
export function emitDoctorClinicLinkChanged(detail: DoctorClinicLinkChangeDetail) {
  if (typeof window === "undefined") return;
  const delta = detail.action === "link" ? 1 : -1;
  emitClinicDoctorLinkDelta(detail.clinicId, delta);
  emitDoctorClinicLinkDelta(detail.doctorId, delta);
  window.dispatchEvent(
    new CustomEvent(DOCTOR_CLINIC_LINK_CHANGED, { detail }),
  );
  postBroadcast(detail);
}

export function subscribeDoctorClinicLinkChanged(
  handler: (detail: DoctorClinicLinkChangeDetail) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const onCustom = (e: Event) => {
    const detail = (e as CustomEvent<DoctorClinicLinkChangeDetail>).detail;
    if (!detail?.clinicId || !detail?.doctorId) return;
    handler(detail);
  };

  const onBroadcast = (e: MessageEvent<DoctorClinicLinkChangeDetail>) => {
    const detail = e.data;
    if (!detail?.clinicId || !detail?.doctorId) return;
    handler(detail);
  };

  window.addEventListener(DOCTOR_CLINIC_LINK_CHANGED, onCustom);
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(BROADCAST_CHANNEL);
    channel.addEventListener("message", onBroadcast);
  } catch {
    /* только CustomEvent в этой вкладке */
  }

  return () => {
    window.removeEventListener(DOCTOR_CLINIC_LINK_CHANGED, onCustom);
    channel?.removeEventListener("message", onBroadcast);
    channel?.close();
  };
}
