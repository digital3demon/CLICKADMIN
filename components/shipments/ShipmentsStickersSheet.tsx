"use client";

import { StickerLabelSheet } from "@/components/stickers/StickerLabelView";
import type { StickerTemplatePreset } from "@/lib/sticker-template";
import { createDefaultPreset } from "@/lib/sticker-template";

export type StickerRow = {
  id: string;
  clinicLine: string;
  addressLine: string;
  doctorLine: string;
  patientLine: string;
  orderNumber: string;
  qrDataUrl: string;
};

type Props = {
  rows: StickerRow[];
  preset?: StickerTemplatePreset;
  /** @deprecated Используйте preset */
  widthMm?: number;
  /** @deprecated Используйте preset */
  heightMm?: number;
};

export function ShipmentsStickersSheet({
  rows,
  preset,
  widthMm,
  heightMm,
}: Props) {
  const resolved =
    preset ??
    createDefaultPreset(
      widthMm ?? 58,
      heightMm ?? 40,
    );

  return <StickerLabelSheet rows={rows} preset={resolved} />;
}
