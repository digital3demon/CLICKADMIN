import { NextResponse } from "next/server";
import { prisma as controlPrisma } from "@/lib/prisma";
import { requireWorkExamplesCtx } from "@/lib/work-examples/access.server";
import { parseWorkExampleShowcaseName } from "@/lib/work-examples/constants";
import {
  loadWorkExampleShowcaseBrand,
  saveWorkExampleShowcaseBrand,
} from "@/lib/work-examples/showcase-brand.server";

export const dynamic = "force-dynamic";

async function tenantName(tenantId: string): Promise<string | null> {
  const row = await controlPrisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  return row?.name ?? null;
}

export async function GET() {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const name = await tenantName(ctx.tenantId);
  const brand = await loadWorkExampleShowcaseBrand(ctx.prisma, ctx.tenantId, name);
  return NextResponse.json({
    displayName: brand.displayName,
    tenantName: name,
    labName: brand.labName,
    hasLogo: Boolean(brand.logoRelPath && brand.logoMime),
  });
}

export async function PUT(req: Request) {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const o = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};
  const name = await tenantName(ctx.tenantId);
  const prev = await loadWorkExampleShowcaseBrand(ctx.prisma, ctx.tenantId, name);
  const next = {
    displayName: parseWorkExampleShowcaseName(o.displayName),
    logoRelPath: prev.logoRelPath,
    logoMime: prev.logoMime,
  };
  await saveWorkExampleShowcaseBrand(ctx.prisma, ctx.tenantId, next);
  return NextResponse.json({
    displayName: next.displayName,
    tenantName: name,
    labName: (await loadWorkExampleShowcaseBrand(ctx.prisma, ctx.tenantId, name)).labName,
    hasLogo: Boolean(next.logoRelPath && next.logoMime),
  });
}
