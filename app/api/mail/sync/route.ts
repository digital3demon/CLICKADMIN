import { NextResponse } from "next/server";
import { jsonBody, mailErrorResponse } from "@/app/api/mail/_utils";
import { getMailApiContext, stringField, syncAccountNow } from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const body = await jsonBody(req);
    const accountId = stringField(body.accountId, 200);
    if (accountId) {
      const result = await syncAccountNow(r.ctx.db, r.ctx.tenantId, accountId);
      return NextResponse.json({ ok: true, result });
    }
    const accounts = await r.ctx.db.emailAccount.findMany({
      where: { tenantId: r.ctx.tenantId, isActive: true },
    });
    const results = [];
    for (const account of accounts) {
      results.push({ accountId: account.id, ...(await syncAccountNow(r.ctx.db, r.ctx.tenantId, account.id)) });
    }
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось синхронизировать почту");
  }
}
