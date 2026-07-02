import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getKaitenRestAuth } from "@/lib/kaiten-rest";
import { syncKaitenChatsInBackground } from "@/lib/kaiten-chat-background-sync";
import { cronLogger } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const auth = req.headers.get("authorization")?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;

  const internalSecret = process.env.INTERNAL_KAITEN_CHAT_SYNC_SECRET?.trim();
  const internalHeader = req.headers
    .get("x-internal-kaiten-chat-sync-secret")
    ?.trim();
  return Boolean(internalSecret && internalHeader === internalSecret);
}

/**
 * Bounded background sync of Kaiten comments for active orders.
 * Reads a small rotating batch and imports chat signals (`!!!`, `???`, @lab)
 * into the existing order notification tables without opening the card in UI.
 */
export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const auth = getKaitenRestAuth();
  if (!auth) {
    return NextResponse.json({ error: "Kaiten не настроен" }, { status: 503 });
  }

  const url = new URL(req.url);
  try {
    const db = await getOrdersPrisma();
    const result = await syncKaitenChatsInBackground(db, auth, {
      limit: url.searchParams.get("limit"),
      perTenantLimit: url.searchParams.get("perTenantLimit"),
    });
    return NextResponse.json(result);
  } catch (err) {
    cronLogger.error({ err }, "background Kaiten chat sync failed");
    return NextResponse.json(
      { ok: false, error: "Синхронизация чатов Kaiten не удалась" },
      { status: 500 },
    );
  }
}
