/** Заголовок модалки чата из списка нарядов: «Чат 2605-437 Иванов И. Петров А.». */
export function formatOrderListChatModalTitle(
  orderNumber: string,
  patientName?: string | null,
  doctorName?: string | null,
): string {
  const parts = ["Чат", orderNumber.trim() || "—"];
  const patient = patientName?.trim();
  const doctor = doctorName?.trim();
  if (patient) parts.push(patient);
  if (doctor) parts.push(doctor);
  return parts.join(" ");
}
