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

/** Логотип для печати — ClickAdmin (лежит в `public/stickers/`). */
const STICKER_BRAND_LOGO_SRC = "/stickers/clickadmin-logo.png";

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
        padding: 1.6mm 1.8mm !important;
        border: none !important;
        border-radius: 0 !important;
        background: #fff !important;
        color: #000 !important;
        box-shadow: none !important;
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
        padding: 1.6mm 1.8mm;
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
        gap: 1mm;
        align-items: baseline;
        line-height: 1.12;
        margin-bottom: 0.65mm;
      }
      .sticker-line--full { width: 100%; }
      .sticker-k {
        flex: 0 0 13mm;
        font-size: 5.6pt;
        font-weight: 500;
        color: #64748b;
      }
      .sticker-v {
        flex: 1 1 0;
        min-width: 0;
        font-size: clamp(6.5pt, calc(var(--sticker-h) * 0.19), 8.4pt);
        font-weight: 700;
        color: #0f172a;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .sticker-footer {
        flex: 0 0 auto;
        display: flex;
        flex-direction: row;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1.5mm;
        margin-top: 0.4mm;
        width: 100%;
      }
      .sticker-footer-qr-col {
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.35mm;
      }
      .sticker-qr-wrap {
        flex: 0 0 auto;
        width: min(13.5mm, calc(var(--sticker-h) * 0.36));
        height: min(13.5mm, calc(var(--sticker-h) * 0.36));
      }
      .sticker-scan-caption {
        max-width: 16mm;
        text-align: center;
        font-size: clamp(4.5pt, calc(var(--sticker-h) * 0.125), 5.4pt);
        line-height: 1.08;
        font-weight: 700;
        color: #334155;
        letter-spacing: -0.02em;
      }
      .sticker-footer-brand-col {
        flex: 1 1 0;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        gap: 0.3mm;
      }
      .sticker-made-in {
        font-size: clamp(4.2pt, calc(var(--sticker-h) * 0.11), 5pt);
        line-height: 1;
        font-weight: 800;
        letter-spacing: 0.06em;
        color: #0f172a;
        text-transform: uppercase;
      }
      .sticker-brand-logo {
        display: block;
        height: min(11mm, calc(var(--sticker-h) * 0.3));
        width: auto;
        max-width: 100%;
        object-fit: contain;
      }
    `;
    const wide = `
      .sticker-page--wide .sticker-k { flex: 0 0 10mm; font-size: 5.3pt; }
    `;
    return `
      @media print {
        @page { size: ${w}mm ${h}mm; margin: 0; }
        html, body { height: auto !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
        .sticker-root { margin: 0 !important; padding: 0 !important; }
        ${pageBox}
        .sticker-page:not(:last-child) {
          page-break-after: always !important;
          break-after: page !important;
        }
      }
      @media screen {
        .sticker-page {
          width: var(--sticker-w);
          height: var(--sticker-h);
          margin-bottom: 10px;
          border: 1px solid #94a3b8;
          border-radius: 4px;
          background: #fff;
          color: #0f172a;
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
        {rows.map((r) => (
          <div
            key={r.id}
            className={`sticker-page${isWide ? " sticker-page--wide" : ""}`}
          >
            <div className="sticker-lines">
              <div
                className={`sticker-line${isWide ? " sticker-line--full" : ""}`}
              >
                <span className="sticker-k">Клиника</span>
                <span className="sticker-v" title={r.clinicLine}>
                  {r.clinicLine}
                </span>
              </div>
              <div
                className={`sticker-line${isWide ? " sticker-line--full" : ""}`}
              >
                <span className="sticker-k">Доктор</span>
                <span className="sticker-v" title={r.doctorLine}>
                  {r.doctorLine}
                </span>
              </div>
              <div
                className={`sticker-line${isWide ? " sticker-line--full" : ""}`}
              >
                <span className="sticker-k">Пациент</span>
                <span className="sticker-v" title={r.patientLine}>
                  {r.patientLine}
                </span>
              </div>
              <div
                className={`sticker-line${isWide ? " sticker-line--full" : ""}`}
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
                    width={108}
                    height={108}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="sticker-scan-caption">Отсканируй меня</div>
              </div>
              <div className="sticker-footer-brand-col">
                <div className="sticker-made-in">Сделано в</div>
                {/* eslint-disable-next-line @next/next/no-img-element -- статичный PNG для печати */}
                <img
                  src={STICKER_BRAND_LOGO_SRC}
                  alt=""
                  width={200}
                  height={80}
                  className="sticker-brand-logo"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
