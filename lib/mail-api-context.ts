import "server-only";
import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";

export type MailApiContext = {
  tenantId: string;
  userId: string;
  role: UserRole;
  db: Awaited<ReturnType<typeof getOrdersPrisma>>;
};

export async function getMailApiContext(): Promise<
  | { ok: true; ctx: MailApiContext }
  | { ok: false; response: NextResponse }
> {
  const session = await getSessionFromCookies();
  const tenantId = session ? await getTenantIdForSession(session) : null;
  if (!session || !tenantId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Требуется вход" }, { status: 401 }),
    };
  }
  return {
    ok: true,
    ctx: {
      tenantId,
      userId: session.sub,
      role: session.role,
      db: await getOrdersPrisma(),
    },
  };
}

export function stringField(value: unknown, max = 2000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
