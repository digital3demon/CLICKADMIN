/**
 * Декоративное напоминание о сроке (иллюстрация в `public/kanban/deadline-hint.png`).
 * Родитель колонки модалки кладёт блок внизу — нижний край картинки совпадает с низом панели.
 */
export function DeadlineTomorrowHint() {
  return (
    <div
      className="pointer-events-none flex w-full items-end justify-start leading-none select-none"
      role="img"
      aria-label="Напоминание о внутреннем сроке"
    >
      <img
        src="/kanban/deadline-hint.png"
        alt=""
        className="block h-auto max-h-[min(52vh,26rem)] w-auto max-w-[min(100%,26rem)] object-contain object-bottom"
        decoding="async"
      />
    </div>
  );
}
