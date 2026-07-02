import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { CRM_UPLOAD_MAX_BYTES } from "@/lib/crm-upload-limits";
import {
  clickMigOptionsResponse,
  resolvePublicClickMigContext,
  withClickMigCors,
} from "@/lib/clickmig/public-api.server";
import {
  inferClickMigFileKind,
  isClickMigS3Enabled,
  newClickMigFileId,
  writeClickMigFileToDisk,
  writeClickMigFileToS3,
} from "@/lib/clickmig/storage.server";
import type { ClickMigBlockedFieldKey } from "@/lib/clickmig/types";

export async function OPTIONS(req: NextRequest) {
  const ctx = await resolvePublicClickMigContext(req);
  if (!ctx.ok) return ctx.response;
  return clickMigOptionsResponse(req, ctx.allowedOrigins);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const ctx = await resolvePublicClickMigContext(req);
  if (!ctx.ok) return ctx.response;
  const { token } = await params;

  const order = await ctx.prisma.clickMigOrder.findFirst({
    where: { resubmitToken: token, tenantId: ctx.tenantId },
    include: { application: { include: { files: true } } },
  });
  if (!order) {
    return withClickMigCors(
      req,
      ctx.allowedOrigins,
      NextResponse.json({ error: "Ссылка недействительна" }, { status: 404 }),
    );
  }
  if (
    order.resubmitTokenExpiresAt &&
    order.resubmitTokenExpiresAt.getTime() < Date.now()
  ) {
    return withClickMigCors(
      req,
      ctx.allowedOrigins,
      NextResponse.json({ error: "Срок ссылки истёк" }, { status: 410 }),
    );
  }

  const blockedFields = (order.blockedFields as ClickMigBlockedFieldKey[] | null) ?? [];

  return withClickMigCors(
    req,
    ctx.allowedOrigins,
    NextResponse.json({
      publicNumber: order.publicNumber,
      blockedReason: order.blockedReason,
      blockedFields,
      application: {
        patientName: order.application.patientName,
        clientNotes: order.application.clientNotes,
        photoLinks: order.application.photoLinks,
        scanLinks: order.application.scanLinks,
        files: order.application.files.map((f) => ({
          id: f.id,
          kind: f.kind,
          fileName: f.fileName,
        })),
      },
    }),
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const ctx = await resolvePublicClickMigContext(req);
  if (!ctx.ok) return ctx.response;
  const { token } = await params;

  const order = await ctx.prisma.clickMigOrder.findFirst({
    where: { resubmitToken: token, tenantId: ctx.tenantId },
    include: { application: true },
  });
  if (!order) {
    return withClickMigCors(
      req,
      ctx.allowedOrigins,
      NextResponse.json({ error: "Ссылка недействительна" }, { status: 404 }),
    );
  }

  const blockedFields = (order.blockedFields as ClickMigBlockedFieldKey[] | null) ?? [];
  const form = await req.formData();

  const appPatch: Record<string, unknown> = {};
  if (blockedFields.includes("clientNotes")) {
    appPatch.clientNotes = String(form.get("clientNotes") ?? "").trim();
  }
  if (blockedFields.includes("photos")) {
    appPatch.photoLinks = JSON.parse(
      String(form.get("photoLinks") ?? "[]"),
    ) as string[];
  }
  if (blockedFields.includes("scans")) {
    appPatch.scanLinks = JSON.parse(
      String(form.get("scanLinks") ?? "[]"),
    ) as string[];
  }

  if (Object.keys(appPatch).length > 0) {
    await ctx.prisma.clickMigApplication.update({
      where: { id: order.applicationId },
      data: appPatch,
    });
  }

  for (const [, value] of form.entries()) {
    if (!(value instanceof File) || value.size === 0) continue;
    if (value.size > CRM_UPLOAD_MAX_BYTES) continue;
    const kind = inferClickMigFileKind(value.type, value.name);
    const allowed =
      (kind === "PHOTO" && blockedFields.includes("photos")) ||
      (kind === "SCAN" && blockedFields.includes("scans"));
    if (!allowed) continue;

    const buf = Buffer.from(await value.arrayBuffer());
    const fileId = newClickMigFileId();
    let diskRelPath: string | null = null;
    let data: Buffer | null = null;
    if (isClickMigS3Enabled()) {
      diskRelPath = await writeClickMigFileToS3(
        ctx.tenantId,
        fileId,
        buf,
        value.type || "application/octet-stream",
      );
    } else if (buf.length <= 8 * 1024 * 1024) {
      data = buf;
    } else {
      diskRelPath = await writeClickMigFileToDisk(ctx.tenantId, fileId, buf);
    }
    await ctx.prisma.clickMigFile.create({
      data: {
        id: fileId,
        tenantId: ctx.tenantId,
        applicationId: order.applicationId,
        orderId: order.id,
        kind,
        fileName: value.name,
        mimeType: value.type || "application/octet-stream",
        sizeBytes: buf.length,
        diskRelPath,
        ...(data ? { data: new Uint8Array(data) } : {}),
      },
    });
  }

  await ctx.prisma.clickMigOrder.update({
    where: { id: order.id },
    data: {
      status: "ACTIVE",
      blockedAt: null,
      blockedReason: null,
      blockedFields: Prisma.DbNull,
    },
  });

  return withClickMigCors(
    req,
    ctx.allowedOrigins,
    NextResponse.json({ ok: true }),
  );
}
