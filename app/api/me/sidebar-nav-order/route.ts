import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import {
  SIDEBAR_NAV_ORDER_KEY,
  normalizeSidebarNavOrder,
} from "@/lib/sidebar-nav-order";

export const dynamic = "force-dynamic";

type PutBody = {
  order?: unknown;
};

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const prisma = await getPrisma();
  const row = await prisma.userClientState.findUnique({
    where: {
      userId_key: {
        userId: session.sub,
        key: SIDEBAR_NAV_ORDER_KEY,
      },
    },
    select: { value: true, updatedAt: true },
  });
  const order = normalizeSidebarNavOrder(row?.value ?? null);

  return NextResponse.json({
    found: row != null && order != null,
    order: order ?? [],
    updatedAt: row?.updatedAt?.toISOString() ?? null,
  });
}

export async function PUT(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const order = normalizeSidebarNavOrder(body.order);
  if (!order) {
    return NextResponse.json({ error: "Некорректный порядок меню" }, { status: 400 });
  }

  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }

  const prisma = await getPrisma();
  await prisma.userClientState.upsert({
    where: {
      userId_key: {
        userId: session.sub,
        key: SIDEBAR_NAV_ORDER_KEY,
      },
    },
    create: {
      userId: session.sub,
      tenantId,
      key: SIDEBAR_NAV_ORDER_KEY,
      value: order as never,
    },
    update: {
      tenantId,
      value: order as never,
    },
  });

  return NextResponse.json({ ok: true, order });
}
