import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { loadOrdersShipmentListPdf } from "@/lib/load-orders-shipment-list-pdf";
import { OrdersShipmentListPdfDocument } from "@/lib/orders-shipment-list-pdf-document";
import { parseOrdersShipmentParams } from "@/lib/orders-shipment-list-query";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function pdfFileName(mode: string, shipFrom: string | null, shipTo: string | null): string {
  if (mode === "actual") return "otgruzki-aktualnye.pdf";
  if (shipFrom && shipTo) {
    return `otgruzki-zapis-${shipFrom}-${shipTo}.pdf`;
  }
  if (shipTo) return `otgruzki-zapis-do-${shipTo}.pdf`;
  return "otgruzki-spisok.pdf";
}

function contentDispositionAttachment(filename: string): string {
  const ascii =
    filename
      .replace(/[^\x20-\x7E]/g, "_")
      .replace(/"/g, "")
      .slice(0, 180) || "otgruzki.pdf";
  const withExt = filename.toLowerCase().endsWith(".pdf")
    ? filename
    : `${filename}.pdf`;
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(withExt)}`;
}

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const sp = new URL(req.url).searchParams;
  const parsed = parseOrdersShipmentParams({
    ship: sp.get("ship"),
    shipFrom: sp.get("shipFrom"),
    shipTo: sp.get("shipTo"),
  });

  if (!parsed.mode) {
    return NextResponse.json(
      { error: "Укажите ship=actual или ship=period" },
      { status: 400 },
    );
  }
  if (parsed.periodError) {
    return NextResponse.json({ error: parsed.periodError }, { status: 400 });
  }

  try {
    const db = await getOrdersPrisma();
    const payload = await loadOrdersShipmentListPdf(db, {
      tenantId,
      shipmentMode: parsed.mode,
      shipFrom: parsed.shipFrom,
      shipTo: parsed.shipTo,
      viewerRole: session.role ?? null,
      viewerUserId: session.sub ?? null,
    });

    const doc = React.createElement(OrdersShipmentListPdfDocument, { payload });
    const pdfBuf = await renderToBuffer(doc as never);
    const filename = pdfFileName(parsed.mode, parsed.shipFrom, parsed.shipTo);

    return new NextResponse(Buffer.from(pdfBuf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDispositionAttachment(filename),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[shipments orders-list-pdf]", msg, e);
    return NextResponse.json({ error: "Не удалось сформировать PDF" }, { status: 500 });
  }
}
