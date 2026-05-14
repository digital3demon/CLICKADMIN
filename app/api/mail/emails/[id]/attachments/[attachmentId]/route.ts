import { mailErrorResponse } from "@/app/api/mail/_utils";
import { getEmailAttachment, getMailApiContext } from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const { id, attachmentId } = await params;
    const attachment = await getEmailAttachment(r.ctx.db, r.ctx.tenantId, id, attachmentId);
    return new Response(attachment.data, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
          attachment.fileName,
        )}`,
        "Content-Length": String(attachment.size),
      },
    });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось скачать вложение");
  }
}
