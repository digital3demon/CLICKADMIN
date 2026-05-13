import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import {
  clearViewAsRoleCookie,
  setViewAsRoleCookie,
} from "@/lib/auth/session-cookie";
import { parseViewAsRole } from "@/lib/auth/view-as-role";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }
  if ((session.actualRole ?? session.role) !== "OWNER") {
    return NextResponse.json({ error: "Доступно только владельцу" }, { status: 403 });
  }

  let body: { role?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* пустое тело — сброс */
  }

  const roleRaw = typeof body.role === "string" ? body.role : "";
  const res = NextResponse.json({ ok: true });
  if (roleRaw === "" || roleRaw === "OWNER") {
    clearViewAsRoleCookie(res);
    return res;
  }

  const role = roleRaw === "NO_CATEGORY" ? "USER" : parseViewAsRole(roleRaw);
  if (!role) {
    return NextResponse.json({ error: "Некорректная роль" }, { status: 400 });
  }
  setViewAsRoleCookie(res, role);
  return res;
}
