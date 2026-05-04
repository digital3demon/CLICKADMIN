import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { extractContractTemplatePlaceholders } from "@/lib/clinic-contract";
import { getPrisma } from "@/lib/get-prisma";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_TEMPLATE_SIZE_BYTES = 15 * 1024 * 1024;

function toDbBytes(buf: Buffer): Uint8Array<ArrayBuffer> {
  const start = buf.byteOffset;
  const end = start + buf.byteLength;
  const ab = buf.buffer.slice(start, end) as ArrayBuffer;
  return new Uint8Array(ab);
}

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    const tenantId = await requireSessionTenantId(session);
    const prisma = await getPrisma();
    const row = await prisma.contractTemplateSettings.findUnique({
      where: { id: tenantId },
      select: {
        fileName: true,
        mimeType: true,
        placeholders: true,
        updatedAt: true,
      },
    });
    if (!row) {
      return NextResponse.json({ hasTemplate: false, placeholders: [] });
    }
    const placeholders = Array.isArray(row.placeholders)
      ? row.placeholders.map((x) => String(x ?? "")).filter((x) => x.trim().length > 0)
      : [];
    return NextResponse.json({
      hasTemplate: true,
      fileName: row.fileName,
      mimeType: row.mimeType,
      placeholders,
      updatedAt: row.updatedAt.toISOString(),
    });
  } catch (e) {
    console.error("[contract-template] GET", e);
    return NextResponse.json(
      { error: "Не удалось загрузить шаблон договора" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    const tenantId = await requireSessionTenantId(session);

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json(
        { error: "Ожидается multipart/form-data" },
        { status: 400 },
      );
    }
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Поле file обязательно" }, { status: 400 });
    }
    if (!/\.docx$/i.test(file.name)) {
      return NextResponse.json({ error: "Нужен файл .docx" }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_TEMPLATE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Размер шаблона должен быть от 1 байта до 15 МБ" },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const placeholders = await extractContractTemplatePlaceholders(bytes);

    const prisma = await getPrisma();
    await prisma.contractTemplateSettings.upsert({
      where: { id: tenantId },
      create: {
        id: tenantId,
        fileName: file.name.trim() || "contract-template.docx",
        mimeType: file.type || DOCX_MIME,
        docxBytes: toDbBytes(bytes),
        placeholders,
      },
      update: {
        fileName: file.name.trim() || "contract-template.docx",
        mimeType: file.type || DOCX_MIME,
        docxBytes: toDbBytes(bytes),
        placeholders,
      },
    });

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      placeholders,
    });
  } catch (e) {
    console.error("[contract-template] POST", e);
    return NextResponse.json(
      { error: "Не удалось загрузить шаблон договора" },
      { status: 500 },
    );
  }
}
