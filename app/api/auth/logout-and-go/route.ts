import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session-cookie";

/** Сброс cookie и редирект (для принудительного выхода при отключении учётки). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const nextRaw = url.searchParams.get("next") ?? "/login";
  const nextPath = nextRaw.startsWith("/") ? nextRaw : "/login";
  /** Относительный Location — иначе за nginx в Location попадает 127.0.0.1 / localhost:PORT. */
  const res = new NextResponse(null, {
    status: 307,
    headers: { Location: nextPath },
  });
  clearSessionCookie(res);
  return res;
}
