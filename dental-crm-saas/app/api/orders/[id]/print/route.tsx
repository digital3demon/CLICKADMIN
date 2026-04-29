import QRCode from "qrcode";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { buildKaitenCardTitle } from "@/lib/kaiten-card-title";
import { getKaitenCardWebUrl } from "@/lib/kaiten-card-web-url";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { OrderNarjadPdfDocument } from "@/lib/order-narjad-pdf-document";
import { getPrisma } from "@/lib/get-prisma";
import { getSiteOrigin } from "@/lib/site-origin-server";
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
    const [order, createRevision] = await Promise.all([
      (await getPrisma()).order.findUnique({
        where: { id: oid },
        include: {
          doctor: { select: { fullName: true } },
          kaitenCardType: { select: { name: true } },
        },
      }),
      (await getPrisma()).orderRevision.findFirst({
        where: { orderId: oid, kind: "CREATE" },
        orderBy: { createdAt: "asc" },
        select: { actorLabel: true },
      }),
    ]);

    if (!order) {
      return new Response("Not found", { status: 404 });
    }

    const session = await getSessionFromCookies();
    const origin = await getSiteOrigin();
    const demoKanbanQr =
      session?.demo && origin
        ? `${origin.replace(/\/$/, "")}${kanbanOrderDeepLinkPath(oid)}`
        : null;
    const kaitenCardUrl =
      demoKanbanQr ??
      (order.kaitenCardId != null ? getKaitenCardWebUrl(order.kaitenCardId) : null);
    const qrPlaceholder = session?.demo
      ? "Нет абсолютного URL для канбана (проверьте Host / прокси)"
      : "Нет ссылки на карточку Kaiten";

    let qrDataUrl: string | null = null;
    if (kaitenCardUrl) {
      try {
        qrDataUrl = await QRCode.toDataURL(kaitenCardUrl, {
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
      doctor: order.doctor,
      dueDate: order.dueDate,
      kaitenLabDueHasTime: true,
      kaitenCardTitleLabel: order.kaitenCardTitleLabel,
      kaitenCardType: order.kaitenCardType,
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
        kaitenUrl={kaitenCardUrl}
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
