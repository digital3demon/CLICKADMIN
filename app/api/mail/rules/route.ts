import { NextResponse } from "next/server";
import { jsonBody, mailErrorResponse } from "@/app/api/mail/_utils";
import {
  createEmailRule,
  getMailApiContext,
  listEmailRules,
  stringField,
} from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  const url = new URL(req.url);
  const accountId = url.searchParams.get("accountId")?.trim() || null;
  const rules = await listEmailRules(r.ctx.db, r.ctx.tenantId, r.ctx.userId, r.ctx.role, accountId);
  return NextResponse.json({ rules });
}

export async function POST(req: Request) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const body = await jsonBody(req);
    const rule = await createEmailRule(r.ctx.db, r.ctx.tenantId, r.ctx.userId, r.ctx.role, {
      accountId: stringField(body.accountId, 200),
      name: stringField(body.name, 160),
      conditions: body.conditions,
      actions: body.actions,
    });
    return NextResponse.json({ rule });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось создать правило почты");
  }
}
