"use client";

import { useMemo } from "react";
import type { StickerTemplateBlock, StickerTemplatePreset } from "@/lib/sticker-template";
import { STICKER_BLOCK_DEFS } from "@/lib/sticker-template";

export type StickerLabelData = {
  clinicLine: string;
  addressLine: string;
  doctorLine: string;
  patientLine: string;
  orderNumber: string;
  qrDataUrl: string;
};

const STICKER_BRAND_LOGO_SRC = "/stickers/clickadmin-sticker-logo.png";

function fieldValue(data: StickerLabelData, id: StickerTemplateBlock["id"]): string {
  switch (id) {
    case "clinic":
      return data.clinicLine;
    case "address":
      return data.addressLine;
    case "doctor":
      return data.doctorLine;
    case "patient":
      return data.patientLine;
    case "orderNumber":
      return data.orderNumber;
    default:
      return "";
  }
}

type OneLabelProps = {
  data: StickerLabelData;
  preset: StickerTemplatePreset;
  editorMode?: boolean;
  selectedBlockId?: StickerTemplateBlock["id"] | null;
  onSelectBlock?: (id: StickerTemplateBlock["id"]) => void;
  onBlockPointerDown?: (
    id: StickerTemplateBlock["id"],
    e: React.PointerEvent<HTMLDivElement>,
  ) => void;
};

