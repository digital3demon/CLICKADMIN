/**
 * Акцент строки списка нарядов.
 *
 * Голубая подсветка — только открытый запрос протетики («???»).
 * Корректировки, «протетика заказана» и прочее — пилюли в облаке тегов.
 * Блокировка Kaiten обрабатывается отдельно вызывающим кодом.
 */

export type OrderListRowAccentKind = "prosthetics-pending";

export type OrderListHarmonyRowState =
  | "blocked"
  | "prosthetics-pending"
  | "shipped"
  | "default";

export function resolveOrderListRowAccentKind(opts: {
  listPendingChatCorrections?: boolean;
  listCompositionMismatch?: boolean;
  orderAttentionWarning?: boolean;
  listPendingProstheticsRequests?: boolean;
  prostheticsOrdered?: boolean;
}): OrderListRowAccentKind | null {
  const ordered = opts.prostheticsOrdered === true;
  if (!ordered && opts.listPendingProstheticsRequests === true) {
    return "prosthetics-pending";
  }
  return null;
}

/**
 * Рамка + заметный тинт всей строки (как у «отгружено»).
 * Фон на tr и td — sticky-ячейки иначе перекрывают тинт.
 */
export function orderListRowAccentClass(
  kind: OrderListRowAccentKind | null | undefined,
): string {
  if (kind === "prosthetics-pending") {
    return [
      "border-b-2 border-sky-500/55 border-l-[3px] border-l-sky-500",
      "bg-sky-100/90 dark:border-sky-600/55 dark:border-l-sky-400 dark:bg-sky-950/55",
      "[&>td]:bg-sky-100/90 dark:[&>td]:bg-sky-950/55",
    ].join(" ");
  }
  return "";
}

/** Карточка mobile: рамка + тот же тинт, что у строки. */
export function orderListMobileCardAccentClass(
  kind: OrderListRowAccentKind | null | undefined,
): string {
  if (kind === "prosthetics-pending") {
    return "rounded-lg border-2 border-sky-400/90 bg-sky-100/90 dark:border-sky-500/80 dark:bg-sky-950/55";
  }
  return "";
}

export function resolveOrderListHarmonyRowState(opts: {
  blocked?: boolean;
  shipped?: boolean;
  accent: OrderListRowAccentKind | null;
}): OrderListHarmonyRowState {
  if (opts.blocked) return "blocked";
  if (opts.accent === "prosthetics-pending") return "prosthetics-pending";
  if (opts.shipped) return "shipped";
  return "default";
}

/** Базовая строка classic-темы + акцент (без blocked). */
export function mergeOrderListRowClass(opts: {
  shipped?: boolean;
  accent: OrderListRowAccentKind | null;
  /** Дефолтная нижняя граница / hover, если не shipped. */
  idleClass?: string;
  shippedClass: string;
}): string {
  const accent = orderListRowAccentClass(opts.accent);
  /* Акцент полностью задаёт тинт строки — shipped-фон не перекрываем. */
  if (accent) return accent;
  if (opts.shipped) return opts.shippedClass;
  return (
    opts.idleClass ??
    "border-b-2 border-[var(--card-border)] transition-colors hover:bg-[var(--table-row-hover)]"
  );
}
