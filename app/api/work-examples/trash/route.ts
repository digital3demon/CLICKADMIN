import { NextResponse } from "next/server";
import {
  exampleSelect,
  purgeExpiredWorkExampleTrash,
  requireWorkExamplesCtx,
} from "@/lib/work-examples/access.server";
import { serializeWorkExample } from "@/lib/work-examples/serialize";
import { isWorkExampleTrashActive } from "@/lib/work-examples/trash";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  await purgeExpiredWorkExampleTrash(ctx.prisma, ctx.tenantId);
  const now = new Date();
  const rows = await ctx.prisma.workExample.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { updatedAt: "desc" },
    select: exampleSelect,
  });
  const examples = rows
    .filter((r) => isWorkExampleTrashActive(r.deletedAt, now))
    .map((r) => serializeWorkExample(r, { includeInternal: true, now }));
  const files: Array<{
    exampleId: string;
    orderNumber: string | null;
    file: { id: string; fileName: string; caption: string };
  }> = [];
  for (const r of rows) {
    const ser = serializeWorkExample(r, { includeInternal: true, now });
    for (const f of ser.deletedFiles) {
      files.push({
        exampleId: r.id,
        orderNumber: ser.orderNumber,
        file: f,
      });
    }
  }
  return NextResponse.json({ examples, files });
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
  const kind = String(o.kind || "");
  const exampleId = String(o.exampleId || "").trim();
  if (!exampleId) return NextResponse.json({ error: "Нет примера" }, { status: 400 });
  const ex = await ctx.prisma.workExample.findFirst({
    where: { id: exampleId, tenantId: ctx.tenantId },
    select: { id: true, cloudUrlPrevious: true },
  });
  if (!ex) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  if (kind === "example") {
    await ctx.prisma.workExample.update({
      where: { id: ex.id },
      data: { deletedAt: null, deletedByUserId: null, deletedByLabel: null },
    });
  } else if (kind === "file") {
    const fileId = String(o.fileId || "").trim();
    const file = await ctx.prisma.workExampleFile.findFirst({
      where: { id: fileId, exampleId: ex.id },
    });
    if (!file) return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
    await ctx.prisma.workExampleFile.update({
      where: { id: file.id },
      data: { deletedAt: null, deletedByUserId: null, deletedByLabel: null },
    });
  } else if (kind === "link") {
    await ctx.prisma.workExample.update({
      where: { id: ex.id },
      data: {
        cloudUrl: ex.cloudUrlPrevious,
        cloudUrlPrevious: null,
        cloudUrlDeletedAt: null,
        cloudUrlDeletedByUserId: null,
        cloudUrlDeletedByLabel: null,
      },
    });
  } else {
    return NextResponse.json({ error: "Неизвестный kind" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
