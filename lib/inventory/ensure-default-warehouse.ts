import type { Warehouse } from "@prisma/client";
import { getPrisma } from "@/lib/get-prisma";

/**
 * Гарантирует наличие хотя бы одного склада; при пустой таблице создаёт демо/основной.
 * Без глобального inflight-кэша: демо и прод — разные PrismaClient/схемы.
 */
export async function ensureDefaultWarehouse(): Promise<Warehouse> {
  const prisma = await getPrisma();
  const existingDefault = await prisma.warehouse.findFirst({
    where: { isDefault: true, isActive: true },
  });
  if (existingDefault) return existingDefault;

  const any = await prisma.warehouse.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (any) return any;

  return prisma.warehouse.create({
    data: {
      name: "Основной склад",
      isDefault: true,
      isActive: true,
    },
  });
}

/**
 * Если нет активного склада с флагом «по умолчанию», назначает его первому активному.
 */
export async function repairDefaultWarehouseFlag() {
  const prisma = await getPrisma();
  const activeDefault = await prisma.warehouse.findFirst({
    where: { isDefault: true, isActive: true },
  });
  if (activeDefault) return;

  await prisma.warehouse.updateMany({
    where: { isDefault: true },
    data: { isDefault: false },
  });

  const candidate = await prisma.warehouse.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (candidate) {
    await prisma.warehouse.update({
      where: { id: candidate.id },
      data: { isDefault: true },
    });
  }
}
