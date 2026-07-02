import type { ClickMigMaterial } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { CRM_UPLOAD_MAX_BYTES } from "@/lib/crm-upload-limits";
import { nextClickMigPublicNumber } from "@/lib/clickmig/application-number";
import { getClickMigConfig } from "@/lib/clickmig/config.server";
import {
  getOptionalClientSession,
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
import type { ClickMigApplicationInput } from "@/lib/clickmig/types";
import { validateClickMigApplication } from "@/lib/clickmig/validation";

export async function OPTIONS(req: NextRequest) {
  const ctx = await resolvePublicClickMigContext(req);
  if (!ctx.ok) return ctx.response;
  return clickMigOptionsResponse(req, ctx.allowedOrigins);
}

function parseMaterial(raw: string | null): ClickMigMaterial | null {
  const v = raw?.trim().toUpperCase();
  if (v === "ZIRCONIA" || v === "EMAX" || v === "PMMA" || v === "COMPOSITE") {
    return v;
  }
  return null;
}

function parseJsonArray(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(String).filter(Boolean);
  } catch {
    return raw.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
  }
}

export async function POST(req: NextRequest) {
  const ctx = await resolvePublicClickMigContext(req);
  if (!ctx.ok) return ctx.response;

  const form = await req.formData();
  const material = parseMaterial(form.get("material") as string | null);
  if (!material) {
    return withClickMigCors(
      req,
      ctx.allowedOrigins,
      NextResponse.json({ error: "Неверный материал" }, { status: 400 }),
    );
  }

  const teethFdi = parseJsonArray(form.get("teethFdi") as string | null);
  const clientSession = await getOptionalClientSession(req);

  const input: ClickMigApplicationInput = {
    patientName: String(form.get("patientName") ?? "").trim(),
    doctorName: String(form.get("doctorName") ?? "").trim(),
    doctorEmail: String(form.get("doctorEmail") ?? "").trim(),
    clinic: String(form.get("clinic") ?? "").trim() || undefined,
    address: String(form.get("address") ?? "").trim() || undefined,
    constructionTypeKey: String(form.get("constructionTypeKey") ?? "").trim(),
    material,
    teethFdi,
    screwRetained: form.get("screwRetained") === "1" || form.get("screwRetained") === "true",
    scanbodyManufacturer:
      String(form.get("scanbodyManufacturer") ?? "").trim() || undefined,
    shadeGroup: String(form.get("shadeGroup") ?? "").trim() || undefined,
    shadeCode: String(form.get("shadeCode") ?? "").trim() || undefined,
    shadeDetail: String(form.get("shadeDetail") ?? "").trim() || undefined,
    clientNotes: String(form.get("clientNotes") ?? "").trim() || undefined,
    photoLinks: parseJsonArray(form.get("photoLinks") as string | null),
    scanLinks: parseJsonArray(form.get("scanLinks") as string | null),
    clientId: clientSession?.clientId,
  };

  let photoFileCount = 0;
  let scanFileCount = 0;
  for (const [, value] of form.entries()) {
    if (!(value instanceof File) || value.size === 0) continue;
    const name = value.name.toLowerCase();
    if (name.match(/\.(stl|ply|obj|zip)$/)) scanFileCount += 1;
    else if (value.type.startsWith("image/")) photoFileCount += 1;
  }

  const { json: config } = await getClickMigConfig(ctx.prisma, ctx.tenantId);
  const validation = validateClickMigApplication(config, input, {
    photoFileCount,
    scanFileCount,
  });
  if (!validation.valid) {
    return withClickMigCors(
      req,
      ctx.allowedOrigins,
      NextResponse.json(
        { error: "Заполните обязательные поля", hints: validation.hints },
        { status: 422 },
      ),
    );
  }

  const publicNumber = await nextClickMigPublicNumber(ctx.prisma, ctx.tenantId);

  const application = await ctx.prisma.clickMigApplication.create({
    data: {
      tenantId: ctx.tenantId,
      publicNumber,
      clientId: clientSession?.clientId ?? null,
      guestEmail: input.doctorEmail,
      guestDoctorName: input.doctorName,
      guestClinic: input.clinic ?? null,
      guestAddress: input.address ?? null,
      patientName: input.patientName,
      constructionTypeKey: input.constructionTypeKey,
      material: input.material,
      teethFdi,
      screwRetained: input.screwRetained ?? false,
      scanbodyManufacturer: input.scanbodyManufacturer ?? null,
      shadeGroup: input.shadeGroup ?? null,
      shadeCode: input.shadeCode ?? null,
      shadeDetail: input.shadeDetail ?? null,
      clientNotes: input.clientNotes ?? null,
      photoLinks: input.photoLinks ?? [],
      scanLinks: input.scanLinks ?? [],
    },
  });

  for (const [, value] of form.entries()) {
    if (!(value instanceof File) || value.size === 0) continue;
    if (value.size > CRM_UPLOAD_MAX_BYTES) continue;
    const buf = Buffer.from(await value.arrayBuffer());
    const fileId = newClickMigFileId();
    const kind = inferClickMigFileKind(value.type || "application/octet-stream", value.name);
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
        applicationId: application.id,
        kind,
        fileName: value.name,
        mimeType: value.type || "application/octet-stream",
        sizeBytes: buf.length,
        diskRelPath,
        ...(data ? { data: new Uint8Array(data) } : {}),
      },
    });
  }

  return withClickMigCors(
    req,
    ctx.allowedOrigins,
    NextResponse.json({
      id: application.id,
      publicNumber: application.publicNumber,
      status: application.status,
    }),
  );
}
