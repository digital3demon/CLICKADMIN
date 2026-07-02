import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import {
  getClickMigConfig,
  upsertClickMigConfig,
} from "@/lib/clickmig/config.server";
import {
  generateClickMigApiKey,
  hashClickMigApiKey,
} from "@/lib/clickmig/public-auth.server";
import type { ClickMigConfigJson } from "@/lib/clickmig/types";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await requireSessionTenantId(session);
  const prisma = await getOrdersPrisma();
  const { row, json } = await getClickMigConfig(prisma, tenantId);
  return NextResponse.json({
    config: json,
    hasApiKey: Boolean(row.publicApiKeyHash),
    smtpConfigured: Boolean(row.smtpHost && row.smtpUser),
    smtpFromEmail: row.smtpFromEmail,
    smtpFromName: row.smtpFromName,
    smtpHost: row.smtpHost,
    smtpPort: row.smtpPort,
    smtpUser: row.smtpUser,
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await requireSessionTenantId(session);
  const prisma = await getOrdersPrisma();
  const body = (await req.json()) as Partial<ClickMigConfigJson> & {
    regenerateApiKey?: boolean;
    smtpHost?: string | null;
    smtpPort?: number | null;
    smtpUser?: string | null;
    smtpPass?: string | null;
    smtpFromEmail?: string | null;
    smtpFromName?: string | null;
  };

  let publicApiKeyHash: string | null | undefined;
  let plainApiKey: string | undefined;
  if (body.regenerateApiKey) {
    plainApiKey = generateClickMigApiKey();
    publicApiKeyHash = hashClickMigApiKey(plainApiKey);
  }

  const json = await upsertClickMigConfig(prisma, tenantId, {
    ...body,
    ...(publicApiKeyHash !== undefined ? { publicApiKeyHash } : {}),
  });

  return NextResponse.json({
    config: json,
    ...(plainApiKey ? { apiKey: plainApiKey } : {}),
  });
}
