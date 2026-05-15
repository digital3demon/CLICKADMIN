"use client";

import { useMemo } from "react";

export type StickerRow = {
  id: string;
  clinicLine: string;
  doctorLine: string;
  patientLine: string;
  orderNumber: string;
  qrDataUrl: string;
};

const DEFAULT_W = 58;
const DEFAULT_H = 40;
/** Широкая этикетка: те же поля столбиком на всю ширину (без сжатия врача и пациента в один ряд). */
const WIDE_ASPECT = 1.32;

/** Логотип для печати (`public/stickers/clickadmin-sticker-logo.png`). */
const STICKER_BRAND_LOGO_SRC = "/stickers/clickadmin-sticker-logo.png";

function stickerTextVisualLength(value: string): number {
  return Array.from(value.trim()).reduce((sum, char) => {
    if (/\s/u.test(char)) return sum + 0.45;
    if (/[.,:;№-]/u.test(char)) return sum + 0.35;
    if (/[ЖШЩЮФЫМД]/iu.test(char)) return sum + 1.18;
    if (/[А-ЯЁA-Z]/u.test(char)) return sum + 1.08;
    return sum + 1;
  }, 0);
}

function stickerLineFitClass(value: string, kind: "clinic" | "person" = "clinic"): string {
  const length = stickerTextVisualLength(value);
  const thresholds =
    kind === "person"
      ? { left: 11, sm: 13, xs: 19 }
      : { left: 14, sm: 18, xs: 24 };
  if (kind === "clinic" && length >= 30) return " sticker-line--clinic-long";
  if (length >= thresholds.xs) return " sticker-line--fit-xs";
  if (length >= thresholds.sm) return " sticker-line--fit-sm";
  if (length >= thresholds.left) return " sticker-line--fit-left";
  return "";
}

function hasLongClinicLine(value: string): boolean {
  return stickerTextVisualLength(value) >= 30;
}

type Props = {
  rows: StickerRow[];
  /** Ширина одной этикетки, мм */
  widthMm?: number;
  /** Высота одной этикетки, мм */
  heightMm?: number;
};

