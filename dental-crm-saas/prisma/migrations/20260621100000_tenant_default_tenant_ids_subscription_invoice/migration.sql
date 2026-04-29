-- Тенант по умолчанию + tenantId на сущностях + таблица счетов подписки.
-- id тенанта должен совпадать с lib/tenant-constants.ts (DEFAULT_TENANT_ID).

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'BASIC',
    "addonKanban" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionValidTo" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

INSERT INTO "Tenant" ("id", "slug", "name", "plan", "addonKanban", "createdAt")
VALUES (
    'cltenantdefault0000000000',
    'default',
    'Организация',
    'ULTRA',
    true,
    CURRENT_TIMESTAMP
);

-- Таблица была в schema.prisma, но отсутствовала в истории миграций
CREATE TABLE "SubscriptionInvoice" (
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

CREATE UNIQUE INDEX "SubscriptionInvoice_providerExternalId_key" ON "SubscriptionInvoice"("providerExternalId");
CREATE INDEX "SubscriptionInvoice_tenantId_createdAt_idx" ON "SubscriptionInvoice"("tenantId", "createdAt");
CREATE INDEX "SubscriptionInvoice_status_idx" ON "SubscriptionInvoice"("status");

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

-- User: уникальность почты в пределах тенанта
DROP INDEX IF EXISTS "User_email_key";

ALTER TABLE "User" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'cltenantdefault0000000000';

CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

ALTER TABLE "Clinic" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'cltenantdefault0000000000';

CREATE INDEX "Clinic_tenantId_idx" ON "Clinic"("tenantId");

ALTER TABLE "Doctor" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'cltenantdefault0000000000';

CREATE INDEX "Doctor_tenantId_idx" ON "Doctor"("tenantId");

ALTER TABLE "Courier" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'cltenantdefault0000000000';

CREATE INDEX "Courier_tenantId_isActive_sortOrder_idx" ON "Courier"("tenantId", "isActive", "sortOrder");

ALTER TABLE "KaitenCardType" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'cltenantdefault0000000000';

CREATE INDEX "KaitenCardType_tenantId_isActive_sortOrder_idx" ON "KaitenCardType"("tenantId", "isActive", "sortOrder");

-- Order: уникальность номера в пределах тенанта
DROP INDEX IF EXISTS "Order_orderNumber_key";

ALTER TABLE "Order" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT 'cltenantdefault0000000000';

CREATE UNIQUE INDEX "Order_tenantId_orderNumber_key" ON "Order"("tenantId", "orderNumber");
CREATE INDEX "Order_tenantId_idx" ON "Order"("tenantId");
