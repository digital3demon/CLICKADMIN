import { NextResponse } from "next/server";
import { jsonBody, mailErrorResponse } from "@/app/api/mail/_utils";
import {
  getEmailReplyTemplate,
  getMailApiContext,
  upsertEmailReplyTemplate,
  stringField,
} from "@/lib/mail/mail-service";
import { parseEditorDocument, type ReplyLayoutType } from "@/lib/mail/reply-block-editor";

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
    const layoutTypeRaw = typeof body.layoutType === "string" ? body.layoutType.trim() : "";
    const layoutType: ReplyLayoutType | undefined =
      layoutTypeRaw === "blocks" || layoutTypeRaw === "freeform" ? layoutTypeRaw : undefined;
    const editorDocument =
      body.editorDocument !== undefined ? parseEditorDocument(body.editorDocument) : undefined;
    const template = await upsertEmailReplyTemplate(
      r.ctx.db,
      r.ctx.tenantId,
      r.ctx.userId,
      r.ctx.role,
      id,
      {
        subjectTemplate: stringField(body.subjectTemplate, 500),
        ...(typeof body.htmlTemplate === "string"
          ? { htmlTemplate: stringField(body.htmlTemplate, 300_000) }
          : {}),
        ...(layoutType ? { layoutType } : {}),
        ...(editorDocument !== undefined ? { editorDocument } : {}),
        ...(typeof body.isEnabled === "boolean" ? { isEnabled: body.isEnabled } : {}),
      },
    );
    return NextResponse.json({ template });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось сохранить шаблон автоответа");
  }
}
