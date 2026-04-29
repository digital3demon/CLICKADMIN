import "server-only";
import { headers } from "next/headers";
import { publicOriginFromHeaders } from "@/lib/public-origin-from-headers";

/** Базовый URL сайта для абсолютных ссылок (QR и т.п.). */
export async function getSiteOrigin(): Promise<string | null> {
  return publicOriginFromHeaders(await headers());
}
