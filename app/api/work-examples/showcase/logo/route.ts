import { NextResponse } from "next/server";
import { prisma as controlPrisma } from "@/lib/prisma";
import { validateAvatarBuffer } from "@/lib/user-custom-avatar";
import { requireWorkExamplesCtx } from "@/lib/work-examples/access.server";
import { WORK_EXAMPLE_SHOWCASE_LOGO_MAX_BYTES } from "@/lib/work-examples/constants";
import { isWorkExampleFormFile } from "@/lib/work-examples/guess-attach-kind";
import {
  loadWorkExampleShowcaseBrand,
  saveWorkExampleShowcaseBrand,
} from "@/lib/work-examples/showcase-brand.server";
import {
  deleteWorkExampleFileBytes,
  readWorkExampleFileBytes,
  writeWorkExampleFile,
} from "@/lib/work-examples/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function tenantName(tenantId: string): Promise<string | null> {
  const row = await controlPrisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  return row?.name ?? null;
}

/** POST multipart: file. Лимит 2 МБ. SQLITE_BUSY — Prisma retry. */
export async function GET() {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const name = await tenantName(ctx.tenantId);
  const brand = await loadWorkExampleShowcaseBrand(ctx.prisma, ctx.tenantId, name);
  if (!brand.logoRelPath || !brand.logoMime) {
    return NextResponse.json({ error: "Нет логотипа" }, { status: 404 });
  }
  const bytes = await readWorkExampleFileBytes(brand.logoRelPath);
  if (!bytes) return NextResponse.json({ error: "Нет логотипа" }, { status: 404 });
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": brand.logoMime,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function POST(req: Request) {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать файл" }, { status: 400 });
  }
  const file = form.get("file");
  if (!file || !isWorkExampleFormFile(file)) {
    return NextResponse.json({ error: "Нет файла" }, { status: 400 });
  }
  if (file.size > WORK_EXAMPLE_SHOWCASE_LOGO_MAX_BYTES) {
    return NextResponse.json({ error: "Логотип больше 2 МБ" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const validated = validateAvatarBuffer(buf);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const name = await tenantName(ctx.tenantId);
  const prev = await loadWorkExampleShowcaseBrand(ctx.prisma, ctx.tenantId, name);
  if (prev.logoRelPath) await deleteWorkExampleFileBytes(prev.logoRelPath);
  const logoRelPath = await writeWorkExampleFile("_branding", ctx.tenantId, buf, validated.mime);
  await saveWorkExampleShowcaseBrand(ctx.prisma, ctx.tenantId, {
    displayName: prev.displayName,
    logoRelPath,
    logoMime: validated.mime,
  });
  return NextResponse.json({ hasLogo: true });
}

export async function DELETE() {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const name = await tenantName(ctx.tenantId);
  const prev = await loadWorkExampleShowcaseBrand(ctx.prisma, ctx.tenantId, name);
  if (prev.logoRelPath) await deleteWorkExampleFileBytes(prev.logoRelPath);
  await saveWorkExampleShowcaseBrand(ctx.prisma, ctx.tenantId, {
    displayName: prev.displayName,
    logoRelPath: null,
    logoMime: null,
  });
  return NextResponse.json({ hasLogo: false });
}
