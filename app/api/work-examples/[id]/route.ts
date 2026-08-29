import { NextResponse } from "next/server";
import {
  exampleSelect,
  loadOrderLabSnapshot,
  requireWorkExamplesCtx,
} from "@/lib/work-examples/access.server";
import { parseCardTypesSnapshot } from "@/lib/work-examples/composition-snapshot";
import { parseWorkExampleTitle } from "@/lib/work-examples/constants";
import { canDeleteWorkExampleWhole } from "@/lib/work-examples/permissions";
import { serializeWorkExample } from "@/lib/work-examples/serialize";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctxP: Ctx) {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { id } = await ctxP.params;
  const row = await ctx.prisma.workExample.findFirst({
    where: { id, tenantId: ctx.tenantId },
    select: exampleSelect,
  });
  if (!row || row.deletedAt) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }
  return NextResponse.json({
    item: serializeWorkExample(row, { includeInternal: true }),
    canDeleteWhole: canDeleteWorkExampleWhole(ctx.role),
  });
}

export async function PATCH(req: Request, ctxP: Ctx) {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { id } = await ctxP.params;
  const existing = await ctx.prisma.workExample.findFirst({
    where: { id, tenantId: ctx.tenantId, deletedAt: null },
  });
  if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const o = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : {};

  const data: Record<string, unknown> = {};
  if (o.title !== undefined) data.title = parseWorkExampleTitle(o.title);
  if (typeof o.technicianNotes === "string") {
    data.technicianNotes = o.technicianNotes.slice(0, 4000);
  }
  if (typeof o.doctorComments === "string") {
    data.doctorComments = o.doctorComments.slice(0, 4000);
  }
  if (o.cardTypes !== undefined) data.cardTypes = parseCardTypesSnapshot(o.cardTypes);
  if (o.orderId !== undefined) {
    const orderId = typeof o.orderId === "string" ? o.orderId.trim() : "";
    if (!orderId) {
      data.orderId = null;
      data.compositionSnapshot = [];
    } else {
      const snap = await loadOrderLabSnapshot(ctx.prisma, ctx.tenantId, orderId);
      if (!snap) return NextResponse.json({ error: "Наряд не найден" }, { status: 404 });
      data.orderId = snap.orderId;
      data.compositionSnapshot = snap.composition;
      if (o.cardTypes === undefined && parseCardTypesSnapshot(existing.cardTypes).length === 0) {
        data.cardTypes = snap.cardTypes;
      }
    }
  }
  if (o.cloudUrl !== undefined) {
    const next = typeof o.cloudUrl === "string" ? o.cloudUrl.trim().slice(0, 2000) : "";
    if (!next && existing.cloudUrl) {
      data.cloudUrl = null;
      data.cloudUrlPrevious = existing.cloudUrl;
      data.cloudUrlDeletedAt = new Date();
      data.cloudUrlDeletedByUserId = ctx.actorUserId;
      data.cloudUrlDeletedByLabel = ctx.actorLabel;
    } else if (next) {
      data.cloudUrl = next;
      data.cloudUrlPrevious = null;
      data.cloudUrlDeletedAt = null;
      data.cloudUrlDeletedByUserId = null;
      data.cloudUrlDeletedByLabel = null;
    }
  }

  const row = await ctx.prisma.workExample.update({
    where: { id: existing.id },
    data,
    select: exampleSelect,
  });
  return NextResponse.json({
    item: serializeWorkExample(row, { includeInternal: true }),
  });
}

export async function DELETE(_req: Request, ctxP: Ctx) {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  if (!canDeleteWorkExampleWhole(ctx.role)) {
    return NextResponse.json({ error: "Удалять пример могут только старшие" }, { status: 403 });
  }
  const { id } = await ctxP.params;
  const existing = await ctx.prisma.workExample.findFirst({
    where: { id, tenantId: ctx.tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  await ctx.prisma.workExample.update({
    where: { id: existing.id },
    data: {
      deletedAt: new Date(),
      deletedByUserId: ctx.actorUserId,
      deletedByLabel: ctx.actorLabel,
    },
  });
  return NextResponse.json({ ok: true });
}