export function ShipmentsStickersSheet({ rows, widthMm, heightMm }: Props) {
  const w = widthMm ?? DEFAULT_W;
  const h = heightMm ?? DEFAULT_H;
  const isWide = w / h >= WIDE_ASPECT;

  const css = useMemo(() => {
    const rootVars = `
      .sticker-root {
        --sticker-w: ${w}mm;
        --sticker-h: ${h}mm;
      }
    `;
    const pageBox = `
      .sticker-page {
        width: var(--sticker-w) !important;
        height: var(--sticker-h) !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 1.2mm 1.4mm !important;
        border: none !important;
        border-radius: 1.2mm !important;
        background: #fff !important;
        color: #000 !important;
        color-scheme: light !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-shadow: none !important;
        overflow: hidden !important;
        page-break-inside: avoid !important;
        break-inside: avoid-page !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        font-family: var(--font-body-loaded), "Muller", ui-sans-serif, system-ui, sans-serif !important;
      }
    `;
    const shared = `
      ${rootVars}
      .sticker-page {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        font-family: var(--font-body-loaded), "Muller", ui-sans-serif, system-ui, sans-serif;
        width: var(--sticker-w);
        height: var(--sticker-h);
        box-sizing: border-box;
        padding: 1.2mm 1.4mm;
        border-radius: 1.2mm;
        overflow: hidden;
      }
      .sticker-lines {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
      }
      .sticker-line {
        display: flex;
        gap: 2mm;
        align-items: baseline;
        line-height: 1.02;
        margin-bottom: 0.35mm;
      }
      .sticker-line--full { width: 100%; }
      .sticker-line--fit-left { gap: 1.1mm; }
      .sticker-line--fit-sm { gap: 0.7mm; }
      .sticker-line--fit-xs { gap: 0.45mm; }
      .sticker-line--clinic-long {
        gap: 0.8mm;
        align-items: flex-start;
        margin-bottom: 0.2mm;
      }
      .sticker-k {
        flex: 0 0 13.5mm;
        font-size: clamp(6.4pt, calc(var(--sticker-h) * 0.16), 7.6pt);
        font-weight: 700;
        color: #475569;
        white-space: nowrap;
      }
      .sticker-line--fit-left .sticker-k { flex-basis: 10.5mm; }
      .sticker-line--fit-sm .sticker-k { flex-basis: 8mm; }
      .sticker-line--fit-xs .sticker-k { flex-basis: 6.6mm; font-size: clamp(6.1pt, calc(var(--sticker-h) * 0.155), 7.2pt); }
      .sticker-line--clinic-long .sticker-k {
        flex-basis: 12mm;
        padding-top: 0.3mm;
        font-size: clamp(5.9pt, calc(var(--sticker-h) * 0.145), 6.8pt);
      }
      .sticker-v {
        flex: 1 1 0;
        min-width: 0;
        font-size: clamp(9.8pt, calc(var(--sticker-h) * 0.27), 13pt);
        font-weight: 800;
        color: #0f172a;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        letter-spacing: -0.055em;
      }
      .sticker-line--fit-sm .sticker-v {
        font-size: clamp(8.4pt, calc(var(--sticker-h) * 0.235), 10.4pt);
        letter-spacing: -0.065em;
      }
      .sticker-line--fit-xs .sticker-v {
        font-size: clamp(7.2pt, calc(var(--sticker-h) * 0.205), 9pt);
        letter-spacing: -0.075em;
      }
      .sticker-line--clinic-long .sticker-v {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 3;
        white-space: normal;
        overflow: hidden;
        text-overflow: clip;
        overflow-wrap: anywhere;
        line-height: 0.9;
        font-size: clamp(6.4pt, calc(var(--sticker-h) * 0.17), 7.8pt);
        letter-spacing: -0.09em;
      }
      .sticker-page--long-clinic .sticker-line:not(.sticker-line--clinic-long) {
        margin-bottom: 0.18mm;
      }
      .sticker-page--long-clinic .sticker-line:not(.sticker-line--clinic-long):not(.sticker-line--order) .sticker-k {
        font-size: clamp(5.8pt, calc(var(--sticker-h) * 0.145), 6.8pt);
      }
      .sticker-page--long-clinic .sticker-line:not(.sticker-line--clinic-long):not(.sticker-line--order) .sticker-v {
        font-size: clamp(8.1pt, calc(var(--sticker-h) * 0.225), 10.4pt);
        letter-spacing: -0.07em;
      }
      .sticker-line--order {
        margin-bottom: 0;
      }
      .sticker-line--order .sticker-k {
        font-size: clamp(5.8pt, calc(var(--sticker-h) * 0.145), 6.5pt);
        letter-spacing: -0.06em;
      }
      .sticker-footer {
        flex: 0 0 auto;
        display: flex;
        flex-direction: row;
        align-items: flex-end;
        justify-content: flex-start;
        gap: 2.8mm;
        margin-top: 0;
        width: 100%;
      }
      .sticker-footer-qr-col {
        flex: 0 0 auto;
        display: flex;
        flex-direction: row;
        align-items: flex-end;
        justify-content: center;
        gap: 0.7mm;
        padding: 0;
      }
      .sticker-qr-wrap {
        flex: 0 0 auto;
        width: min(14.2mm, calc(var(--sticker-h) * 0.35));
        height: min(14.2mm, calc(var(--sticker-h) * 0.35));
      }
      .sticker-scan-caption {
        display: flex;
        flex-direction: row;
        align-items: flex-end;
        gap: 0.25mm;
        height: min(14.2mm, calc(var(--sticker-h) * 0.35));
        max-height: min(14.2mm, calc(var(--sticker-h) * 0.35));
        font-size: clamp(5.2pt, calc(var(--sticker-h) * 0.135), 6.4pt);
        line-height: 1;
        font-weight: 800;
        color: #334155;
        letter-spacing: -0.08em;
        white-space: nowrap;
      }
      .sticker-scan-word {
        writing-mode: vertical-rl;
        transform: rotate(180deg);
        text-align: center;
      }
      .sticker-footer-brand-col {
        flex: 1 1 0;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        gap: 0;
        padding: 0;
      }
      .sticker-brand-logo-wrap {
        flex: 0 0 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
      }
      .sticker-brand-logo {
        display: block;
        margin-inline: auto;
        height: min(13.9mm, calc(var(--sticker-h) * 0.34));
        width: auto;
        max-width: min(31mm, calc(var(--sticker-w) * 0.5));
        object-fit: contain;
        object-position: center;
      }
    `;
    const wide = `
      .sticker-page--wide .sticker-k { flex: 0 0 14mm; }
      .sticker-page--wide .sticker-line--fit-left .sticker-k { flex-basis: 11mm; }
      .sticker-page--wide .sticker-line--fit-sm .sticker-k { flex-basis: 8.5mm; }
      .sticker-page--wide .sticker-line--fit-xs .sticker-k { flex-basis: 7mm; }
    `;
    return `
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
        ${pageBox}
        .sticker-page:not(:last-child) {
          page-break-after: always !important;
          break-after: page !important;
        }
        .sticker-page {
          page-break-before: auto !important;
          page-break-inside: avoid !important;
          break-before: auto !important;
          break-inside: avoid-page !important;
        }
      }
      @media screen {
        .sticker-page {
          width: var(--sticker-w);
          height: var(--sticker-h);
          margin-bottom: 10px;
          border: 1px solid #94a3b8;
          border-radius: 1.2mm;
          background: #fff;
          color: #0f172a;
          color-scheme: light;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
      ${shared}
      ${isWide ? wide : ""}
    `;
  }, [w, h, isWide]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        Нет нарядов для печати в этом списке.
      </p>
    );
  }

  return (
    <>
      <style key={`${w}-${h}-${isWide ? 1 : 0}`}>{css}</style>
      <div className="sticker-root">
        {rows.map((r) => {
          const longClinic = hasLongClinicLine(r.clinicLine);
          return (
          <div
            key={r.id}
            className={`sticker-page${isWide ? " sticker-page--wide" : ""}${longClinic ? " sticker-page--long-clinic" : ""}`}
          >
            <div className="sticker-lines">
              <div
                className={`sticker-line${isWide ? " sticker-line--full" : ""}${stickerLineFitClass(r.clinicLine)}`}
              >
                <span className="sticker-k">Клиника</span>
                <span className="sticker-v" title={r.clinicLine}>
                  {r.clinicLine}
                </span>
              </div>
              <div
                className={`sticker-line${isWide ? " sticker-line--full" : ""}${stickerLineFitClass(r.doctorLine, "person")}`}
              >
                <span className="sticker-k">Доктор</span>
                <span className="sticker-v" title={r.doctorLine}>
                  {r.doctorLine}
                </span>
              </div>
              <div
                className={`sticker-line${isWide ? " sticker-line--full" : ""}${stickerLineFitClass(r.patientLine, "person")}`}
              >
                <span className="sticker-k">Пациент</span>
                <span className="sticker-v" title={r.patientLine}>
                  {r.patientLine}
                </span>
              </div>
              <div
                className={`sticker-line sticker-line--order${isWide ? " sticker-line--full" : ""}`}
              >
                <span className="sticker-k">№ заказа</span>
                <span className="sticker-v">{r.orderNumber}</span>
              </div>
            </div>
            <div className="sticker-footer">
              <div className="sticker-footer-qr-col">
                <div className="sticker-qr-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data: URL от qrcode */}
                  <img
                    src={r.qrDataUrl}
                    alt=""
                    width={320}
                    height={320}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="sticker-scan-caption">
                  <span className="sticker-scan-word">Отсканируй</span>
                  <span className="sticker-scan-word">меня</span>
                </div>
              </div>
              <div className="sticker-footer-brand-col">
                <div className="sticker-brand-logo-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element -- PNG из public/stickers */}
                  <img
                    src={STICKER_BRAND_LOGO_SRC}
                    alt="КликАдмин"
                    width={320}
                    height={120}
                    className="sticker-brand-logo"
                  />
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </>
  );
}
