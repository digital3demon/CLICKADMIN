import { NextResponse } from "next/server";
import type { MailLinkedEntityType } from "@prisma/client";
import { getMailApiContext, stringField } from "@/lib/mail-api-context";

type Ctx = { params: Promise<{ id: string }> };

function entityType(value: unknown): MailLinkedEntityType | null {
  return value === "ORDER" || value === "CLINIC" || value === "DOCTOR" ? value : null;
}

export async function POST(req: Request, ctx: Ctx) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  const { db, tenantId, userId } = r.ctx;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const type = entityType(body?.entityType);
  const entityId = stringField(body?.entityId, 200);
  if (!type || !entityId) {
    return NextResponse.json({ error: "Укажите тип и id сущности" }, { status: 400 });
  }
  const message = await db.mailMessage.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!message) return NextResponse.json({ error: "Письмо не найдено" }, { status: 404 });
  const link = await db.mailMessageLink.upsert({
    where: { messageId_entityType_entityId: { messageId: id, entityType: type, entityId } },
    create: {
      tenantId,
      messageId: id,
      entityType: type,
      entityId,
      note: stringField(body?.note, 500) || null,
      createdByUserId: userId,
    },
    update: { note: stringField(body?.note, 500) || null },
  });
  return NextResponse.json({ link });
}
