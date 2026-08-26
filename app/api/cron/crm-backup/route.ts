import { NextResponse } from "next/server";
import { runScheduledCrmBackup } from "@/lib/crm-backup/run-auto-backup";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization")?.trim();
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  const internal = process.env.INTERNAL_CRM_BACKUP_SECRET?.trim();
  const header = req.headers.get("x-internal-crm-backup-secret")?.trim();
  return Boolean(internal && header && header === internal);
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const result = await runScheduledCrmBackup();
    if (result.skipped) {
      return NextResponse.json({ ok: true, skipped: true });
    }
    return NextResponse.json({
      ok: true,
      skipped: false,
      createdAt: result.last.createdAt,
      storage: result.last.storage,
      bytes: result.last.bytes,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка бекапа";
    console.error("[cron] crm-backup", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
