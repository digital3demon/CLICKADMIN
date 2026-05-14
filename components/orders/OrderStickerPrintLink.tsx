import Link from "next/link";

const ICON_TABLE_CLASS =
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-body)] shadow-sm hover:bg-[var(--table-row-hover)] sm:h-7 sm:w-7";

function StickerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 4h12a2 2 0 0 1 2 2v10.5a2 2 0 0 1-2 2H8.5L4 14V6a2 2 0 0 1 2-2Z" />
      <path d="M8 18.5V15a1 1 0 0 0-1-1H4" />
      <path d="M8 8h8" />
      <path d="M8 11h6" />
    </svg>
  );
}

export function OrderStickerPrintLink({
  orderId,
  className,
}: {
  orderId: string;
  className?: string;
}) {
  const href = `/shipments/stickers-print?orderId=${encodeURIComponent(orderId)}`;
  return (
    <Link
      href={href}
      className={[ICON_TABLE_CLASS, className].filter(Boolean).join(" ")}
      title="Печать этикетки"
      aria-label="Печать этикетки"
    >
      <StickerIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
    </Link>
  );
}
