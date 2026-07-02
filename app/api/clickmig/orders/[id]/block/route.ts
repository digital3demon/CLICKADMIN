import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { blockClickMigOrder } from "@/lib/clickmig/kanban-actions.server";
import { getSiteOrigin } from "@/lib/site-origin-server";
import type { ClickMigBlockedFieldKey } from "@/lib/clickmig/types";
import { CLICKMIG_BLOCKED_FIELD_KEYS } from "@/lib/clickmig/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await requireSessionTenantId(session);
  const { id } = await params;
  const body = (await req.json()) as {
    reason?: string;
    blockedFields?: string[];
  };
  const reason = body.reason?.trim() ?? "";
  if (!reason) {
    return NextResponse.json({ error: "Укажите причину" }, { status: 400 });
  }
  const blockedFields = (body.blockedFields ?? []).filter((f): f is ClickMigBlockedFieldKey =>
    CLICKMIG_BLOCKED_FIELD_KEYS.includes(f as ClickMigBlockedFieldKey),
  );
  if (blockedFields.length === 0) {
    return NextResponse.json({ error: "Отметьте поля" }, { status: 400 });
  }

  const prisma = await getOrdersPrisma();
  const origin = (await getSiteOrigin()) ?? "";
  await blockClickMigOrder(prisma, tenantId, id, reason, blockedFields, origin);
  return NextResponse.json({ ok: true });
}
