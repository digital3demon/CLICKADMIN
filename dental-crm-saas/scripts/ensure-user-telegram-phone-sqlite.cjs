/**
 * Добавляет в SQLite колонки User для Telegram и телефона, если их ещё нет.
 * Нужно, когда в _prisma_migrations миграции помечены применёнными, а ALTER не выполнялся.
 *
 * Запуск из корня проекта:
 *   node --env-file=.env scripts/ensure-user-telegram-phone-sqlite.cjs
 */
const { PrismaClient, Prisma } = require("@prisma/client");

const prisma = new PrismaClient();

async function trySql(label, sql) {
  try {
    await prisma.$executeRaw(sql);
    console.log("OK:", label);
  } catch (e) {
    const msg = String(e?.message ?? e);
    if (/duplicate column name/i.test(msg)) {
      console.log("Уже есть:", label);
      return;
    }
    if (/already exists/i.test(msg) && /index/i.test(msg)) {
      console.log("Индекс уже есть:", label);
      return;
    }
    console.error("Ошибка:", label, msg);
    throw e;
  }
}

async function main() {
  await trySql(
    "User.telegramId",
    Prisma.sql`ALTER TABLE "User" ADD COLUMN "telegramId" TEXT;`,
  );
  await trySql(
    "User.telegramUsername",
    Prisma.sql`ALTER TABLE "User" ADD COLUMN "telegramUsername" TEXT;`,
  );
  await trySql(
    "index User_telegramId_key",
    Prisma.sql`CREATE UNIQUE INDEX IF NOT EXISTS "User_telegramId_key" ON "User"("telegramId");`,
  );
  await trySql(
    "User.phone",
    Prisma.sql`ALTER TABLE "User" ADD COLUMN "phone" TEXT;`,
  );
  await trySql(
    "index User_phone_key",
    Prisma.sql`CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");`,
  );
  console.log("Готово. Перезапустите dev-сервер (npm run dev).");
}

main()
  .catch(() => process.exit(1))
  .finally(() => prisma.$disconnect());
