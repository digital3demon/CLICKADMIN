import { NextResponse } from "next/server";
import { jsonBody, mailErrorResponse } from "@/app/api/mail/_utils";
import {
  getEmailReplyTemplate,
  getMailApiContext,
  upsertEmailReplyTemplate,
  stringField,
} from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const { id } = await params;
    const template = await getEmailReplyTemplate(
      r.ctx.db,
      r.ctx.tenantId,
      r.ctx.userId,
      r.ctx.role,
      id,
    );
    return NextResponse.json({ template });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось загрузить шаблон автоответа");
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const { id } = await params;
    const body = await jsonBody(req);
    const template = await upsertEmailReplyTemplate(
      r.ctx.db,
      r.ctx.tenantId,
      r.ctx.role,
      id,
      {
        subjectTemplate: stringField(body.subjectTemplate, 500),
        htmlTemplate: stringField(body.htmlTemplate, 300_000),
        ...(typeof body.isEnabled === "boolean" ? { isEnabled: body.isEnabled } : {}),
      },
    );
    return NextResponse.json({ template });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось сохранить шаблон автоответа");
  }
}
