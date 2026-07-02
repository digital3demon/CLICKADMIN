import type { ClickMigMaterial } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getClickMigConfig } from "@/lib/clickmig/config.server";
import {
  clickMigOptionsResponse,
  resolvePublicClickMigContext,
  withClickMigCors,
} from "@/lib/clickmig/public-api.server";
import type { ClickMigApplicationInput } from "@/lib/clickmig/types";
import { validateClickMigApplication } from "@/lib/clickmig/validation";

export async function OPTIONS(req: NextRequest) {
  const ctx = await resolvePublicClickMigContext(req);
  if (!ctx.ok) return ctx.response;
  return clickMigOptionsResponse(req, ctx.allowedOrigins);
}

export async function POST(req: NextRequest) {
  const ctx = await resolvePublicClickMigContext(req);
  if (!ctx.ok) return ctx.response;

  const body = (await req.json()) as Partial<ClickMigApplicationInput> & {
    photoFileCount?: number;
    scanFileCount?: number;
  };

  const material = body.material as ClickMigMaterial | undefined;
  const input: ClickMigApplicationInput = {
    patientName: String(body.patientName ?? "").trim(),
    doctorName: String(body.doctorName ?? "").trim(),
    doctorEmail: String(body.doctorEmail ?? "").trim(),
    clinic: body.clinic,
    address: body.address,
    constructionTypeKey: String(body.constructionTypeKey ?? "").trim(),
    material: material ?? "ZIRCONIA",
    teethFdi: Array.isArray(body.teethFdi) ? body.teethFdi.map(String) : [],
    screwRetained: body.screwRetained,
    scanbodyManufacturer: body.scanbodyManufacturer,
    shadeGroup: body.shadeGroup,
    shadeCode: body.shadeCode,
    shadeDetail: body.shadeDetail,
    clientNotes: body.clientNotes,
    photoLinks: body.photoLinks,
    scanLinks: body.scanLinks,
  };

  const { json: config } = await getClickMigConfig(ctx.prisma, ctx.tenantId);
  const validation = validateClickMigApplication(config, input, {
    photoFileCount: body.photoFileCount ?? 0,
    scanFileCount: body.scanFileCount ?? 0,
  });

  return withClickMigCors(
    req,
    ctx.allowedOrigins,
    NextResponse.json(validation),
  );
}
