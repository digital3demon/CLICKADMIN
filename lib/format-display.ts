/** Отображение пустых значений прочерком (как в ТЗ). */
export function displayOrDash(v: unknown): string {
  if (v == null) return "—";
  const s = String(v).trim();
  return s.length ? s : "—";
}

export function formatBirthdayRu(d: Date | null | undefined): string {
  if (!d) return "—";
  try {
    return d.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}
