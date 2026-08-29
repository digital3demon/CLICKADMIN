import { NextResponse } from "next/server";
import {
  exampleSelect,
  requireWorkExamplesCtx,
} from "@/lib/work-examples/access.server";
import {
  WORK_EXAMPLE_MAX_FILE_BYTES,
  WORK_EXAMPLE_MAX_FILES_PER_UPLOAD,
  type WorkExampleFileKindValue,
} from "@/lib/work-examples/constants";
import { serializeWorkExample } from "@/lib/work-examples/serialize";
import { newWorkExampleFileId, writeWorkExampleFile } from "@/lib/work-examples/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

function parseKind(raw: string | null): WorkExampleFileKindValue {
  if (raw === "PHOTO" || raw === "CAD" || raw === "FILE") return raw;
  return "FILE";
}

function guessKind(file: File, forced: WorkExampleFileKindValue): WorkExampleFileKindValue {
  if (forced !== "FILE") return forced;
  const mime = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  if (mime.startsWith("image/") || /\.(jpe?g|png|gif|webp|heic|bmp)$/i.test(name)) {
    return "PHOTO";
  }
  if (/\.(stl|ply|obj|3mf|drc|dcm|html?)$/i.test(name)) return "CAD";
  return "FILE";
}

/** POST multipart: files[], kind. Лимит 25 МБ, пачка до 40. SQLITE_BUSY — Prisma retry. */
export async function POST(req: Request, ctxP: Ctx) {
  const ctx = await requireWorkExamplesCtx();
  if (!ctx.ok) return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  const { id } = await ctxP.params;
  const example = await ctx.prisma.workExample.findFirst({
    where: { id, tenantId: ctx.tenantId, deletedAt: null },
    select: { id: true, files: { select: { sortOrder: true } } },
  });
  if (!example) return NextResponse.json({ error: "Не найдено" }, { status: 404 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать файлы" }, { status: 400 });
  }
  const forced = parseKind(typeof form.get("kind") === "string" ? String(form.get("kind")) : null);
  const incoming = form.getAll("files").filter((x): x is File => x instanceof File);
  if (!incoming.length) {
    return NextResponse.json({ error: "Нет файлов" }, { status: 400 });
  }
  if (incoming.length > WORK_EXAMPLE_MAX_FILES_PER_UPLOAD) {
    return NextResponse.json(
      { error: `Не больше ${WORK_EXAMPLE_MAX_FILES_PER_UPLOAD} файлов за раз` },
      { status: 400 },
    );
  }
  let sort = example.files.reduce((m, f) => Math.max(m, f.sortOrder), -1) + 1;
  for (const file of incoming) {
    if (file.size > WORK_EXAMPLE_MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `Файл «${file.name}» больше 25 МБ` },
        { status: 400 },
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const fileId = newWorkExampleFileId();
    const kind = guessKind(file, forced);
    const diskRelPath = await writeWorkExampleFile(
      example.id,
      fileId,
      buf,
      file.type || "application/octet-stream",
    );
    await ctx.prisma.workExampleFile.create({
      data: {
        id: fileId,
        exampleId: example.id,
        kind,
        fileName: (file.name || "файл").slice(0, 240),
        mime: (file.type || "application/octet-stream").slice(0, 120),
        sizeBytes: file.size,
        diskRelPath,
        sortOrder: sort,
      },
    });
    sort += 1;
  }
  const row = await ctx.prisma.workExample.findFirstOrThrow({
    where: { id: example.id },
    select: exampleSelect,
  });
  return NextResponse.json({
    item: serializeWorkExample(row, { includeInternal: true }),
  });
}
