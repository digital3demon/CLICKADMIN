export type StickerRow = {
  id: string;
  clinicLine: string;
  doctorLine: string;
  patientLine: string;
  orderNumber: string;
  qrDataUrl: string;
};

export function ShipmentsStickersSheet({ rows }: { rows: StickerRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        Нет нарядов для печати в этом списке.
      </p>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          @page { size: 58mm 40mm; margin: 0; }
          html, body { height: auto !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
          .sticker-root { margin: 0 !important; padding: 0 !important; }
          .sticker-page {
            width: 58mm !important;
            height: 40mm !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
            margin: 0 !important;
            padding: 1.8mm 2mm !important;
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
          .sticker-page:last-child { page-break-after: auto !important; break-after: auto !important; }
        }
        @media screen {
          .sticker-page {
            width: 58mm;
            height: 40mm;
            box-sizing: border-box;
            margin-bottom: 10px;
            border: 1px solid #94a3b8;
            border-radius: 4px;
            padding: 1.8mm 2mm;
            background: #fff;
            color: #0f172a;
          }
        }
        .sticker-page {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          font-family: var(--font-body-loaded), "Muller", ui-sans-serif, system-ui, sans-serif;
        }
        .sticker-lines { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; justify-content: flex-start; }
        .sticker-line { display: flex; gap: 1mm; align-items: baseline; line-height: 1.12; margin-bottom: 0.75mm; }
        .sticker-k {
          flex: 0 0 13mm;
          font-size: 5.6pt;
          font-weight: 500;
          color: #64748b;
        }
        .sticker-v {
          flex: 1 1 0;
          min-width: 0;
          font-size: 8.2pt;
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
          align-items: center;
          justify-content: flex-start;
          gap: 1.4mm;
          margin-top: 0.6mm;
        }
        .sticker-qr-wrap { flex: 0 0 13.5mm; width: 13.5mm; height: 13.5mm; }
        .sticker-footer-hint {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 0.7mm;
          min-width: 0;
        }
        .sticker-arrow-to-qr {
          flex-shrink: 0;
          font-size: 7.5pt;
          line-height: 1;
          color: #64748b;
          font-weight: 600;
          padding-bottom: 0.15em;
        }
        .sticker-scan-text {
          font-size: 5.8pt;
          line-height: 1.12;
          font-weight: 600;
          color: #475569;
          letter-spacing: -0.01em;
        }
      `}</style>
      <div className="sticker-root">
        {rows.map((r) => (
          <div key={r.id} className="sticker-page">
            <div className="sticker-lines">
              <div className="sticker-line">
                <span className="sticker-k">Клиника</span>
                <span className="sticker-v" title={r.clinicLine}>
                  {r.clinicLine}
                </span>
              </div>
              <div className="sticker-line">
                <span className="sticker-k">Доктор</span>
                <span className="sticker-v" title={r.doctorLine}>
                  {r.doctorLine}
                </span>
              </div>
              <div className="sticker-line">
                <span className="sticker-k">Пациент</span>
                <span className="sticker-v" title={r.patientLine}>
                  {r.patientLine}
                </span>
              </div>
              <div className="sticker-line">
                <span className="sticker-k">№ заказа</span>
                <span className="sticker-v">{r.orderNumber}</span>
              </div>
            </div>
            <div className="sticker-footer">
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
              <div className="sticker-footer-hint">
                <span className="sticker-arrow-to-qr" aria-hidden>
                  ←
                </span>
                <div className="sticker-scan-text">
                  Отсканируй
                  <br />
                  меня!
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
