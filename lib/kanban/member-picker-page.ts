/** Три столбца × 15 человек. Больше — следующая страница, не прокрутка столбца. */
export const KANBAN_MEMBER_PICKER_PAGE_SIZE = 45;

export function sliceKanbanMemberPickerPage<T>(
  items: readonly T[],
  page: number,
): { pageCount: number; page: number; items: T[] } {
  const pageCount = Math.max(
    1,
    Math.ceil(items.length / KANBAN_MEMBER_PICKER_PAGE_SIZE),
  );
  const safe = Math.min(Math.max(0, page), pageCount - 1);
  const start = safe * KANBAN_MEMBER_PICKER_PAGE_SIZE;
  return {
    pageCount,
    page: safe,
    items: items.slice(start, start + KANBAN_MEMBER_PICKER_PAGE_SIZE),
  };
}

export function splitPickerIntoColumns<T>(items: readonly T[]): [T[], T[], T[]] {
  if (items.length === 0) return [[], [], []];
  const size = Math.ceil(items.length / 3);
  return [
    items.slice(0, size),
    items.slice(size, size * 2),
    items.slice(size * 2),
  ];
}
