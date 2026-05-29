import { NextResponse } from "next/server";
import { jsonBody, mailErrorResponse, mailJsonResponse } from "@/app/api/mail/_utils";
import {
  createEmailFolder,
  getMailApiContext,
  listEmailFolders,
  stringField,
} from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const url = new URL(req.url);
    const accountId = url.searchParams.get("accountId")?.trim();
    if (!accountId) return NextResponse.json({ error: "accountId обязателен" }, { status: 400 });
    const folders = await listEmailFolders(r.ctx.db, r.ctx.tenantId, r.ctx.userId, r.ctx.role, accountId);
    return mailJsonResponse({ folders });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось загрузить папки почты");
  }
}

export async function POST(req: Request) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const body = await jsonBody(req);
    const accountId = stringField(body.accountId, 200);
    const name = stringField(body.name, 120);
    const color = stringField(body.color, 20);
    const folder = await createEmailFolder(r.ctx.db, r.ctx.tenantId, r.ctx.userId, r.ctx.role, accountId, name, color);
    return NextResponse.json({ folder });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось создать папку");
  }
}
