import { NextResponse } from "next/server";
import { jsonBody, mailErrorResponse, mailJsonResponse } from "@/app/api/mail/_utils";
import {
  createEmailLabel,
  getMailApiContext,
  listEmailLabels,
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
    const labels = await listEmailLabels(r.ctx.db, r.ctx.tenantId, r.ctx.userId, r.ctx.role, accountId);
    return mailJsonResponse({ labels });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось загрузить метки почты");
  }
}

export async function POST(req: Request) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const body = await jsonBody(req);
    const label = await createEmailLabel(
      r.ctx.db,
      r.ctx.tenantId,
      r.ctx.userId,
      r.ctx.role,
      stringField(body.accountId, 200),
      {
        name: stringField(body.name, 80),
        color: stringField(body.color, 20) || "#ffcc00",
      },
    );
    return NextResponse.json({ label });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось создать метку");
  }
}
