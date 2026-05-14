"use client";

import { useEffect, useRef } from "react";

export function ShipmentsStickersPrintButton({
  autoPrint = false,
}: {
  autoPrint?: boolean;
}) {
  const printedRef = useRef(false);
  useEffect(() => {
    if (!autoPrint || printedRef.current) return;
    printedRef.current = true;
    const t = window.setTimeout(() => window.print(), 250);
    return () => window.clearTimeout(t);
  }, [autoPrint]);

  return (
    <button
      type="button"
      onClick={() => {
        window.print();
      }}
      className="rounded-md bg-[var(--sidebar-blue)] px-4 py-1.5 text-sm font-semibold text-white hover:opacity-95"
    >
      Печать этикеток
    </button>
  );
}
