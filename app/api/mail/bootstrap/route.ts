import { NextResponse } from "next/server";
import { mailErrorResponse, mailJsonResponse } from "@/app/api/mail/_utils";
import { getMailApiContext, mailBootstrap } from "@/lib/mail/mail-service";
import type { EmailFilter } from "@/lib/mail/mail-service";

export const dynamic = "force-dynamic";

function parseFilter(value: string | null): EmailFilter {
  if (value === "unread" || value === "attachments" || value === "flagged" || value === "unflagged") {
    return value;
  }
  return "all";
}

export async function GET(req: Request) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  try {
    const url = new URL(req.url);
    const accountId = url.searchParams.get("accountId")?.trim() || null;
    const folderId = url.searchParams.get("folderId")?.trim() || null;
    const filter = parseFilter(url.searchParams.get("filter"));
    const take = Number(url.searchParams.get("take") || "80");
    const payload = await mailBootstrap(r.ctx.db, r.ctx.tenantId, r.ctx.userId, r.ctx.role, {
      accountId,
      folderId,
      filter,
      take,
    });
    return mailJsonResponse({
      ...payload,
      currentUser: { role: r.ctx.role },
    });
  } catch (err) {
    return mailErrorResponse(err, "Не удалось загрузить почту");
  }
}
