import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { syncKaitenCardTypeIdsFromRemote } from "@/lib/kaiten-card-types-sync";

/** Обновить externalTypeId у типов в БД по списку GET /card-types из Kaiten. */
export async function POST() {
  try {
    const prisma = await getPrisma();
    const result = await syncKaitenCardTypeIdsFromRemote(prisma);
    if (!result.ok) {
      const status = result.error.includes("KAITEN_API_TOKEN") ? 400 : 502;
      return NextResponse.json({ error: result.error }, { status });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось синхронизировать типы с Kaiten" },
      { status: 500 },
    );
  }
}
