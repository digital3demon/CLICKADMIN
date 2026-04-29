import type { PrismaClient } from "@prisma/client";

const WORKSPACE_ROW_ID = "default";

/**
 * Гарантирует наличие хотя бы одного каталога и строки настроек с валидным activePriceListId.
 */
export async function ensurePriceListWorkspace(
  prisma: PrismaClient,
): Promise<{ activePriceListId: string }> {
  let lists = await prisma.priceList.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true },
  });
  if (lists.length === 0) {
    const pl = await prisma.priceList.create({
      data: { name: "Основной", sortOrder: 0 },
    });
    lists = [{ id: pl.id }];
  }
  const fallbackId = lists[0]!.id;
  let ws = await prisma.priceListWorkspaceSettings.findUnique({
    where: { id: WORKSPACE_ROW_ID },
    select: { activePriceListId: true },
  });
  if (!ws) {
    await prisma.priceListWorkspaceSettings.create({
      data: { id: WORKSPACE_ROW_ID, activePriceListId: fallbackId },
    });
    return { activePriceListId: fallbackId };
  }
  const activeOk = lists.some((l) => l.id === ws.activePriceListId);
  if (!activeOk) {
    await prisma.priceListWorkspaceSettings.update({
      where: { id: WORKSPACE_ROW_ID },
      data: { activePriceListId: fallbackId },
    });
    return { activePriceListId: fallbackId };
  }
  return { activePriceListId: ws.activePriceListId };
}

export async function getActivePriceListId(
  prisma: PrismaClient,
): Promise<string> {
  const { activePriceListId } = await ensurePriceListWorkspace(prisma);
  return activePriceListId;
}

export async function setActivePriceListId(
  prisma: PrismaClient,
  nextId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const id = nextId.trim();
  if (!id) return { ok: false, error: "Не указан каталог" };
  const exists = await prisma.priceList.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) return { ok: false, error: "Каталог не найден" };
  await ensurePriceListWorkspace(prisma);
  await prisma.priceListWorkspaceSettings.upsert({
    where: { id: WORKSPACE_ROW_ID },
    create: { id: WORKSPACE_ROW_ID, activePriceListId: id },
    update: { activePriceListId: id },
  });
  return { ok: true };
}
