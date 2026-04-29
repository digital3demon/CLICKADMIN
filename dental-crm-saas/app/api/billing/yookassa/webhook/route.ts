import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/server/logger";

/**
 * YooKassa: уведомления о платеже. Док: уведомления приходят POST с JSON;
 * IP проверяется на стороне прокси. Идемпотентность: по `object.id` и `event`.
 */
function ipAllowed(clientIp: string) {
  const list = (process.env.YOOKASSA_WEBHOOK_IPS ?? "")
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return true;
  return list.some((a) => a === clientIp);
}

function safeEqualSecret(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return ha.length === hb.length && timingSafeEqual(ha, hb);
}

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";
  if (!ipAllowed(ip)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const secret = process.env.YOOKASSA_WEBHOOK_SECRET?.trim();
  const got = req.headers.get("x-webhook-secret")?.trim();
  if (secret && (!got || !safeEqualSecret(secret, got))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { event?: string; object?: { id?: string; status?: string; amount?: { value?: string; currency?: string } } };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payId = body.object?.id?.trim();
  if (!payId) {
    return NextResponse.json({ error: "No payment id" }, { status: 400 });
  }

  if (body.event === "payment.succeeded" && body.object?.status === "succeeded") {
    const row = await prisma.subscriptionInvoice.findFirst({
      where: { providerExternalId: payId, provider: "YOOKASSA" },
    });
    if (row) {
      await prisma.subscriptionInvoice.update({
        where: { id: row.id },
        data: { status: "PAID", paidAt: new Date() },
      });
      logger.info(
        { msg: "yookassa_paid", invoiceId: row.id, tenantId: row.tenantId },
        "POST /api/billing/yookassa/webhook",
      );
    } else {
      logger.warn(
        { msg: "yookassa_no_invoice", paymentId: payId },
        "POST /api/billing/yookassa/webhook",
      );
    }
  }

  return NextResponse.json({ received: true });
}
