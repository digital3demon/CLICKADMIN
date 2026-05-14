import { NextResponse } from "next/server";
import { getMailApiContext, listEmails, type EmailFilter } from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

function emailFilter(value: string | null): EmailFilter {
  return value === "unread" || value === "attachments" || value === "flagged" ? value : "all";
}

export async function GET(req: Request) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  const url = new URL(req.url);
  const accountId = url.searchParams.get("accountId")?.trim();
  if (!accountId) return NextResponse.json({ error: "accountId обязателен" }, { status: 400 });
  const emails = await listEmails(r.ctx.db, r.ctx.tenantId, {
    accountId,
    folderId: url.searchParams.get("folderId")?.trim() || null,
    q: url.searchParams.get("q")?.trim() || null,
    filter: emailFilter(url.searchParams.get("filter")),
    take: Number(url.searchParams.get("take") || 80),
  });
  return NextResponse.json({ emails });
}
