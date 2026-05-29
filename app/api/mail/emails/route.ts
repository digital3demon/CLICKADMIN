import { mailErrorResponse, mailJsonResponse } from "@/app/api/mail/_utils";
import { getMailApiContext, listEmails, type EmailFilter } from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

function emailFilter(value: string | null): EmailFilter {
  return value === "unread" || value === "attachments" || value === "flagged" || value === "unflagged"
    ? value
    : "all";
}

export async function GET(req: Request) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const url = new URL(req.url);
    const accountId = url.searchParams.get("accountId")?.trim();
    if (!accountId) return mailJsonResponse({ error: "accountId обязателен" }, { status: 400 });
    const result = await listEmails(r.ctx.db, r.ctx.tenantId, r.ctx.userId, r.ctx.role, {
      accountId,
      folderId: url.searchParams.get("folderId")?.trim() || null,
      labelId: url.searchParams.get("labelId")?.trim() || null,
      q: url.searchParams.get("q")?.trim() || null,
      filter: emailFilter(url.searchParams.get("filter")),
      take: Number(url.searchParams.get("take") || 80),
      cursor: url.searchParams.get("cursor")?.trim() || null,
    });
    return mailJsonResponse(result);
  } catch (err) {
    return mailErrorResponse(err, "Не удалось загрузить список писем");
  }
}
