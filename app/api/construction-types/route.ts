import { NextResponse } from "next/server";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
export async function GET() {
  try {
    const types = await getPricingPrismaClient().constructionType.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(types);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось загрузить типы работ" },
      { status: 500 },
    );
  }
}
