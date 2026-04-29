import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
export async function GET(req: Request) {
  try {
    const s = await getSessionFromCookies();
    if (!s) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    const tenantId = await requireSessionTenantId(s);
    const all =
      new URL(req.url).searchParams.get("all") === "1" ||
      new URL(req.url).searchParams.get("all") === "true";
    const rows = await (await getPrisma()).courier.findMany({
      where: { tenantId, ...(all ? {} : { isActive: true }) },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, sortOrder: true, isActive: true },
    });
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось загрузить курьеров" },
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
    const body = (await req.json()) as PostBody;
    const name = body.name?.trim() ?? "";
    if (!name) {
      return NextResponse.json({ error: "Укажите название" }, { status: 400 });
    }
    const sortOrder =
      typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
        ? Math.trunc(body.sortOrder)
        : 0;
    const isActive = body.isActive !== false;
    const row = await (await getPrisma()).courier.create({
      data: { tenantId, name, sortOrder, isActive },
      select: { id: true, name: true, sortOrder: true, isActive: true },
    });
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось создать курьера" },
      { status: 500 },
    );
  }
}
