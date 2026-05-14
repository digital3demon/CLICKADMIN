"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ShipmentsStickersPrintButton } from "@/components/shipments/ShipmentsStickersPrintButton";
import {
  ShipmentsStickersSheet,
  type StickerRow,
} from "@/components/shipments/ShipmentsStickersSheet";

export function ShipmentsStickersPrintToolbar({
  rows,
  backHref,
  widthMm,
  heightMm,
  autoPrint = false,
}: {
  rows: StickerRow[];
  backHref: string;
  widthMm: number;
  heightMm: number;
  autoPrint?: boolean;
}) {
  const hint = useMemo(() => {
    const r = widthMm / heightMm;
    if (r >= 1.32) {
      return "При таком соотношении сторон врач и пациент выводятся в одну строку.";
    }
    return "Внизу слева компактный QR и «Отсканируй меня», справа — крупный логотип.";
  }, [widthMm, heightMm]);

  const layoutNote = useMemo(() => {
    const r = widthMm / heightMm;
    const wide = r >= 1.32;
    return `Текущий макет: ${widthMm}×${heightMm} мм${wide ? " · врач и пациент в ряд" : ""}.`;
  }, [widthMm, heightMm]);

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center gap-3">
        <Link
          href={backHref}
          className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
        >
          ← К отгрузкам
        </Link>
        <ShipmentsStickersPrintButton autoPrint={autoPrint} />
        <Link
          href="/directory/print"
          className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-3 py-1.5 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
        >
          Настройки печати
        </Link>
      </div>
      <p className="no-print mb-2 text-xs text-[var(--text-secondary)]">{layoutNote}</p>
      <p className="no-print mb-3 max-w-2xl text-xs text-[var(--text-secondary)]">{hint}</p>
      <ShipmentsStickersSheet rows={rows} widthMm={widthMm} heightMm={heightMm} />
    </>
  );
}
