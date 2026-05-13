-- ФОТ: вместо 4 колонок на позицию прайса храним ручные строки
-- (тип работы + сумма + описание + привязка к позиции прайса).
--
-- Миграция намеренно идемпотентная: ранняя версия могла упасть после RENAME,
-- потому что старые constraint/index имена оставались занятыми на переименованной
-- таблице. Этот вариант продолжает и с чистого состояния, и после такого частичного
-- падения.

DO $$
BEGIN
  IF to_regclass('"PayrollPriceItemConfig"') IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'PayrollPriceItemConfig'
         AND column_name = 'cadRub'
     )
     AND to_regclass('"_PayrollPriceItemConfigOld"') IS NULL
  THEN
    ALTER TABLE "PayrollPriceItemConfig" RENAME TO "_PayrollPriceItemConfigOld";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "PayrollPriceItemConfig" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "priceListItemId" TEXT NOT NULL,
  "kind" "PayrollWorkKind" NOT NULL,
  "amountRub" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PayrollPriceItemConfig_new_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF to_regclass('"_PayrollPriceItemConfigOld"') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM "PayrollPriceItemConfig")
  THEN
    INSERT INTO "PayrollPriceItemConfig" (
      "id", "tenantId", "priceListItemId", "kind", "amountRub", "description", "sortOrder", "createdAt", "updatedAt"
    )
    SELECT md5(random()::text || clock_timestamp()::text), "tenantId", "priceListItemId", 'CAD'::"PayrollWorkKind", "cadRub", 'CAD', 10, "createdAt", "updatedAt"
    FROM "_PayrollPriceItemConfigOld"
    WHERE "cadRub" IS NOT NULL AND "cadRub" > 0
    UNION ALL
    SELECT md5(random()::text || clock_timestamp()::text), "tenantId", "priceListItemId", 'CAD_SURGERY'::"PayrollWorkKind", "cadSurgeryRub", 'CAD Хирургия', 20, "createdAt", "updatedAt"
    FROM "_PayrollPriceItemConfigOld"
    WHERE "cadSurgeryRub" IS NOT NULL AND "cadSurgeryRub" > 0
    UNION ALL
    SELECT md5(random()::text || clock_timestamp()::text), "tenantId", "priceListItemId", 'MANUAL'::"PayrollWorkKind", "manualRub", 'Мануал', 30, "createdAt", "updatedAt"
    FROM "_PayrollPriceItemConfigOld"
    WHERE "manualRub" IS NOT NULL AND "manualRub" > 0
    UNION ALL
    SELECT md5(random()::text || clock_timestamp()::text), "tenantId", "priceListItemId", 'PROCESSING'::"PayrollWorkKind", "processingRub", 'Обработка', 40, "createdAt", "updatedAt"
    FROM "_PayrollPriceItemConfigOld"
    WHERE "processingRub" IS NOT NULL AND "processingRub" > 0;
  END IF;
END $$;

DROP TABLE IF EXISTS "_PayrollPriceItemConfigOld";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayrollPriceItemConfig_new_pkey'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayrollPriceItemConfig_pkey'
  ) THEN
    ALTER TABLE "PayrollPriceItemConfig"
      RENAME CONSTRAINT "PayrollPriceItemConfig_new_pkey" TO "PayrollPriceItemConfig_pkey";
  END IF;
END $$;

ALTER TABLE "PayrollWorkEntry" ADD COLUMN IF NOT EXISTS "payrollConfigId" TEXT;

UPDATE "PayrollWorkEntry" e
SET "payrollConfigId" = (
  SELECT c."id"
  FROM "PayrollPriceItemConfig" c
  WHERE c."tenantId" = e."tenantId"
    AND c."priceListItemId" = e."priceListItemId"
    AND c."kind" = e."kind"
  ORDER BY c."sortOrder" ASC, c."createdAt" ASC
  LIMIT 1
)
WHERE e."payrollConfigId" IS NULL;

DROP INDEX IF EXISTS "PayrollWorkEntry_orderId_priceListItemId_kind_userId_key";

CREATE INDEX IF NOT EXISTS "PayrollPriceItemConfig_tenantId_priceListItemId_idx"
  ON "PayrollPriceItemConfig"("tenantId", "priceListItemId");
CREATE INDEX IF NOT EXISTS "PayrollPriceItemConfig_tenantId_kind_idx"
  ON "PayrollPriceItemConfig"("tenantId", "kind");
CREATE INDEX IF NOT EXISTS "PayrollPriceItemConfig_priceListItemId_idx"
  ON "PayrollPriceItemConfig"("priceListItemId");
CREATE INDEX IF NOT EXISTS "PayrollPriceItemConfig_tenantId_updatedAt_idx"
  ON "PayrollPriceItemConfig"("tenantId", "updatedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "PayrollWorkEntry_orderId_payrollConfigId_userId_key"
  ON "PayrollWorkEntry"("orderId", "payrollConfigId", "userId");
CREATE INDEX IF NOT EXISTS "PayrollWorkEntry_payrollConfigId_idx"
  ON "PayrollWorkEntry"("payrollConfigId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayrollPriceItemConfig_tenantId_fkey'
  ) THEN
    ALTER TABLE "PayrollPriceItemConfig"
      ADD CONSTRAINT "PayrollPriceItemConfig_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayrollPriceItemConfig_priceListItemId_fkey'
  ) THEN
    ALTER TABLE "PayrollPriceItemConfig"
      ADD CONSTRAINT "PayrollPriceItemConfig_priceListItemId_fkey"
      FOREIGN KEY ("priceListItemId") REFERENCES "PriceListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PayrollWorkEntry_payrollConfigId_fkey'
  ) THEN
    ALTER TABLE "PayrollWorkEntry"
      ADD CONSTRAINT "PayrollWorkEntry_payrollConfigId_fkey"
      FOREIGN KEY ("payrollConfigId") REFERENCES "PayrollPriceItemConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
