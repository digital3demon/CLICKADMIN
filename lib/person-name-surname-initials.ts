/**
 * Сокращение полного ФИО до вида «Фамилия И. О.» (первое слово — фамилия, далее инициалы).
 * Одно слово возвращается без изменений.
 */
export function personNameSurnameInitials(
  fullName: string | null | undefined,
): string {
  if (fullName == null) return "";
  const t = fullName.trim();
  if (!t) return "";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  const [surname, ...rest] = parts;
  const initials = rest
    .map((w) => {
      const c = w[0];
      return c ? `${c.toLocaleUpperCase("ru-RU")}.` : "";
    })
    .filter(Boolean);
  return [surname, ...initials].join(" ");
}
