import type { Prisma, PrismaClient } from "@prisma/client";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-constants";

type PrismaDb = PrismaClient | Prisma.TransactionClient;

/** Актуальный набор типов карточек в Kaiten (порядок как в интерфейсе). */
const DEFAULT_CARD_TYPES: { name: string; externalTypeId: number; sortOrder: number }[] =
  [
    { name: "Временные", externalTypeId: 1, sortOrder: 10 },
    { name: "МиоСплинт", externalTypeId: 1, sortOrder: 20 },
    { name: "Модели", externalTypeId: 1, sortOrder: 30 },
    { name: "Накладки", externalTypeId: 1, sortOrder: 40 },
    { name: "Накладки МРТ", externalTypeId: 1, sortOrder: 50 },
    { name: "ОртоАппараты", externalTypeId: 1, sortOrder: 60 },
    { name: "ОртоАппараты x Хирургия", externalTypeId: 1, sortOrder: 70 },
    { name: "Постоянные", externalTypeId: 1, sortOrder: 80 },
    { name: "Сплинт", externalTypeId: 1, sortOrder: 90 },
    { name: "Сплинт МРТ", externalTypeId: 1, sortOrder: 100 },
    { name: "Хирургия", externalTypeId: 1, sortOrder: 110 },
  ];

/**
 * Оставляет по одной строке на каждое имя (минимальный sortOrder, затем id).
 * Заказы, ссылавшиеся на удаляемые строки, перепривязываются к оставшейся.
 */
export async function dedupeKaitenCardTypes(
  prisma: PrismaDb,
  tenantId: string = DEFAULT_TENANT_ID,
): Promise<void> {
  const all = await prisma.kaitenCardType.findMany({
    where: { tenantId },
    orderBy: [{ name: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
  });
  const byName = new Map<string, typeof all>();
  for (const t of all) {
    const list = byName.get(t.name);
    if (list) list.push(t);
    else byName.set(t.name, [t]);
  }
  for (const rows of byName.values()) {
    if (rows.length <= 1) continue;
    const keeper = rows[0]!;
    const losers = rows.slice(1);
    for (const l of losers) {
      await prisma.order.updateMany({
        where: { kaitenCardTypeId: l.id, tenantId },
        data: { kaitenCardTypeId: keeper.id },
      });
      await prisma.kaitenCardType.delete({ where: { id: l.id } });
    }
  }
}

/**
 * Один раз заполняет справочник стартовым набором имён (пустая таблица).
 * Не досоздаёт строки по имени после ручного удаления — иначе «Удалить» в CRM
 * сразу откатывался бы при следующем GET (тип снова появлялся с placeholder externalTypeId=1).
 */
export async function ensureKaitenDirectory(
  prisma: PrismaDb,
  tenantId: string = DEFAULT_TENANT_ID,
): Promise<void> {
  await dedupeKaitenCardTypes(prisma, tenantId);

  const existingCount = await prisma.kaitenCardType.count({ where: { tenantId } });
  if (existingCount > 0) {
    return;
  }

  const envMap: Record<string, number | undefined> = {
    Временные:
      parseEnvInt(process.env.KAITEN_MAP_VREMENNYE_ID) ??
      parseEnvInt(process.env.KAITEN_TYPE_TEMPORARY_ID),
    МиоСплинт: parseEnvInt(process.env.KAITEN_MAP_MIOSPLINT_ID),
    Модели: parseEnvInt(process.env.KAITEN_MAP_MODELI_ID),
    Накладки:
      parseEnvInt(process.env.KAITEN_MAP_NAKLADKI_ID) ??
      parseEnvInt(process.env.KAITEN_TYPE_CARD_ID),
    "Накладки МРТ": parseEnvInt(process.env.KAITEN_MAP_NAKLADKI_MRT_ID),
    ОртоАппараты: parseEnvInt(process.env.KAITEN_MAP_ORTOAPPARATY_ID),
    "ОртоАппараты x Хирургия": parseEnvInt(
      process.env.KAITEN_MAP_ORTOAPPARATY_HIRURGIYA_ID,
    ),
    Постоянные: parseEnvInt(process.env.KAITEN_TYPE_PERMANENT_ID),
    Сплинт: parseEnvInt(process.env.KAITEN_TYPE_SPLINT_ID),
    "Сплинт МРТ": parseEnvInt(process.env.KAITEN_MAP_SPLINT_MRT_ID),
    Хирургия: parseEnvInt(process.env.KAITEN_MAP_HIRURGIYA_ID),
  };

  for (const row of DEFAULT_CARD_TYPES) {
    await prisma.kaitenCardType.create({
      data: {
        tenantId,
        name: row.name,
        externalTypeId: envMap[row.name] ?? row.externalTypeId,
        sortOrder: row.sortOrder,
        isActive: true,
      },
    });
  }
}

function parseEnvInt(raw: string | undefined): number | undefined {
  if (!raw?.trim()) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}
