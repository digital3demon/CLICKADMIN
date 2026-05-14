import { NextResponse } from "next/server";
import { mailErrorResponse } from "@/app/api/mail/_utils";
import { getMailApiContext, sendEmail, stringField } from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

const MAX_ATTACHMENT_SIZE = 20 * 1024 * 1024;

export async function POST(req: Request) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const form = await req.formData();
    const accountId = stringField(form.get("accountId"), 200);
    const to = stringField(form.get("to"), 2000);
    const subject = stringField(form.get("subject"), 500);
    const html = stringField(form.get("html"), 300_000);
    if (!accountId || !to || !subject || !html) {
      return NextResponse.json(
        { error: "Заполните аккаунт, получателя, тему и текст" },
        { status: 400 },
      );
    }
    const attachments = [];
    for (const value of form.getAll("attachments")) {
      if (!(value instanceof File) || value.size <= 0) continue;
      if (value.size > MAX_ATTACHMENT_SIZE) {
        return NextResponse.json(
          { error: `Файл ${value.name || "attachment"} больше 20 МБ` },
          { status: 413 },
        );
      }
      attachments.push({
        filename: value.name || "attachment",
        contentType: value.type || "application/octet-stream",
        content: Buffer.from(await value.arrayBuffer()),
      });
    }
    const result = await sendEmail(r.ctx.db, r.ctx.tenantId, {
      accountId,
      to,
      cc: stringField(form.get("cc"), 2000) || null,
      bcc: stringField(form.get("bcc"), 2000) || null,
      subject,
      html,
      attachments,
    });
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось отправить письмо");
  }
}
