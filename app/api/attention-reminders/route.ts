import { NextResponse } from "next/server";
import { getAttentionReminders } from "@/lib/attention-reminders";

/**
 * Данные для сайдбара без Prisma в корневом layout.
 * Данные из `getAttentionReminders`: кэш Next разделён live/demo и без `getPrisma()` внутри `unstable_cache`.
 */
export async function GET() {
  const data = await getAttentionReminders();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
