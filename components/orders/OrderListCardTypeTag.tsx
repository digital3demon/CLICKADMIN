import { kaitenCardTypePillColor } from "@/lib/kaiten-column-title";

type Props = {
  name: string | null | undefined;
  /** Как статус под № — чуть крупнее. */
  placement?: "tags" | "underOrderNumber";
};

/**
 * Пилюля типа карточки канбана / Kaiten в списке нарядов.
 */
export function OrderListCardTypeTag({
  name,
  placement = "tags",
}: Props) {
  const label = String(name || "").trim();
  if (!label) {
    return (
      <span className="text-[var(--text-muted)]" title="Тип карточки не задан">
        —
      </span>
    );
  }
  const color = kaitenCardTypePillColor(label);
  const underOrder = placement === "underOrderNumber";
  const padClass = underOrder
    ? "px-1.5 py-px text-[9px] leading-tight sm:px-2 sm:text-[10px]"
    : "order-list-tag-pill";

  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center justify-center rounded-full text-center font-medium uppercase tracking-wide ${padClass} ${
        color
          ? ""
          : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] ring-1 ring-[var(--card-border)]"
      }`}
      style={
        color
          ? {
              background: `color-mix(in srgb, ${color} 14%, var(--card-bg))`,
              color: `color-mix(in srgb, ${color} 42%, var(--text-secondary))`,
              boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 22%, transparent)`,
            }
          : undefined
      }
      title={`Тип карточки: ${label}`}
    >
      <span className="max-w-full truncate">{label}</span>
    </span>
  );
}
