import { mailErrorResponse } from "@/app/api/mail/_utils";
import { getEmailAttachment, getMailApiContext } from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const { id, attachmentId } = await params;
    const attachment = await getEmailAttachment(
      r.ctx.db,
      r.ctx.tenantId,
      r.ctx.userId,
      id,
      attachmentId,
    );
    const url = new URL(req.url);
    const disposition = url.searchParams.get("inline") === "1" ? "inline" : "attachment";
    const body = new ArrayBuffer(attachment.data.byteLength);
    new Uint8Array(body).set(attachment.data);
    return new Response(body, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(
          attachment.fileName,
        )}`,
        "Content-Length": String(attachment.size),
      },
    });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось скачать вложение");
  }
}
