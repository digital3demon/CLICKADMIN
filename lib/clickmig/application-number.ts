import type { PrismaClient } from "@prisma/client";

export async function nextClickMigPublicNumber(
  prisma: PrismaClient,
  tenantId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `KM-${year}-`;
  const last = await prisma.clickMigApplication.findFirst({
    where: {
      tenantId,
      publicNumber: { startsWith: prefix },
    },
    orderBy: { publicNumber: "desc" },
    select: { publicNumber: true },
  });
  let seq = 1;
  if (last?.publicNumber) {
    const tail = last.publicNumber.slice(prefix.length);
    const n = parseInt(tail, 10);
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}
