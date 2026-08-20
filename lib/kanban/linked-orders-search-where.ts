/**
 * Поиск GET /api/kanban/linked-orders?q=
 * Номер наряда в БД: YYMM-NNN (ASCII дефис). Timezone не используется.
 * Врач/клиника — через ordersSearchWhere (clients prisma), не nested doctor на orders DB.
 */

/** «299» → «-299». Короче 3 не суффикс: «14» ≠ наряд, это дата 14.08. */
export function kanbanLinkedOrderNumberSuffixContains(q: string): string | null {
  const n = q.replace(/\s+/g, " ").trim();
  if (!/^\d{3,}$/.test(n)) return null;
  return `-${n}`;
}
