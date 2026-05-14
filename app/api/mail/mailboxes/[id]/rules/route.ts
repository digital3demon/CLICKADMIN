import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getMailApiContext, stringField } from "@/lib/mail-api-context";

type Ctx = { params: Promise<{ id: string }> };

function jsonObject(value: unknown): Prisma.InputJsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Prisma.InputJsonObject)
    : {};
}

export async function GET(_req: Request, ctx: Ctx) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  const { db, tenantId } = r.ctx;
  const { id } = await ctx.params;
  const rules = await db.mailRule.findMany({
    where: { tenantId, mailboxId: id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ rules });
}

export async function POST(req: Request, ctx: Ctx) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  const { db, tenantId } = r.ctx;
  const { id } = await ctx.params;
  const mailbox = await db.mailMailbox.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!mailbox) return NextResponse.json({ error: "Ящик не найден" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const name = stringField(body?.name, 200);
  if (!name) return NextResponse.json({ error: "Укажите название правила" }, { status: 400 });
  const row = await db.mailRule.create({
    data: {
      tenantId,
      mailboxId: id,
      name,
      sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : 0,
      conditions: jsonObject(body?.conditions),
      actions: jsonObject(body?.actions),
      isActive: typeof body?.isActive === "boolean" ? body.isActive : true,
    },
  });
  return NextResponse.json({ rule: row });
}
