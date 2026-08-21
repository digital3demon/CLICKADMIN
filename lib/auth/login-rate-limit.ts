import { NextResponse } from "next/server";
import {
  AUTH_LOGIN_EMAIL_MAX,
  AUTH_LOGIN_IP_MAX,
  AUTH_LOGIN_WINDOW_MS,
  rateLimitAllow,
} from "@/lib/server/rate-limit-edge";

export function clientIpFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  return (
    fwd?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

/** ~60 / 15 мин на IP (офисный NAT), ~10 / 15 мин на почту. */
export function jsonIfAuthLoginRateLimited(
  req: Request,
  email?: string,
): NextResponse | null {
  const ip = clientIpFromHeaders(req.headers);
  if (!rateLimitAllow(`auth-login:ip:${ip}`, AUTH_LOGIN_IP_MAX, AUTH_LOGIN_WINDOW_MS)) {
    return NextResponse.json(
      { error: "Слишком много попыток входа. Подождите несколько минут." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
  const mail = email?.trim().toLowerCase();
  if (
    mail &&
    !rateLimitAllow(
      `auth-login:email:${mail}`,
      AUTH_LOGIN_EMAIL_MAX,
      AUTH_LOGIN_WINDOW_MS,
    )
  ) {
    return NextResponse.json(
      { error: "Слишком много попыток для этой почты. Подождите несколько минут." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }
  return null;
}
