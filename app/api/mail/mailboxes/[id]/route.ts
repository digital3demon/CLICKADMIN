import { NextResponse } from "next/server";
import { encryptMailSecret } from "@/lib/mail-crypto";
import { getMailApiContext, stringField } from "@/lib/mail-api-context";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const r = await getMailApiContext();
  if (!r.ok) return r.response;
  const { db, tenantId } = r.ctx;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const password = stringField(body?.password, 500);
  const row = await db.mailMailbox.findFirst({ where: { id, tenantId } });
  if (!row) return NextResponse.json({ error: "Ящик не найден" }, { status: 404 });
  const updated = await db.mailMailbox.update({
    where: { id },
    data: {
      displayName: body && "displayName" in body ? stringField(body.displayName, 200) || null : undefined,
      isActive: typeof body?.isActive === "boolean" ? body.isActive : undefined,
      ...(password
        ? { encryptedPassword: encryptMailSecret(password), passwordUpdatedAt: new Date() }
        : {}),
    },
  });
  return NextResponse.json({
    mailbox: {
      id: updated.id,
      email: updated.email,
      displayName: updated.displayName,
      isActive: updated.isActive,
      hasPassword: Boolean(updated.encryptedPassword),
    },
  });
}
