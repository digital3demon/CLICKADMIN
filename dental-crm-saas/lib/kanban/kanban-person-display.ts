/** Инициалы для кружка (ФИО или email). */
export function initialsFromDisplayName(name: string): string {
  const p = name.replace(/\s+/g, " ").trim();
  if (!p) return "?";
  const parts = p.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]![0] ?? "";
    const b = parts[parts.length - 1]![0] ?? "";
    const s = (a + b).toUpperCase();
    return s || "?";
  }
  return p.slice(0, 2).toUpperCase() || "?";
}

/** Стабильный цвет фона для пользователя без своего пресета в данных доски. */
export function kanbanFallbackAccentFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  const hue = h % 360;
  return `hsl(${hue} 48% 40%)`;
}
