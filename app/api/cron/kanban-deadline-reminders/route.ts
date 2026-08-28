import { NextResponse } from "next/server";
import { runKanbanDeadlineReminders } from "@/lib/kanban-deadline-reminder.server";
import { cronLogger } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

/**
 * Напоминания о срокe канбана (МСК).
 * Authorization: Bearer $CRON_SECRET
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization")?.trim();
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const result = await runKanbanDeadlineReminders();
    cronLogger.info(result, "kanban deadline reminders");
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    cronLogger.error({ err: e }, "kanban deadline reminders failed");
    return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  }
}
