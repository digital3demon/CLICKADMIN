"use client";

export function ShipmentsStickersPrintButton({
  onAfterPrint,
}: {
  onAfterPrint?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        window.print();
        onAfterPrint?.();
      }}
      className="rounded-md bg-[var(--sidebar-blue)] px-4 py-1.5 text-sm font-semibold text-white hover:opacity-95"
    >
      Печать этикеток
    </button>
  );
}
