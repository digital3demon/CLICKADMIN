import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";

export const dynamic = "force-dynamic";

type Scope = "user" | "tenant";

function parseScope(raw: string | null): Scope | null {
  if (raw === "user" || raw === "tenant") return raw;
  return null;
}

function parseKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if (!v) return null;
  if (v.length > 128) return null;
  return v;
}

export async function GET(req: Request) {
  const session = await getSessionFromCookies();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const url = new URL(req.url);
  const scope = parseScope(url.searchParams.get("scope"));
  const key = parseKey(url.searchParams.get("key"));
  if (!scope || !key) {
    return NextResponse.json(
      { error: "Ожидаются query-параметры scope и key" },
      { status: 400 },
    );
  }

  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }

  const prisma = await getPrisma();
  if (scope === "user") {
    const row = await prisma.userClientState.findUnique({
      where: { userId_key: { userId: session.sub, key } },
      select: { value: true, updatedAt: true },
    });
    return NextResponse.json({
      found: row != null,
      value: row?.value ?? null,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    });
  }

  const row = await prisma.tenantClientState.findUnique({
    where: { tenantId_key: { tenantId, key } },
    select: { value: true, updatedAt: true },
  });
  return NextResponse.json({
    found: row != null,
    value: row?.value ?? null,
    updatedAt: row?.updatedAt?.toISOString() ?? null,
  });
}

type PutBody = {
  scope?: Scope;
  key?: string;
  value?: unknown;
};

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

  const scope = parseScope(body.scope ?? null);
  const key = parseKey(body.key);
  if (!scope || !key) {
    return NextResponse.json({ error: "Ожидаются scope и key" }, { status: 400 });
  }

  const tenantId = await getTenantIdForSession(session);
  if (!tenantId) {
    return NextResponse.json({ error: "Нет контекста организации" }, { status: 403 });
  }

  const prisma = await getPrisma();
  if (body.value === null) {
    if (scope === "user") {
      await prisma.userClientState.deleteMany({
        where: { userId: session.sub, key },
      });
    } else {
      await prisma.tenantClientState.deleteMany({
        where: { tenantId, key },
      });
    }
    return NextResponse.json({ ok: true, deleted: true });
  }

  if (scope === "user") {
    await prisma.userClientState.upsert({
      where: { userId_key: { userId: session.sub, key } },
      create: {
        userId: session.sub,
        tenantId,
        key,
        value: body.value as never,
      },
      update: { value: body.value as never, tenantId },
    });
    return NextResponse.json({ ok: true, scope, key });
  }

  await prisma.tenantClientState.upsert({
    where: { tenantId_key: { tenantId, key } },
    create: {
      tenantId,
      key,
      value: body.value as never,
    },
    update: { value: body.value as never },
  });
  return NextResponse.json({ ok: true, scope, key });
}
