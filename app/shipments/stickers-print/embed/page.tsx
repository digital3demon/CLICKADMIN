import { headers } from "next/headers";
import { StickerEmbedAutoPrint } from "@/components/shipments/StickerEmbedAutoPrint";
import { ShipmentsStickersSheet } from "@/components/shipments/ShipmentsStickersSheet";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { publicOriginFromHeaders } from "@/lib/public-origin-from-headers";
import { loadOrdersForShipmentsStickersPrint } from "@/lib/shipments-stickers-print-load";
import { buildShipmentStickerRows } from "@/lib/shipment-sticker-rows.server";
import { getTenantActiveStickerPreset } from "@/lib/sticker-print-settings.server";
import { getSiteOrigin } from "@/lib/site-origin-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Минимальная страница для печати этикетки из скрытого iframe (без тулбара и навигации). */
export default async function ShipmentsStickersPrintEmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const sp = await searchParams;
  const session = await getSessionFromCookies();
  const tenantId = session ? await getTenantIdForSession(session) : null;

  if (!tenantId) {
    return <p className="text-sm text-red-600">Войдите в CRM.</p>;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });
  const tenantSlug = tenant?.slug?.trim() || "";
  if (!tenantSlug) {
    return <p className="text-sm text-red-600">У организации не задан slug.</p>;
  }

  const ordersDb = await getOrdersPrisma();
  const siteOrigin = await getSiteOrigin();
  const hdr = await headers();
  const originForQr =
    (siteOrigin && siteOrigin.trim()) || publicOriginFromHeaders(hdr) || "";

  const { orders, error } = await loadOrdersForShipmentsStickersPrint(ordersDb, tenantId, {
    orderId: typeof sp.orderId === "string" ? sp.orderId : undefined,
  });

  if (error || orders.length === 0) {
    return (
      <p className="text-sm text-amber-800">
        {error || "Наряд для печати этикетки не найден."}
      </p>
    );
  }

  const [rows, preset] = await Promise.all([
    buildShipmentStickerRows(ordersDb, tenantId, orders, { originForQr, tenantSlug }),
    getTenantActiveStickerPreset(tenantId),
  ]);

  return (
    <div className="sticker-print-frame">
      <StickerEmbedAutoPrint />
      <ShipmentsStickersSheet rows={rows} preset={preset} />
    </div>
  );
}
