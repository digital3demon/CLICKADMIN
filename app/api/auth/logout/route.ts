import { NextResponse } from "next/server";
import {
  clearDemoSessionCookie,
  clearSessionCookie,
} from "@/lib/auth/session-cookie";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  clearDemoSessionCookie(res);
  return res;
}
