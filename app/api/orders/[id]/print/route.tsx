import QRCode from "qrcode";
import { renderToBuffer } from "@react-pdf/renderer";
import { buildKaitenCardTitle } from "@/lib/kaiten-card-title";
import { OrderNarjadPdfDocument } from "@/lib/order-narjad-pdf-document";
import { getClientsPrisma, getOrdersPrisma } from "@/lib/get-domain-prisma";
import { ensureStickerPublicTokenForOrder } from "@/lib/order-sticker-token";
import { prisma } from "@/lib/prisma";
import { getSiteOrigin } from "@/lib/site-origin-server";
import { stickerPublicHubAbsoluteUrl } from "@/lib/sticker-public-path";

/** react-pdf + шрифты из node_modules не работают в Edge */
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function safePdfFileName(orderNumber: string): string {
  const base = orderNumber.replace(/[^\w.-]+/g, "_").slice(0, 80);
  return `narjad-${base || "order"}.pdf`;
}

/** inline — открыть PDF во вкладке (просмотр и печать браузера); ASCII + filename* для кириллицы */
function contentDispositionInlinePdf(filename: string): string {
  const ascii =
    filename
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/"/g, "")
      .slice(0, 180) || "narjad.pdf";
  const withExt = filename.toLowerCase().endsWith(".pdf")
    ? filename
    : `${filename}.pdf`;
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(withExt)}`;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const oid = id?.trim() ?? "";
  if (!oid) {
    return new Response("Bad request", { status: 400 });
  }

  try {
    const [ordersPrisma, clientsPrisma] = await Promise.all([
      getOrdersPrisma(),
      getClientsPrisma(),
    ]);
    const [order, createRevision] = await Promise.all([
      ordersPrisma.order.findUnique({
        where: { id: oid },
        select: {
          id: true,
          tenantId: true,
          orderNumber: true,
          patientName: true,
          dueDate: true,
          kaitenAdminDueHasTime: true,
          kaitenCardTitleLabel: true,
          isUrgent: true,
          urgentCoefficient: true,
          clientOrderText: true,
          notes: true,
          doctorId: true,
          kaitenCardTypeId: true,
        },
      }),
      ordersPrisma.orderRevision.findFirst({
        where: { orderId: oid, kind: "CREATE" },
        orderBy: { createdAt: "asc" },
        select: { actorLabel: true },
      }),
    ]);
    if (!order) {
      return new Response("Not found", { status: 404 });
    }
    const [doctor, kaitenCardType, tenant] = await Promise.all([
      clientsPrisma.doctor.findUnique({
        where: { id: order.doctorId },
        select: { fullName: true },
      }),
      order.kaitenCardTypeId
        ? clientsPrisma.kaitenCardType.findUnique({
            where: { id: order.kaitenCardTypeId },
            select: { name: true },
          })
        : Promise.resolve(null),
      prisma.tenant.findUnique({
        where: { id: order.tenantId },
        select: { slug: true },
      }),
    ]);

    const origin = await getSiteOrigin();
    const tenantSlug = tenant?.slug?.trim() || "";
    let hubUrl: string | null = null;
    if (tenantSlug && origin) {
      const token = await ensureStickerPublicTokenForOrder(
        ordersPrisma,
        order.tenantId,
        order.id,
      );
      hubUrl = stickerPublicHubAbsoluteUrl(origin, tenantSlug, token);
    }
    const qrPlaceholder = !tenantSlug
      ? "У организации не задан slug"
      : !origin
        ? "Нет абсолютного URL сайта (проверьте Host / прокси)"
        : "Не удалось сформировать ссылку витрины";

    let qrDataUrl: string | null = null;
    if (hubUrl) {
      try {
        qrDataUrl = await QRCode.toDataURL(hubUrl, {
          width: 512,
          margin: 2,
          errorCorrectionLevel: "M",
        });
      } catch {
        qrDataUrl = null;
      }
    }

    const titleRaw = buildKaitenCardTitle({
      orderNumber: order.orderNumber,
      patientName: order.patientName,
      doctor: { fullName: doctor?.fullName ?? "—" },
      dueDate: order.dueDate,
      kaitenLabDueHasTime: order.kaitenAdminDueHasTime !== false,
      kaitenCardTitleLabel: order.kaitenCardTitleLabel,
      kaitenCardType: kaitenCardType,
      isUrgent: order.isUrgent,
      urgentCoefficient: order.urgentCoefficient,
    });
    const titleLine = titleRaw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    const printDateFormatted = new Date().toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const createdByLabel = createRevision?.actorLabel?.trim() || "—";

    const buffer = await renderToBuffer(
      <OrderNarjadPdfDocument
        printDateFormatted={printDateFormatted}
        createdByLabel={createdByLabel}
        titleLine={titleLine}
        clientOrderText={order.clientOrderText ?? ""}
        notes={order.notes ?? ""}
        kaitenUrl={hubUrl}
        qrDataUrl={qrDataUrl}
        qrPlaceholder={qrPlaceholder}
      />,
    );

    const filename = safePdfFileName(order.orderNumber);
    const nodeBuf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    return new Response(new Uint8Array(nodeBuf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDispositionInlinePdf(filename),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[order print pdf]", msg, e);
    return new Response("Server error", { status: 500 });
  }
}
