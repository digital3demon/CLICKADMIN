import { NextResponse } from "next/server";
import { jsonBody, mailErrorResponse } from "@/app/api/mail/_utils";
import {
  getMailApiContext,
  listEmailAccounts,
  stringField,
  upsertEmailAccount,
} from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  const accounts = await listEmailAccounts(r.ctx.db, r.ctx.tenantId, r.ctx.userId, r.ctx.role);
  return NextResponse.json({ accounts, currentUser: { role: r.ctx.role } });
}

export async function POST(req: Request) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    if (r.ctx.role !== "OWNER") {
      return NextResponse.json({ error: "Только владелец может подключать почтовые ящики" }, { status: 403 });
    }
    const body = await jsonBody(req);
    const account = await upsertEmailAccount(r.ctx.db, r.ctx.tenantId, r.ctx.userId, {
      email: stringField(body.email, 320),
      displayName: stringField(body.displayName, 160) || null,
      appPassword: stringField(body.appPassword, 500) || null,
    });
    return NextResponse.json({
      account: {
        ...account,
        encryptedAppPassword: undefined,
        hasPassword: Boolean(account.encryptedAppPassword),
      },
    });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось сохранить почтовый аккаунт");
  }
}
