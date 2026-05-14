import { getPrisma } from "@/lib/get-prisma";
import {
  normalizeStickerPrintSettings,
  STICKER_PRINT_SETTINGS_KEY,
} from "@/lib/sticker-print-settings";

export async function getTenantStickerPrintSettings(tenantId: string) {
  const row = await (await getPrisma()).tenantClientState.findUnique({
    where: {
      tenantId_key: {
        tenantId,
        key: STICKER_PRINT_SETTINGS_KEY,
      },
    },
    select: { value: true },
  });
  return normalizeStickerPrintSettings(row?.value ?? null);
}
