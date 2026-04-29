import type { Warehouse } from "@prisma/client";
import { getPrisma } from "@/lib/get-prisma";
/** Схлопывает параллельные вызовы (несколько GET /api/inventory/* в один момент). */
let ensureInflight: Promise<Warehouse> | null = null;

/**
 * Гарантирует наличие хотя бы одного склада; при пустой таблице создаёт «Основной склад».
 */
export async function ensureDefaultWarehouse(): Promise<Warehouse> {
  if (ensureInflight) return ensureInflight;
  ensureInflight = (async (): Promise<Warehouse> => {
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
  })().finally(() => {
    ensureInflight = null;
  });
  return ensureInflight;
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
