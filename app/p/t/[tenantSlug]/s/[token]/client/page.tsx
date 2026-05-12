import { redirect } from "next/navigation";
import { stickerPublicHubPath } from "@/lib/sticker-public-path";

export const dynamic = "force-dynamic";

/** Старые ссылки `/…/client` — на главную витрину (клиентский вид). */
export default async function StickerPublicClientLegacyRedirect({
  params,
}: {
  params: Promise<{ tenantSlug: string; token: string }>;
}) {
  const { tenantSlug, token } = await params;
  redirect(stickerPublicHubPath(tenantSlug, token));
}
