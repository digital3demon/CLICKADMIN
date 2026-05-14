import { NextResponse } from "next/server";
import { mailboxRoleAllowed } from "@/lib/mail-access";
import { getMailApiContext } from "@/lib/mail-api-context";
import { syncMailboxInbox } from "@/lib/mail-yandex";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  const { db, tenantId, role } = r.ctx;
  const { id } = await ctx.params;
  const mailbox = await db.mailMailbox.findFirst({ where: { id, tenantId } });
  if (!mailbox) return NextResponse.json({ error: "Ящик не найден" }, { status: 404 });
  if (!mailboxRoleAllowed(mailbox, role)) {
    return NextResponse.json({ error: "Нет доступа к ящику" }, { status: 403 });
  }
  try {
    const result = await syncMailboxInbox(db, mailbox);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка синхронизации";
    await db.mailMailbox.update({
      where: { id },
      data: { lastSyncAt: new Date(), lastSyncError: message },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
