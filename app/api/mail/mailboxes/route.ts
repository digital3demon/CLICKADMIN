import { NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { encryptMailSecret } from "@/lib/mail-crypto";
import { mailboxRoleAllowed } from "@/lib/mail-access";
import { getMailApiContext, stringField } from "@/lib/mail-api-context";

function rolesFrom(value: unknown): UserRole[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const allowed = new Set<UserRole>([
    "ADMINISTRATOR",
    "SENIOR_ADMINISTRATOR",
    "SENIOR_TECHNICIAN",
    "PRODUCTION",
    "SENIOR_PRODUCTION",
    "MANAGER",
    "ACCOUNTANT",
    "FINANCIAL_MANAGER",
    "USER",
    "OWNER",
  ]);
  return value.filter((x): x is UserRole => typeof x === "string" && allowed.has(x as UserRole));
}

export async function GET() {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  const { db, tenantId, role } = r.ctx;
  const rows = await db.mailMailbox.findMany({
    where: { tenantId },
    orderBy: [{ isActive: "desc" }, { email: "asc" }],
    include: {
      _count: { select: { messages: true, rules: true } },
    },
  });
  return NextResponse.json({
    mailboxes: rows
      .filter((x) => mailboxRoleAllowed(x, role))
      .map(({ encryptedPassword: _secret, ...x }) => ({
        ...x,
        hasPassword: Boolean(_secret),
      })),
  });
}

export async function POST(req: Request) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  const { db, tenantId } = r.ctx;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const email = stringField(body?.email, 320).toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Укажите email ящика" }, { status: 400 });
  }
  const password = stringField(body?.password, 500);
  const displayName = stringField(body?.displayName, 200) || null;
  const accessRoles = rolesFrom(body?.accessRoles);
  const row = await db.mailMailbox.upsert({
    where: { tenantId_email: { tenantId, email } },
    create: {
      tenantId,
      email,
      displayName,
      accessRoles: accessRoles ?? undefined,
      encryptedPassword: password ? encryptMailSecret(password) : undefined,
      passwordUpdatedAt: password ? new Date() : undefined,
    },
    update: {
      displayName,
      accessRoles: accessRoles ?? undefined,
      ...(password
        ? { encryptedPassword: encryptMailSecret(password), passwordUpdatedAt: new Date() }
        : {}),
    },
  });
  return NextResponse.json({
    mailbox: {
      id: row.id,
      email: row.email,
      displayName: row.displayName,
      isActive: row.isActive,
      hasPassword: Boolean(row.encryptedPassword),
    },
  });
}
