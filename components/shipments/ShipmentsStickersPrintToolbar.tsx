"use client";

import Link from "next/link";
import { ShipmentsStickersPrintButton } from "@/components/shipments/ShipmentsStickersPrintButton";
import {
  ShipmentsStickersSheet,
  type StickerRow,
} from "@/components/shipments/ShipmentsStickersSheet";
import type { StickerTemplatePreset } from "@/lib/sticker-template";

export function ShipmentsStickersPrintToolbar({
  rows,
  backHref,
  preset,
  autoPrint = false,
}: {
  rows: StickerRow[];
  backHref: string;
  preset: StickerTemplatePreset;
  autoPrint?: boolean;
}) {
  const { widthMm, heightMm, name } = preset;

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
      <p className="no-print mb-3 max-w-2xl text-xs text-[var(--text-secondary)]">
        Макет: {name} · {widthMm}×{heightMm} мм. В диалоге печати — масштаб 100 %.
      </p>
      <ShipmentsStickersSheet rows={rows} preset={preset} />
    </>
  );
}
