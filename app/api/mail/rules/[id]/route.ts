import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { getMailApiContext, stringField } from "@/lib/mail-api-context";

type Ctx = { params: Promise<{ id: string }> };

function jsonObject(value: unknown): Prisma.InputJsonObject | undefined {
  if (value === undefined) return undefined;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Prisma.InputJsonObject)
    : {};
}

export async function PATCH(req: Request, ctx: Ctx) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  const { db, tenantId } = r.ctx;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const row = await db.mailRule.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!row) return NextResponse.json({ error: "Правило не найдено" }, { status: 404 });
  const updated = await db.mailRule.update({
    where: { id },
    data: {
      name: body && "name" in body ? stringField(body.name, 200) : undefined,
      sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : undefined,
      isActive: typeof body?.isActive === "boolean" ? body.isActive : undefined,
      conditions: jsonObject(body?.conditions),
      actions: jsonObject(body?.actions),
    },
  });
  return NextResponse.json({ rule: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  const { db, tenantId } = r.ctx;
  const { id } = await ctx.params;
  const row = await db.mailRule.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!row) return NextResponse.json({ error: "Правило не найдено" }, { status: 404 });
  await db.mailRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
