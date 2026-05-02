import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isProvisioningEnabled(): boolean {
  return process.env.ENABLE_TENANT_PROVISIONING === "1";
}

type Body = {
  slug?: string;
  name?: string | null;
  tenantDatabaseUrl?: string;
  activate?: boolean;
};

async function testDatabaseConnection(dbUrl: string): Promise<void> {
  const p = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  try {
    await p.$queryRawUnsafe("SELECT 1");
  } finally {
    await p.$disconnect().catch(() => undefined);
  }
}

export async function POST(req: Request) {
  if (!isProvisioningEnabled()) {
    return NextResponse.json({ error: "Provisioning disabled" }, { status: 404 });
  }
  const session = await getSessionFromCookies();
  if (!session || session.role !== "OWNER") {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }

  const slug = String(body.slug || "").trim();
  const tenantDatabaseUrl = String(body.tenantDatabaseUrl || "").trim();
  if (!slug || !tenantDatabaseUrl) {
    return NextResponse.json(
      { error: "Нужны slug и tenantDatabaseUrl" },
      { status: 400 },
    );
  }

  try {
    await testDatabaseConnection(tenantDatabaseUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "connection failed";
    return NextResponse.json(
      { error: `Не удалось подключиться к tenant DB: ${message}` },
      { status: 400 },
    );
  }

  const activate = body.activate === true;
  const tenant = await prisma.tenant.upsert({
    where: { slug },
    create: {
      slug,
      name: body.name?.trim() || slug,
      tenantDatabaseUrl,
      tenantDatabaseEnabled: activate,
      tenantDatabaseReadyAt: activate ? new Date() : null,
    },
    update: {
      name: body.name?.trim() || undefined,
      tenantDatabaseUrl,
      tenantDatabaseEnabled: activate,
      tenantDatabaseReadyAt: activate ? new Date() : null,
    },
    select: {
      id: true,
      slug: true,
      tenantDatabaseEnabled: true,
      tenantDatabaseReadyAt: true,
    },
  });

  return NextResponse.json({ ok: true, tenant });
}
