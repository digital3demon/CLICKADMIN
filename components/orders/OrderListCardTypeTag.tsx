import {
  kaitenCardTypePillColor,
  splitOrderStatusPillLines,
} from "@/lib/kaiten-column-title";

type Props = {
  name: string | null | undefined;
  /** Как статус под № — чуть крупнее. */
  placement?: "tags" | "underOrderNumber";
};

function TypePillLabel({ label }: { label: string }) {
  const lines = splitOrderStatusPillLines(label);
  if (lines.length < 2) {
    return <span className="max-w-full text-center">{label}</span>;
  }
  return (
    <span className="flex max-w-full flex-col text-center leading-tight">
      {lines.map((line) => (
        <span key={line} className="max-w-full whitespace-normal break-words">
          {line}
        </span>
      ))}
    </span>
  );
}

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
    ? "px-2 py-0.5 text-[11px] leading-tight sm:px-2.5 sm:text-[12px]"
    : "order-list-tag-pill";

  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center justify-center rounded-full border text-center font-semibold uppercase tracking-wide shadow-sm ${padClass} ${
        color
          ? "border-transparent"
          : "border-[var(--card-border)] bg-[var(--surface-subtle)] text-[var(--text-strong)]"
      }`}
      style={
        color
          ? {
              background: `color-mix(in srgb, ${color} 34%, var(--card-bg))`,
              color: `color-mix(in srgb, ${color} 82%, var(--app-text))`,
              borderColor: `color-mix(in srgb, ${color} 42%, transparent)`,
            }
          : undefined
      }
      title={`Тип карточки: ${label}`}
    >
      <TypePillLabel label={label} />
    </span>
  );
}
