import { NextResponse } from "next/server";
import { getPricingPrismaClient } from "@/lib/prisma-pricing";
export async function GET() {
  const prisma = getPricingPrismaClient();
  try {
    const rows = await prisma.material.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось загрузить материалы" },
      { status: 500 },
    );
  }
}
