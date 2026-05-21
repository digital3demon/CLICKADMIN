import { NextResponse } from "next/server";
import { jsonBody, mailErrorResponse } from "@/app/api/mail/_utils";
import { bulkEmailAction, getMailApiContext, stringField } from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

const ACTIONS = new Set(["read", "unread", "flag", "unflag", "archive", "trash", "delete", "move", "markAllRead"]);

export async function POST(req: Request) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const body = await jsonBody(req);
    const action = stringField(body.action, 20);
    if (!ACTIONS.has(action)) {
      return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
    }
    if (action === "markAllRead" && r.ctx.role !== "OWNER") {
      return NextResponse.json({ error: "Только владелец может отметить все письма прочитанными" }, { status: 403 });
    }
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((x): x is string => typeof x === "string")
      : [];
    const result = await bulkEmailAction(r.ctx.db, r.ctx.tenantId, r.ctx.userId, r.ctx.role, {
      ids,
      action: action as Parameters<typeof bulkEmailAction>[4]["action"],
      accountId: stringField(body.accountId, 200) || null,
      targetFolderId: stringField(body.targetFolderId, 200) || null,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось выполнить действие с письмами");
  }
}
