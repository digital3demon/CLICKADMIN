import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { canDismissSidebarRecentPaidItems } from "@/lib/auth/permissions";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { getRecentOrdersPaidAfterUnpaidOrPartial } from "@/lib/recent-orders-paid-from-revisions";
import {
  mergeSidebarRecentPaidDismissedKeys,
  SIDEBAR_RECENT_PAID_DISMISSED_STATE_KEY,
  sidebarRecentPaidDismissedKeySet,
  sidebarRecentPaidDismissedKeysArray,
  sidebarRecentPaidDismissEntryKey,
} from "@/lib/sidebar-recent-paid-dismissed";

export const dynamic = "force-dynamic";

/** Блок «Оплаты» в сайдбаре: недавние переходы к «Оплачено» и к «Частично оплачено». */
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session?.sub || session.demo) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let tenantId: string;
  try {
    tenantId = await requireSessionTenantId(session);
  } catch {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 400 });
  }

  const prisma = await getPrisma();
  const items = await getRecentOrdersPaidAfterUnpaidOrPartial(prisma, tenantId);

  const role = session.role as UserRole;
  let visible = items;
  if (canDismissSidebarRecentPaidItems(role)) {
    const row = await prisma.userClientState.findUnique({
      where: {
        userId_key: {
          userId: session.sub,
          key: SIDEBAR_RECENT_PAID_DISMISSED_STATE_KEY,
        },
      },
      select: { value: true },
    });
    const dismissed = sidebarRecentPaidDismissedKeySet(row?.value);
    visible = items.filter(
      (it) => !dismissed.has(sidebarRecentPaidDismissEntryKey(it.orderId, it.changedAt)),
    );
  }

  return NextResponse.json(
    { items: visible },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

type PostBody = { orderId?: unknown; changedAt?: unknown };

/** Отметить строку «Оплаты» прочитанной (скрыть у этого пользователя) — только админы. */
export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub || session.demo) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const role = session.role as UserRole;
  if (!canDismissSidebarRecentPaidItems(role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  let tenantId: string;
  try {
    tenantId = await requireSessionTenantId(session);
  } catch {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 400 });
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const changedAt = typeof body.changedAt === "string" ? body.changedAt.trim() : "";
  if (!orderId || !changedAt) {
    return NextResponse.json({ error: "Ожидаются orderId и changedAt" }, { status: 400 });
  }

  const entry = sidebarRecentPaidDismissEntryKey(orderId, changedAt);
  const prisma = await getPrisma();

  const row = await prisma.userClientState.findUnique({
    where: {
      userId_key: { userId: session.sub, key: SIDEBAR_RECENT_PAID_DISMISSED_STATE_KEY },
    },
    select: { value: true },
  });
  const prev = sidebarRecentPaidDismissedKeysArray(row?.value);
  const value = mergeSidebarRecentPaidDismissedKeys(prev, entry);

  await prisma.userClientState.upsert({
    where: {
      userId_key: { userId: session.sub, key: SIDEBAR_RECENT_PAID_DISMISSED_STATE_KEY },
    },
    create: {
      userId: session.sub,
      tenantId,
      key: SIDEBAR_RECENT_PAID_DISMISSED_STATE_KEY,
      value,
    },
    update: { value, tenantId },
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
