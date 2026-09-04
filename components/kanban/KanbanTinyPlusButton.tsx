"use client";

/** Кружок 15px (~+5% к прежним 14px); хитбокс ещё +5% с каждой стороны. */
export function KanbanTinyPlusButton({
  onClick,
  disabled,
  ariaLabel,
  title,
}: {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      onClick={onClick}
      className="relative inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border border-[var(--kaiten-modal-border)] bg-[var(--kaiten-modal-control)] text-[var(--kaiten-modal-text)] hover:bg-[var(--kaiten-modal-input)] disabled:opacity-40"
    >
      <span
        className="pointer-events-auto absolute -inset-1 rounded-full"
        aria-hidden
      />
      <span className="relative text-[0.65rem] font-semibold leading-none">+</span>
    </button>
  );
}
