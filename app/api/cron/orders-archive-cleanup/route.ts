import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { purgeArchivedOrdersForTenant } from "@/lib/purge-archived-orders";

/**
 * Очистка архивных заказов и вложений.
 * Authorization: Bearer $CRON_SECRET
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization")?.trim();
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const prisma = await getPrisma();
  const tenants = await prisma.tenant.findMany({
    select: { id: true },
  });
  let checked = 0;
  let deleted = 0;
  for (const t of tenants) {
    const res = await purgeArchivedOrdersForTenant(prisma, t.id);
    checked += res.checked;
    deleted += res.deleted;
  }
  return NextResponse.json({
    ok: true,
    tenants: tenants.length,
    checked,
    deleted,
  });
}
