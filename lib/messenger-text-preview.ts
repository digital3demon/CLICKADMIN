/** Одна строка для превью в сайдбаре (без «сырых» переносов). */
export function messengerSidebarPreviewLine(text: string, maxLen = 140): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
}
