import { NextResponse } from "next/server";
import { mailboxRoleAllowed } from "@/lib/mail-access";
import { getMailApiContext, stringField } from "@/lib/mail-api-context";
import { sendMailboxMessage } from "@/lib/mail-yandex";

export async function POST(req: Request) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  const { db, tenantId, role } = r.ctx;
  const form = await req.formData();
  const mailboxId = stringField(form.get("mailboxId"), 200);
  const mailbox = await db.mailMailbox.findFirst({ where: { id: mailboxId, tenantId } });
  if (!mailbox) return NextResponse.json({ error: "Ящик не найден" }, { status: 404 });
  if (!mailboxRoleAllowed(mailbox, role)) {
    return NextResponse.json({ error: "Нет доступа к ящику" }, { status: 403 });
  }
  const to = stringField(form.get("to"), 1000);
  const subject = stringField(form.get("subject"), 500);
  const text = stringField(form.get("text"), 100_000);
  if (!to || !subject || !text) {
    return NextResponse.json({ error: "Заполните получателя, тему и текст" }, { status: 400 });
  }
  const attachments: Array<{ filename: string; contentType: string; content: Buffer }> = [];
  for (const value of form.getAll("attachments")) {
    if (!(value instanceof File) || value.size <= 0) continue;
    if (value.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: `Файл ${value.name} больше 15 МБ` }, { status: 413 });
    }
    attachments.push({
      filename: value.name || "attachment",
      contentType: value.type || "application/octet-stream",
      content: Buffer.from(await value.arrayBuffer()),
    });
  }
  const result = await sendMailboxMessage(db, mailbox, {
    to,
    cc: stringField(form.get("cc"), 1000) || null,
    bcc: stringField(form.get("bcc"), 1000) || null,
    subject,
    text,
    attachments,
  });
  return NextResponse.json({ ok: true, ...result });
}
