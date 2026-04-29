-- Тенант по умолчанию + tenantId на сущностях + таблица счетов подписки.
-- id тенанта должен совпадать с lib/tenant-constants.ts (DEFAULT_TENANT_ID).
-- IF NOT EXISTS / INSERT OR IGNORE: локальная БД могла получить таблицы через db push до этой миграции.

-- CreateTable
CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'BASIC',
    "addonKanban" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionValidTo" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_slug_key" ON "Tenant"("slug");

INSERT OR IGNORE INTO "Tenant" ("id", "slug", "name", "plan", "addonKanban", "createdAt")
VALUES (
    'cltenantdefault0000000000',
    'default',
    'Организация',
    'ULTRA',
    true,
    CURRENT_TIMESTAMP
);

-- Таблица была в schema.prisma, но отсутствовала в истории миграций
CREATE TABLE IF NOT EXISTS "SubscriptionInvoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'MANUAL',
    "providerExternalId" TEXT,
    "title" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    CONSTRAINT "SubscriptionInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionInvoice_providerExternalId_key" ON "SubscriptionInvoice"("providerExternalId");
CREATE INDEX IF NOT EXISTS "SubscriptionInvoice_tenantId_createdAt_idx" ON "SubscriptionInvoice"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "SubscriptionInvoice_status_idx" ON "SubscriptionInvoice"("status");

-- OrderNumberSettings.id = id тенанта (см. OrderNumberSettings в schema)
UPDATE "OrderNumberSettings" SET "id" = 'cltenantdefault0000000000' WHERE "id" = 'default';

UPDATE "OrderNumberSettings" SET "id" = 'cltenantdefault0000000000'
WHERE (SELECT COUNT(*) FROM "OrderNumberSettings") = 1
  AND "id" != 'cltenantdefault0000000000';

INSERT INTO "OrderNumberSettings" ("id", "postingYearMonth", "nextSequenceFloor", "updatedAt")
SELECT
    'cltenantdefault0000000000',
    substr(strftime('%Y', 'now'), 3, 2) || strftime('%m', 'now'),
    NULL,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1 FROM "OrderNumberSettings" WHERE "id" = 'cltenantdefault0000000000'
);

DELETE FROM "OrderNumberSettings" WHERE "id" != 'cltenantdefault0000000000';

-- Старые глобальные уникальные индексы (заменяются на составные с tenantId в scripts/ensure-tenant-columns-sqlite.cjs).
DROP INDEX IF EXISTS "User_email_key";
DROP INDEX IF EXISTS "Order_orderNumber_key";

-- ALTER TABLE … ADD COLUMN в SQLite без IF NOT EXISTS; при db push колонки уже есть — дубликат.
-- После успешного `npm run db:migrate:deploy` вызывается ensure-tenant-columns-sqlite.cjs (см. scripts/prisma-migrate-deploy.cjs).
