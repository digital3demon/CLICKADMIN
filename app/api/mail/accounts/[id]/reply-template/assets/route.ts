import { NextResponse } from "next/server";
import { mailErrorResponse } from "@/app/api/mail/_utils";
import {
  createEmailReplyTemplateAsset,
  getMailApiContext,
  listEmailReplyTemplateAssets,
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
    const assets = await listEmailReplyTemplateAssets(
      r.ctx.db,
      r.ctx.tenantId,
      r.ctx.role,
      id,
    );
    return NextResponse.json({ assets });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось загрузить файлы шаблона");
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const { id } = await params;
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Выберите файл" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await createEmailReplyTemplateAsset(
      r.ctx.db,
      r.ctx.tenantId,
      r.ctx.role,
      id,
      {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        data: buffer,
      },
    );
    return NextResponse.json({ asset });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось загрузить файл");
  }
}
