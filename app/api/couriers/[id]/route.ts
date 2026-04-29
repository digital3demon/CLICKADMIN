import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
type PatchBody = {
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
};

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await ctx.params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Нет id" }, { status: 400 });
    }
    const body = (await req.json()) as PatchBody;
    const data: Record<string, unknown> = {};
    if (typeof body.name === "string") {
      const n = body.name.trim();
      if (!n) {
        return NextResponse.json({ error: "Пустое название" }, { status: 400 });
      }
      data.name = n;
    }
    if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
      data.sortOrder = Math.trunc(body.sortOrder);
    }
    if (typeof body.isActive === "boolean") {
      data.isActive = body.isActive;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Нет полей для обновления" },
        { status: 400 },
      );
    }
    const row = await (await getPrisma()).courier.update({
      where: { id: id.trim() },
      data: data as never,
      select: { id: true, name: true, sortOrder: true, isActive: true },
    });
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось обновить курьера" },
      { status: 500 },
    );
  }
}
