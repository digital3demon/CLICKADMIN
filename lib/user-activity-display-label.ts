/** Подпись в журналах и канбане: сначала ник @handle, иначе имя, иначе часть email. */
export function userActivityDisplayLabel(u: {
  mentionHandle?: string | null;
  displayName?: string | null;
  email?: string | null;
}): string {
  const h = (u.mentionHandle || "").trim();
  if (h) return `@${h}`;
  const n = (u.displayName || "").trim();
  if (n) return n;
  const e = (u.email || "").split("@")[0]?.trim();
  if (e) return e;
  return "—";
}

/** ФИО/имя в CRM для подписи «кто сотрудник» (без приоритета @нику — см. наряд «Оформил»). */
export function userPersonDisplayName(u: {
  mentionHandle?: string | null;
  displayName?: string | null;
  email?: string | null;
}): string {
  const n = (u.displayName || "").trim();
  if (n) return n;
  const e = (u.email || "").split("@")[0]?.trim();
  if (e) return e;
  const h = (u.mentionHandle || "").trim();
  if (h) return `@${h}`;
  return "—";
}
