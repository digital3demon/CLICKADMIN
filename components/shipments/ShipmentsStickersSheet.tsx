export type StickerRow = {
  id: string;
  clinicLine: string;
  doctorLine: string;
  patientLine: string;
  orderNumber: string;
  qrDataUrl: string;
};

export function ShipmentsStickersSheet({ rows }: { rows: StickerRow[] }) {  if (rows.length === 0) {
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
        .sticker-grid { display: flex; flex-direction: row; align-items: flex-start; gap: 1.5mm; height: 100%; }
        .sticker-text { flex: 1 1 0; min-width: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
        .sticker-line { display: flex; gap: 1mm; font-size: 6.8pt; line-height: 1.15; margin-bottom: 0.9mm; }
        .sticker-k { flex: 0 0 14mm; color: #334155; font-weight: 600; }
        .sticker-v { flex: 1 1 0; min-width: 0; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sticker-qr { flex: 0 0 13.5mm; width: 13.5mm; height: 13.5mm; }
      `}</style>
      <div className="sticker-root">
        {rows.map((r) => (
          <div key={r.id} className="sticker-page">
            <div className="sticker-grid">
              <div className="sticker-text">
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
              <div className="sticker-qr shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- data: URL от qrcode */}
                <img
                  src={r.qrDataUrl}
                  alt=""
                  width={108}
                  height={108}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