export function StickerLabelOne({
  data,
  preset,
  editorMode = false,
  selectedBlockId = null,
  onSelectBlock,
  onBlockPointerDown,
}: OneLabelProps) {
  const { widthMm, heightMm, blocks } = preset;

  return (
    <div
      className="sticker-page sticker-page--template"
      style={
        {
          "--sticker-w": `${widthMm}mm`,
          "--sticker-h": `${heightMm}mm`,
        } as React.CSSProperties
      }
    >
      {blocks
        .filter((b) => b.visible)
        .map((block) => {
          const def = STICKER_BLOCK_DEFS[block.id];
          const selected = editorMode && selectedBlockId === block.id;
          const style: React.CSSProperties = {
            left: `${block.xPct}%`,
            top: `${block.yPct}%`,
            transform: `scale(${block.scale})`,
            transformOrigin: "top left",
          };

          if (def.kind === "field") {
            const value = fieldValue(data, block.id);
            const labelPt = Math.max(5, block.fontSizePt * 0.92);
            return (
              <div
                key={block.id}
                role={editorMode ? "button" : undefined}
                tabIndex={editorMode ? 0 : undefined}
                className={[
                  "sticker-tpl-block sticker-tpl-block--field",
                  selected ? "sticker-tpl-block--selected" : "",
                ].join(" ")}
                style={style}
                onClick={
                  editorMode && onSelectBlock
                    ? () => onSelectBlock(block.id)
                    : undefined
                }
                onPointerDown={
                  editorMode && onBlockPointerDown
                    ? (e) => onBlockPointerDown(block.id, e)
                    : undefined
                }
              >
                <span
                  className="sticker-tpl-k"
                  style={{ fontSize: `${labelPt}pt` }}
                >
                  {def.valueLabel}
                </span>
                <span
                  className="sticker-tpl-v"
                  style={{ fontSize: `${block.fontSizePt}pt` }}
                  title={value}
                >
                  {value}
                </span>
              </div>
            );
          }

          if (block.id === "qr") {
            return (
              <div
                key={block.id}
                role={editorMode ? "button" : undefined}
                className={[
                  "sticker-tpl-block sticker-tpl-block--qr",
                  selected ? "sticker-tpl-block--selected" : "",
                ].join(" ")}
                style={style}
                onClick={
                  editorMode && onSelectBlock
                    ? () => onSelectBlock(block.id)
                    : undefined
                }
                onPointerDown={
                  editorMode && onBlockPointerDown
                    ? (e) => onBlockPointerDown(block.id, e)
                    : undefined
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- data: URL */}
                <img
                  src={data.qrDataUrl}
                  alt=""
                  width={320}
                  height={320}
                  className="sticker-tpl-qr-img"
                />
                <div className="sticker-tpl-scan-caption">
                  <span className="sticker-tpl-scan-word">Отсканируй</span>
                  <span className="sticker-tpl-scan-word">меня</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={block.id}
              role={editorMode ? "button" : undefined}
              className={[
                "sticker-tpl-block sticker-tpl-block--logo",
                selected ? "sticker-tpl-block--selected" : "",
              ].join(" ")}
              style={style}
              onClick={
                editorMode && onSelectBlock
                  ? () => onSelectBlock(block.id)
                  : undefined
              }
              onPointerDown={
                editorMode && onBlockPointerDown
                  ? (e) => onBlockPointerDown(block.id, e)
                  : undefined
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={STICKER_BRAND_LOGO_SRC}
                alt="КликАдмин"
                width={320}
                height={120}
                className="sticker-tpl-logo-img"
              />
            </div>
          );
        })}
    </div>
  );
}

type SheetProps = {
  rows: Array<StickerLabelData & { id: string }>;
  preset: StickerTemplatePreset;
};

export function StickerLabelSheet({ rows, preset }: SheetProps) {
  const w = preset.widthMm;
  const h = preset.heightMm;

  const css = useMemo(
    () => `
      .sticker-root {
        --sticker-w: ${w}mm;
        --sticker-h: ${h}mm;
      }
      .sticker-page--template {
        position: relative;
        width: var(--sticker-w);
        height: var(--sticker-h);
        box-sizing: border-box;
        padding: 1.2mm 1.4mm;
        overflow: hidden;
        font-family: var(--font-body-loaded), "Muller", ui-sans-serif, system-ui, sans-serif;
        background: #fff;
        color: #0f172a;
        color-scheme: light;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .sticker-tpl-block {
        position: absolute;
        max-width: 96%;
        z-index: 1;
      }
      .sticker-tpl-block--field {
        display: flex;
        gap: 1.5mm;
        align-items: baseline;
        line-height: 1.05;
        min-width: 0;
      }
      .sticker-tpl-k {
        flex: 0 0 auto;
        font-weight: 700;
        color: #475569;
        white-space: nowrap;
      }
      .sticker-tpl-v {
        flex: 1 1 0;
        min-width: 0;
        font-weight: 800;
        color: #0f172a;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        letter-spacing: -0.05em;
      }
      .sticker-tpl-block--qr {
        display: flex;
        flex-direction: row;
        align-items: flex-end;
        gap: 0.7mm;
      }
      .sticker-tpl-qr-img {
        width: 14.2mm;
        height: 14.2mm;
        object-fit: contain;
        display: block;
      }
      .sticker-tpl-scan-caption {
        display: flex;
        flex-direction: row;
        align-items: flex-end;
        gap: 0.25mm;
        height: 14.2mm;
        font-size: 6pt;
        line-height: 1;
        font-weight: 800;
        color: #334155;
        letter-spacing: -0.08em;
        white-space: nowrap;
      }
      .sticker-tpl-scan-word {
        writing-mode: vertical-rl;
        transform: rotate(180deg);
      }
      .sticker-tpl-logo-img {
        height: 13.9mm;
        width: auto;
        max-width: 31mm;
        object-fit: contain;
        display: block;
      }
      .sticker-tpl-block--selected {
        outline: 2px dashed #2563eb;
        outline-offset: 1px;
        z-index: 3;
        cursor: grab;
      }
      @media print {
        @page { size: ${w}mm ${h}mm; margin: 0; }
        html, body {
          width: ${w}mm !important;
          min-width: 0 !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #fff !important;
          overflow: visible !important;
        }
        body * { visibility: hidden !important; }
        .sticker-root, .sticker-root * { visibility: visible !important; }
        .sticker-print-frame,
        .sticker-print-frame > div,
        main {
          width: ${w}mm !important;
          min-width: 0 !important;
          max-width: ${w}mm !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }
        .sticker-root {
          width: ${w}mm !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }
        .sticker-page--template {
          width: var(--sticker-w) !important;
          height: var(--sticker-h) !important;
          margin: 0 !important;
          padding: 1.2mm 1.4mm !important;
          border: none !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          page-break-inside: avoid !important;
          break-inside: avoid-page !important;
        }
        .sticker-page--template:not(:last-child) {
          page-break-after: always !important;
          break-after: page !important;
        }
        .sticker-tpl-block--selected {
          outline: none !important;
        }
      }
      @media screen {
        .sticker-page--template {
          margin-bottom: 10px;
          border: 1px solid #94a3b8;
          border-radius: 1.2mm;
        }
      }
    `,
    [w, h],
  );

  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        Нет нарядов для печати в этом списке.
      </p>
    );
  }

  return (
    <>
      <style key={`tpl-${w}-${h}`}>{css}</style>
      <div className="sticker-root">
        {rows.map((r) => (
          <StickerLabelOne
            key={r.id}
            data={r}
            preset={preset}
          />
        ))}
      </div>
    </>
  );
}
