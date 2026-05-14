import { NextResponse } from "next/server";
import { getMailApiContext } from "@/lib/mail-api-context";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  const { db, tenantId } = r.ctx;
  const { id } = await ctx.params;
  const message = await db.mailMessage.findFirst({
    where: { id, tenantId },
    include: {
      attachments: {
        select: { id: true, fileName: true, mimeType: true, size: true, contentId: true },
      },
      links: true,
      mailbox: { select: { id: true, email: true, displayName: true } },
    },
  });
  if (!message) return NextResponse.json({ error: "Письмо не найдено" }, { status: 404 });
  if (message.readState !== "READ") {
    await db.mailMessage.update({ where: { id }, data: { readState: "READ" } });
    message.readState = "READ";
  }
  return NextResponse.json({ message });
}
