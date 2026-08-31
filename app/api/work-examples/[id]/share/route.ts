import { NextResponse } from "next/server";
import { crmPublicBaseUrl } from "@/lib/crm-public-base-url";
import {
  newWorkExampleShareToken,
  requireWorkExamplesCtx,
} from "@/lib/work-examples/access.server";
import {
  isLongWorkExampleShareToken,
  workExampleShareUrl,
} from "@/lib/work-examples/share-url";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctxP: Ctx) {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { id } = await ctxP.params;
  const row = await ctx.prisma.workExample.findFirst({
    where: { id, tenantId: ctx.tenantId, deletedAt: null },
    select: { id: true, shareToken: true },
  });
  if (!row) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  let token = row.shareToken;
  if (isLongWorkExampleShareToken(token)) {
    try {
      const next = newWorkExampleShareToken();
      await ctx.prisma.workExample.update({
        where: { id: row.id },
        data: { shareToken: next },
      });
      token = next;
    } catch {
      /* уникальный индекс — копируем прежний токен */
    }
  }
  const url = workExampleShareUrl(crmPublicBaseUrl(), token);
  return NextResponse.json({ url });
}
