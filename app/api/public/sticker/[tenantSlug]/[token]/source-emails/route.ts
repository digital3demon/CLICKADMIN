import { NextResponse } from "next/server";
import { fetchOrderSourceEmails } from "@/lib/mail/order-source-emails";
import { resolveStickerOrderBySlugAndToken } from "@/lib/sticker-public-order-resolve";

type Ctx = {
  params: Promise<{ tenantSlug: string; token: string }>;
};

/**
 * Исходные письма наряда для публичного QR-хаба (auth = slug + stickerPublicToken).
 * MIME-вложения без сессии не отдаём как download-ссылки — только имя; externalUrl кликабельны.
 */
export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { tenantSlug, token } = await ctx.params;
    const resolved = await resolveStickerOrderBySlugAndToken(tenantSlug, token);
    if (!resolved.ok) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const emails = await fetchOrderSourceEmails(
      resolved.ordersDb,
      resolved.tenantId,
      resolved.orderId,
    );

    const publicEmails = emails.map((email) => ({
      ...email,
      attachments: email.attachments.map((a) => {
        const externalUrl = a.externalUrl?.trim() || null;
        if (externalUrl) {
          return { ...a, externalUrl };
        }
        /* Без download: фронт не должен ходить в /api/mail/... */
        return {
          ...a,
          id: a.id.startsWith("yandex-disk:")
            ? a.id
            : `public-no-download:${a.id}`,
          externalUrl: null,
        };
      }),
    }));

    return NextResponse.json(
      { emails: publicEmails, orderId: resolved.orderId },
      { headers: { "Cache-Control": "private, max-age=60" } },
    );
  } catch (e) {
    console.error("[public sticker source-emails]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
