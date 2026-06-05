import { NextResponse } from "next/server";
import { canEditStickerPrintSettings } from "@/lib/auth/permissions";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";
import {
  normalizeStickerPrintSettingsV2,
  STICKER_PRINT_SETTINGS_KEY,
  type StickerPrintSettingsV2,
} from "@/lib/sticker-template";
import { getTenantStickerPrintSettings } from "@/lib/sticker-print-settings.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (access?.CONFIG_PRINT !== true) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const tenantId = await requireSessionTenantId(session);
  const settings = await getTenantStickerPrintSettings(tenantId);
  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const { session, access } = await getSessionWithModuleAccess();
  if (!session?.sub) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if (!canEditStickerPrintSettings(session.role, access)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const settings: StickerPrintSettingsV2 = normalizeStickerPrintSettingsV2(body);
  const tenantId = await requireSessionTenantId(session);
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
