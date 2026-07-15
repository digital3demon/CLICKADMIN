import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";

/** Заголовок модалки чата: «Чат 2605-437 Иванов И. Петров А.» (пациент, затем врач). */
export function formatOrderListChatModalTitle(
  orderNumber: string,
  patientName?: string | null,
  doctorName?: string | null,
): string {
  const parts = ["Чат", orderNumber.trim() || "—"];
  const patient = patientName?.trim()
    ? personNameSurnameInitials(patientName)
    : "";
  const doctor = doctorName?.trim()
    ? personNameSurnameInitials(doctorName)
    : "";
  if (patient) parts.push(patient);
  if (doctor) parts.push(doctor);
  return parts.join(" ");
}
