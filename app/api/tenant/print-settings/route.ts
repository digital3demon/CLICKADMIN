import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import {
  normalizeStickerPrintSettings,
  STICKER_PRINT_SETTINGS_KEY,
} from "@/lib/sticker-print-settings";
import { getTenantStickerPrintSettings } from "@/lib/sticker-print-settings.server";

export const dynamic = "force-dynamic";

function canEditPrintSettings(role: UserRole): boolean {
  return (
    role === "OWNER" ||
    role === "SENIOR_ADMINISTRATOR" ||
    role === "ADMINISTRATOR"
  );
}

export async function GET() {
  const s = await getSessionFromCookies();
  if (!s?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  const tenantId = await requireSessionTenantId(s);
  const settings = await getTenantStickerPrintSettings(tenantId);
  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const s = await getSessionFromCookies();
  if (!s?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!canEditPrintSettings(s.role as UserRole)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const settings = normalizeStickerPrintSettings(body);
  const tenantId = await requireSessionTenantId(s);
  await (await getPrisma()).tenantClientState.upsert({
    where: {
      tenantId_key: {
        tenantId,
        key: STICKER_PRINT_SETTINGS_KEY,
      },
    },
    create: {
      tenantId,
      key: STICKER_PRINT_SETTINGS_KEY,
      value: settings as never,
    },
    update: {
      value: settings as never,
    },
  });
  return NextResponse.json({ ok: true, ...settings });
}
