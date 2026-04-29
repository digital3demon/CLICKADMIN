import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { ensureKaitenDirectory } from "@/lib/kaiten-directory-bootstrap";
import { getKaitenRestAuth, kaitenListCardTypes } from "@/lib/kaiten-rest";
import { resolveKaitenExternalTypeIdForCardTypeName } from "@/lib/kaiten-card-types-sync";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";

export async function GET(req: Request) {
  try {
    const s = await getSessionFromCookies();
    if (!s) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    const tenantId = await requireSessionTenantId(s);
    const prisma = await getPrisma();
    await ensureKaitenDirectory(prisma, tenantId);
    const { searchParams } = new URL(req.url);
    const all = searchParams.get("all") === "1";
    const items = await prisma.kaitenCardType.findMany({
      where: { tenantId, ...(all ? {} : { isActive: true }) },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось загрузить типы карточек" },
      { status: 500 },
    );
  }
}

type PostBody = {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export async function POST(req: Request) {
  try {
    const s = await getSessionFromCookies();
    if (!s) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    const tenantId = await requireSessionTenantId(s);
    const prisma = await getPrisma();
    await ensureKaitenDirectory(prisma, tenantId);
    const body = (await req.json()) as PostBody;
    const name = body.name?.trim() ?? "";
    if (!name) {
      return NextResponse.json({ error: "Укажите название" }, { status: 400 });
    }
    const nameTaken = await prisma.kaitenCardType.findFirst({
      where: { tenantId, name },
      select: { id: true },
    });
    if (nameTaken) {
      return NextResponse.json(
        { error: "Тип с таким названием уже есть" },
        { status: 400 },
      );
    }

    const auth = getKaitenRestAuth();
    if (!auth) {
      return NextResponse.json(
        {
          error:
            "Не настроен доступ к API Kaiten: задайте KAITEN_API_TOKEN (и при необходимости KAITEN_API_BASE_URL), чтобы подставить type_id по названию.",
        },
        { status: 400 },
      );
    }
    const listed = await kaitenListCardTypes(auth);
    if (!listed.ok) {
      const status = listed.status >= 400 && listed.status < 600 ? listed.status : 502;
      return NextResponse.json(
        { error: listed.error ?? "Не удалось получить список типов из Kaiten" },
        { status },
      );
    }
    const resolved = resolveKaitenExternalTypeIdForCardTypeName(name, listed.types);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: 400 });
    }
    const externalTypeId = resolved.externalTypeId;

    const sortOrder =
      typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
        ? Math.trunc(body.sortOrder)
        : 0;
    const isActive = body.isActive !== false;
    const row = await prisma.kaitenCardType.create({
      data: { tenantId, name, externalTypeId, sortOrder, isActive },
    });
    return NextResponse.json({
      ...row,
      kaitenAmbiguousName: resolved.ambiguousInKaiten,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось создать тип" },
      { status: 500 },
    );
  }
}
