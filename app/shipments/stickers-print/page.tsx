import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { ShipmentsStickersPrintToolbar } from "@/components/shipments/ShipmentsStickersPrintToolbar";
import type { StickerRow } from "@/components/shipments/ShipmentsStickersSheet";
import { ensureStickerPublicTokensForOrders } from "@/lib/order-sticker-token";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";
import { publicOriginFromHeaders } from "@/lib/public-origin-from-headers";
import { shipmentsListHref } from "@/lib/shipments-list-query";
import { loadOrdersForShipmentsStickersPrint } from "@/lib/shipments-stickers-print-load";
import {
  stickerPublicHubAbsoluteUrl,
  stickerPublicHubPath,
} from "@/lib/sticker-public-path";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSiteOrigin } from "@/lib/site-origin-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ShipmentsStickersPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; from?: string; to?: string; tag?: string }>;
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

  const rows: StickerRow[] = await Promise.all(
    orders.map(async (o) => {
      const tok = tokenById.get(o.id) || "";
      const pathOnly = stickerPublicHubPath(tenantSlug, tok);
      const hubUrl = originForQr
        ? stickerPublicHubAbsoluteUrl(originForQr, tenantSlug, tok)
        : pathOnly;

      const qrDataUrl = tok
        ? await QRCode.toDataURL(hubUrl, {
            errorCorrectionLevel: "M",
            margin: 0,
            width: 280,
            color: { dark: "#0f172a", light: "#ffffff" },
          })
        : "";

      const clinicLine = (o.clinic?.name || "Частная практика").trim() || "—";
      const doctorLine = personNameSurnameInitials(o.doctor.fullName) || o.doctor.fullName.trim();
      const patientLine =
        personNameSurnameInitials(o.patientName) || (o.patientName || "").trim() || "—";

      return {
        id: o.id,
        clinicLine,
        doctorLine,
        patientLine,
        orderNumber: o.orderNumber,
        qrDataUrl,
      };
    }),
  );

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
      description="Макет под термопринтер: по умолчанию 58×40 мм; можно задать другой размер. В диалоге печати выберите принтер этикеток и масштаб 100 %."
    >
      <style>{`
        @media print {
          header.module-frame-header { display: none !important; }
        }
      `}</style>
      <ShipmentsStickersPrintToolbar rows={rows} backHref={back} />
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
