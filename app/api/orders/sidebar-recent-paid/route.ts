import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { canDismissSidebarRecentPaidItems } from "@/lib/auth/permissions";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import { getEffectiveModuleAccess } from "@/lib/role-module-resolver";
import { getRecentOrdersPaidAfterUnpaidOrPartial } from "@/lib/recent-orders-paid-from-revisions";
import {
  mergeSidebarRecentPaidDismissedKeys,
  SIDEBAR_RECENT_PAID_DISMISSED_STATE_KEY,
  sidebarRecentPaidDismissedKeySet,
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

  const role = session.role as UserRole;
  const moduleAccess = await getEffectiveModuleAccess(tenantId, role);
  if (!canDismissSidebarRecentPaidItems(role, moduleAccess)) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const prisma = await getPrisma();
  const items = await getRecentOrdersPaidAfterUnpaidOrPartial(prisma, tenantId);
  let visible = items;
  if (canDismissSidebarRecentPaidItems(role, moduleAccess)) {
    const [tenantRow, legacyUserRows] = await Promise.all([
      prisma.tenantClientState.findUnique({
        where: {
          tenantId_key: {
            tenantId,
            key: SIDEBAR_RECENT_PAID_DISMISSED_STATE_KEY,
          },
        },
        select: { value: true },
      }),
      prisma.userClientState.findMany({
        where: {
          tenantId,
          key: SIDEBAR_RECENT_PAID_DISMISSED_STATE_KEY,
        },
        select: { value: true },
      }),
    ]);
    const dismissed = sidebarRecentPaidDismissedKeySet(tenantRow?.value);
    for (const row of legacyUserRows) {
      for (const key of sidebarRecentPaidDismissedKeySet(row.value)) {
        dismissed.add(key);
      }
    }
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

/** Отметить строку «Оплаты» прочитанной (скрыть для всех пользователей тенанта) — только админы. */
export async function POST(req: Request) {
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

  const role = session.role as UserRole;
  const moduleAccess = await getEffectiveModuleAccess(tenantId, role);
  if (!canDismissSidebarRecentPaidItems(role, moduleAccess)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
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

  const [tenantRow, legacyUserRows] = await Promise.all([
    prisma.tenantClientState.findUnique({
      where: {
        tenantId_key: {
          tenantId,
          key: SIDEBAR_RECENT_PAID_DISMISSED_STATE_KEY,
        },
      },
      select: { value: true },
    }),
    prisma.userClientState.findMany({
      where: {
        tenantId,
        key: SIDEBAR_RECENT_PAID_DISMISSED_STATE_KEY,
      },
      select: { value: true },
    }),
  ]);
  const prevSet = sidebarRecentPaidDismissedKeySet(tenantRow?.value);
  for (const row of legacyUserRows) {
    for (const key of sidebarRecentPaidDismissedKeySet(row.value)) {
      prevSet.add(key);
    }
  }
  const prev = [...prevSet];
  const value = mergeSidebarRecentPaidDismissedKeys(prev, entry);

  await prisma.tenantClientState.upsert({
    where: {
      tenantId_key: { tenantId, key: SIDEBAR_RECENT_PAID_DISMISSED_STATE_KEY },
    },
    create: {
      tenantId,
      key: SIDEBAR_RECENT_PAID_DISMISSED_STATE_KEY,
      value,
    },
    update: { value },
  });

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
