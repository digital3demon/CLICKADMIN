import { NextResponse } from "next/server";
import { crmPublicBaseUrl } from "@/lib/crm-public-base-url";
import { requireWorkExamplesCtx } from "@/lib/work-examples/access.server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctxP: Ctx) {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { id } = await ctxP.params;
  const row = await ctx.prisma.workExample.findFirst({
    where: { id, tenantId: ctx.tenantId, deletedAt: null },
    select: { shareToken: true },
  });
  if (!row) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  const tenant = await ctx.prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { slug: true },
  });
  const slug = tenant?.slug?.trim() || "lab";
  const url = `${crmPublicBaseUrl()}/p/t/${encodeURIComponent(slug)}/w/${encodeURIComponent(row.shareToken)}`;
  return NextResponse.json({ url });
}
