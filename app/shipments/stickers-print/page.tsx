import Link from "next/link";
import { headers } from "next/headers";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { ShipmentsStickersPrintToolbar } from "@/components/shipments/ShipmentsStickersPrintToolbar";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { publicOriginFromHeaders } from "@/lib/public-origin-from-headers";
import { shipmentsListHref } from "@/lib/shipments-list-query";
import { loadOrdersForShipmentsStickersPrint } from "@/lib/shipments-stickers-print-load";
import { buildShipmentStickerRows } from "@/lib/shipment-sticker-rows.server";
import { getTenantActiveStickerPreset } from "@/lib/sticker-print-settings.server";
import { getSiteOrigin } from "@/lib/site-origin-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ShipmentsStickersPrintPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    from?: string;
    to?: string;
    tag?: string;
    orderId?: string;
    print?: string;
  }>;
}) {
  const sp = await searchParams;
  const session = await getSessionFromCookies();
  const tenantId = session ? await getTenantIdForSession(session) : null;
  const ordersDb = await getOrdersPrisma();
  const siteOrigin = await getSiteOrigin();
  const hdr = await headers();
  const originForQr =
    (siteOrigin && siteOrigin.trim()) || publicOriginFromHeaders(hdr) || "";

  if (!tenantId) {
    return (
      <ModuleFrame title="Этикетки отгрузки" description="">
        <p className="text-sm text-[var(--text-secondary)]">Войдите в CRM.</p>
      </ModuleFrame>
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { slug: true },
  });
  const tenantSlug = tenant?.slug?.trim() || "";
  if (!tenantSlug) {
    return (
      <ModuleFrame title="Этикетки отгрузки" description="">
        <p className="text-sm text-red-600">У организации не задан slug — обратитесь к поддержке.</p>
      </ModuleFrame>
    );
  }

  const { orders, error } = await loadOrdersForShipmentsStickersPrint(ordersDb, tenantId, sp);
  const printPreset = await getTenantActiveStickerPreset(tenantId);

  if (error) {
    return (
      <ModuleFrame title="Этикетки отгрузки" description="">
        <p className="text-sm text-amber-800">{error}</p>
        <p className="mt-4 text-sm">
          <Link
            className="text-[var(--sidebar-blue)] hover:underline"
            href={shipmentsListHref({
              tab:
                sp.tab === "tomorrow" || sp.tab === "period"
                  ? sp.tab
                  : "today",
              from: typeof sp.from === "string" ? sp.from : null,
              to: typeof sp.to === "string" ? sp.to : null,
              tag: typeof sp.tag === "string" ? sp.tag : null,
            })}
          >
            ← К отгрузкам
          </Link>
        </p>
      </ModuleFrame>
    );
  }

  const rows = await buildShipmentStickerRows(ordersDb, tenantId, orders, {
    originForQr,
    tenantSlug,
  });

  const back = shipmentsListHref({
    tab:
      sp.tab === "tomorrow" || sp.tab === "period" ? sp.tab : "today",
    from: typeof sp.from === "string" ? sp.from : null,
    to: typeof sp.to === "string" ? sp.to : null,
    tag: typeof sp.tag === "string" ? sp.tag : null,
  });

  return (
    <ModuleFrame
      title="Этикетки отгрузки"
      description="Макет под термопринтер. Размер задаётся в Конфигурация → Печать. В диалоге печати выберите принтер этикеток и масштаб 100 %."
      rootClassName="sticker-print-frame"
    >
      <style>{`
        @media print {
          header.module-frame-header,
          button[aria-controls="app-primary-nav"],
          aside[aria-label="Основное меню"],
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <ShipmentsStickersPrintToolbar
        rows={rows}
        backHref={back}
        preset={printPreset}
        autoPrint={sp.print === "1"}
      />
      {!originForQr ? (
        <p className="no-print mb-3 max-w-xl text-xs text-amber-800">
          Не удалось определить публичный адрес сайта для QR: задайте{" "}
          <span className="font-mono">CRM_PUBLIC_BASE_URL</span> или прокси с{" "}
          <span className="font-mono">X-Forwarded-Host</span>. Иначе в коде может оказаться относительный путь —
          сканирование с телефона не сработает.
        </p>
      ) : null}
    </ModuleFrame>
  );
}
