import { getPrisma } from "@/lib/get-prisma";
import {
  getActiveStickerPreset,
  normalizeStickerPrintSettingsV2,
  STICKER_PRINT_SETTINGS_KEY,
  type StickerPrintSettingsV2,
  type StickerTemplatePreset,
} from "@/lib/sticker-template";

export async function getTenantStickerPrintSettings(
  tenantId: string,
): Promise<StickerPrintSettingsV2> {
  const row = await (await getPrisma()).tenantClientState.findUnique({
    where: {
      tenantId_key: {
        tenantId,
        key: STICKER_PRINT_SETTINGS_KEY,
      },
    },
    select: { value: true },
  });
  return normalizeStickerPrintSettingsV2(row?.value ?? null);
}

export async function getTenantActiveStickerPreset(
  tenantId: string,
): Promise<StickerTemplatePreset> {
  const settings = await getTenantStickerPrintSettings(tenantId);
  return getActiveStickerPreset(settings);
}
