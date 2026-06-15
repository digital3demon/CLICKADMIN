import type { PrismaClient } from "@prisma/client";
import QRCode from "qrcode";
import type { StickerRow } from "@/components/shipments/ShipmentsStickersSheet";
import { ensureStickerPublicTokensForOrders } from "@/lib/order-sticker-token";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import type { ShipmentStickerPrintOrder } from "@/lib/shipments-stickers-print-load";
import {
  stickerPublicHubAbsoluteUrl,
  stickerPublicHubPath,
} from "@/lib/sticker-public-path";

type QrModel = {
  modules: {
    size: number;
    get: (x: number, y: number) => number;
  };
};

function isFinderCell(x: number, y: number, size: number): boolean {
  const inTop = y >= 0 && y < 7;
  const inLeft = x >= 0 && x < 7;
  const inRight = x >= size - 7 && x < size;
  const inBottom = y >= size - 7 && y < size;
  return (inTop && inLeft) || (inTop && inRight) || (inBottom && inLeft);
}

function finderCenter(offsetX: number, offsetY: number, quiet: number): string {
  const cx = quiet + offsetX + 3.5;
  const cy = quiet + offsetY + 3.5;
  return [
    `<circle cx="${cx}" cy="${cy}" r="3.5" fill="#0f172a"/>`,
    `<circle cx="${cx}" cy="${cy}" r="2.25" fill="#fff"/>`,
    `<circle cx="${cx}" cy="${cy}" r="1.25" fill="#0f172a"/>`,
  ].join("");
}

function roundedQrDataUrl(text: string): string {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" }) as unknown as QrModel;
  const size = qr.modules.size;
  const quiet = 1;
  const viewSize = size + quiet * 2;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" shape-rendering="geometricPrecision">`,
    `<rect width="${viewSize}" height="${viewSize}" fill="#fff"/>`,
  ];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (qr.modules.get(x, y) !== 1 || isFinderCell(x, y, size)) continue;
      parts.push(
        `<rect x="${x + quiet}" y="${y + quiet}" width="1" height="1" rx="0.38" ry="0.38" fill="#0f172a"/>`,
      );
    }
  }

  parts.push(finderCenter(0, 0, quiet));
  parts.push(finderCenter(size - 7, 0, quiet));
  parts.push(finderCenter(0, size - 7, quiet));
  parts.push("</svg>");

  return `data:image/svg+xml;base64,${Buffer.from(parts.join("")).toString("base64")}`;
}

/** Строки этикеток для печати: токены QR, подписи полей, порядок как в списке заказов. */
export async function buildShipmentStickerRows(
  ordersDb: PrismaClient,
  tenantId: string,
  orders: ShipmentStickerPrintOrder[],
  opts: { originForQr: string; tenantSlug: string },
): Promise<StickerRow[]> {
  if (orders.length === 0) return [];

  await ensureStickerPublicTokensForOrders(
    ordersDb,
    tenantId,
    orders.map((o) => o.id),
  );

  const tokenRows = await ordersDb.order.findMany({
    where: { tenantId, id: { in: orders.map((o) => o.id) } },
    select: { id: true, stickerPublicToken: true },
  });
  const tokenById = new Map<string, string>();
  for (const r of tokenRows) {
    const t = (r.stickerPublicToken || "").trim();
    if (t) tokenById.set(r.id, t);
  }

  const { originForQr, tenantSlug } = opts;

  return Promise.all(
    orders.map(async (o) => {
      const tok = tokenById.get(o.id) || "";
      const pathOnly = stickerPublicHubPath(tenantSlug, tok);
      const hubUrl = originForQr
        ? stickerPublicHubAbsoluteUrl(originForQr, tenantSlug, tok)
        : pathOnly;

      const qrDataUrl = tok ? roundedQrDataUrl(hubUrl) : "";

      const clinicLine = (o.clinic?.name || "Частная практика").trim() || "—";
      const addressLine = (o.clinic?.address || "").trim() || "—";
      const doctorLine = personNameSurnameInitials(o.doctor.fullName) || o.doctor.fullName.trim();
      const patientLine =
        personNameSurnameInitials(o.patientName) || (o.patientName || "").trim() || "—";

      return {
        id: o.id,
        clinicLine,
        addressLine,
        doctorLine,
        patientLine,
        orderNumber: o.orderNumber,
        qrDataUrl,
      };
    }),
  );
}
