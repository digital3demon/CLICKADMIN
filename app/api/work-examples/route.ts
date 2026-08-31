import { NextResponse } from "next/server";
import {
  exampleSelect,
  loadOrderLabSnapshot,
  newWorkExampleShareToken,
  purgeExpiredWorkExampleTrash,
  requireWorkExamplesCtx,
} from "@/lib/work-examples/access.server";
import { parseCardTypesSnapshot } from "@/lib/work-examples/composition-snapshot";
import {
  parseWorkExampleTitle,
  type WorkExampleCompositionLine,
} from "@/lib/work-examples/constants";
import { serializeWorkExampleCloudUrls } from "@/lib/work-examples/cloud-urls";
import { serializeWorkExample } from "@/lib/work-examples/serialize";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  await purgeExpiredWorkExampleTrash(ctx.prisma, ctx.tenantId);
  const rows = await ctx.prisma.workExample.findMany({
    where: { tenantId: ctx.tenantId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: exampleSelect,
  });
  return NextResponse.json({
    items: rows.map((r) => serializeWorkExample(r, { includeInternal: true })),
    canDeleteWhole: ["OWNER", "MANAGER", "SENIOR_TECHNICIAN"].includes(ctx.role),
  });
}

export async function POST(req: Request) {
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
  const orderId = typeof o.orderId === "string" ? o.orderId.trim() : "";
  let cardTypes = parseCardTypesSnapshot(o.cardTypes);
  let composition: WorkExampleCompositionLine[] = [];
  let boundOrderId: string | null = null;
  if (orderId) {
    const snap = await loadOrderLabSnapshot(ctx.prisma, ctx.tenantId, orderId);
    if (!snap) return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
    boundOrderId = snap.orderId;
    composition = snap.composition;
    if (!cardTypes.length) cardTypes = snap.cardTypes;
  }
  const cloudUrl = serializeWorkExampleCloudUrls(
    typeof o.cloudUrl === "string" ? o.cloudUrl : "",
  );
  const createData = {
    tenantId: ctx.tenantId,
    title: parseWorkExampleTitle(o.title),
    orderId: boundOrderId,
    cloudUrl: cloudUrl || null,
    technicianNotes: String(o.technicianNotes || "").slice(0, 4000),
    doctorComments: String(o.doctorComments || "").slice(0, 4000),
    cardTypes,
    compositionSnapshot: composition,
    createdByUserId: ctx.actorUserId,
  };
  let row;
  try {
    row = await ctx.prisma.workExample.create({
      data: { ...createData, shareToken: newWorkExampleShareToken() },
      select: exampleSelect,
    });
  } catch {
    row = await ctx.prisma.workExample.create({
      data: { ...createData, shareToken: newWorkExampleShareToken() },
      select: exampleSelect,
    });
  }
  return NextResponse.json({
    item: serializeWorkExample(row, { includeInternal: true }),
  });
}
