import type { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, SESSION_DEMO_COOKIE_NAME } from "@/lib/auth/jwt";

const WEEK_SEC = 60 * 60 * 24 * 7;

/** В production по умолчанию Secure (только HTTPS). По HTTP (например, только IP до Certbot) задайте AUTH_COOKIE_SECURE=0. */
function useSecureSessionCookie(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  const v = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();
  if (v === "0" || v === "false") return false;
  return true;
}

export function setSessionCookie(res: NextResponse, token: string): void {
  const secure = useSecureSessionCookie();
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: WEEK_SEC,
  });
}

export function clearSessionCookie(res: NextResponse): void {
  const secure = useSecureSessionCookie();
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function setDemoSessionCookie(res: NextResponse, token: string): void {
  const secure = useSecureSessionCookie();
  res.cookies.set(SESSION_DEMO_COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: WEEK_SEC,
  });
}

export function clearDemoSessionCookie(res: NextResponse): void {
  const secure = useSecureSessionCookie();
  res.cookies.set(SESSION_DEMO_COOKIE_NAME, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
