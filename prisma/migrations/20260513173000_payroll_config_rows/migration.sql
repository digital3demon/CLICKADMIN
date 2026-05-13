-- ФОТ: вместо 4 колонок на позицию прайса храним ручные строки
-- (тип работы + сумма + описание + привязка к позиции прайса).

ALTER TABLE "PayrollPriceItemConfig" RENAME TO "_PayrollPriceItemConfigOld";

CREATE TABLE "PayrollPriceItemConfig" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "priceListItemId" TEXT NOT NULL,
  "kind" "PayrollWorkKind" NOT NULL,
  "amountRub" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PayrollPriceItemConfig_pkey" PRIMARY KEY ("id")
);

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

DROP TABLE "_PayrollPriceItemConfigOld";

ALTER TABLE "PayrollWorkEntry" ADD COLUMN "payrollConfigId" TEXT;

UPDATE "PayrollWorkEntry" e
SET "payrollConfigId" = (
  SELECT c."id"
  FROM "PayrollPriceItemConfig" c
  WHERE c."tenantId" = e."tenantId"
    AND c."priceListItemId" = e."priceListItemId"
    AND c."kind" = e."kind"
  ORDER BY c."sortOrder" ASC, c."createdAt" ASC
  LIMIT 1
);

DROP INDEX IF EXISTS "PayrollWorkEntry_orderId_priceListItemId_kind_userId_key";

CREATE INDEX "PayrollPriceItemConfig_tenantId_priceListItemId_idx"
  ON "PayrollPriceItemConfig"("tenantId", "priceListItemId");
CREATE INDEX "PayrollPriceItemConfig_tenantId_kind_idx"
  ON "PayrollPriceItemConfig"("tenantId", "kind");
CREATE INDEX "PayrollPriceItemConfig_priceListItemId_idx"
  ON "PayrollPriceItemConfig"("priceListItemId");
CREATE INDEX "PayrollPriceItemConfig_tenantId_updatedAt_idx"
  ON "PayrollPriceItemConfig"("tenantId", "updatedAt");

CREATE UNIQUE INDEX "PayrollWorkEntry_orderId_payrollConfigId_userId_key"
  ON "PayrollWorkEntry"("orderId", "payrollConfigId", "userId");
CREATE INDEX "PayrollWorkEntry_payrollConfigId_idx"
  ON "PayrollWorkEntry"("payrollConfigId");

ALTER TABLE "PayrollPriceItemConfig"
  ADD CONSTRAINT "PayrollPriceItemConfig_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollPriceItemConfig"
  ADD CONSTRAINT "PayrollPriceItemConfig_priceListItemId_fkey"
  FOREIGN KEY ("priceListItemId") REFERENCES "PriceListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollWorkEntry"
  ADD CONSTRAINT "PayrollWorkEntry_payrollConfigId_fkey"
  FOREIGN KEY ("payrollConfigId") REFERENCES "PayrollPriceItemConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
