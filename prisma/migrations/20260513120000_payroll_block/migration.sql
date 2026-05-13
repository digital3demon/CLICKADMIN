-- Зарплатный блок: ручные сделочные начисления по выполненным частям работы.
ALTER TYPE "AppModule" ADD VALUE 'PAYROLL';

CREATE TYPE "PayrollWorkKind" AS ENUM ('CAD', 'CAD_SURGERY', 'MANUAL', 'PROCESSING');

CREATE TABLE "PayrollPriceItemConfig" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "priceListItemId" TEXT NOT NULL,
  "cadRub" INTEGER,
  "cadSurgeryRub" INTEGER,
  "manualRub" INTEGER,
  "processingRub" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PayrollPriceItemConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayrollWorkEntry" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "kanbanCardId" TEXT,
  "priceListItemId" TEXT NOT NULL,
  "kind" "PayrollWorkKind" NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "amountRub" INTEGER NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedByUserId" TEXT,

  CONSTRAINT "PayrollWorkEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayrollPriceItemConfig_tenantId_priceListItemId_key"
  ON "PayrollPriceItemConfig"("tenantId", "priceListItemId");
CREATE INDEX "PayrollPriceItemConfig_priceListItemId_idx"
  ON "PayrollPriceItemConfig"("priceListItemId");
CREATE INDEX "PayrollPriceItemConfig_tenantId_updatedAt_idx"
  ON "PayrollPriceItemConfig"("tenantId", "updatedAt");

CREATE UNIQUE INDEX "PayrollWorkEntry_orderId_priceListItemId_kind_userId_key"
  ON "PayrollWorkEntry"("orderId", "priceListItemId", "kind", "userId");
CREATE INDEX "PayrollWorkEntry_tenantId_userId_createdAt_idx"
  ON "PayrollWorkEntry"("tenantId", "userId", "createdAt");
CREATE INDEX "PayrollWorkEntry_tenantId_orderId_idx"
  ON "PayrollWorkEntry"("tenantId", "orderId");
CREATE INDEX "PayrollWorkEntry_priceListItemId_idx"
  ON "PayrollWorkEntry"("priceListItemId");
CREATE INDEX "PayrollWorkEntry_updatedByUserId_idx"
  ON "PayrollWorkEntry"("updatedByUserId");

ALTER TABLE "PayrollPriceItemConfig"
  ADD CONSTRAINT "PayrollPriceItemConfig_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollPriceItemConfig"
  ADD CONSTRAINT "PayrollPriceItemConfig_priceListItemId_fkey"
  FOREIGN KEY ("priceListItemId") REFERENCES "PriceListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PayrollWorkEntry"
  ADD CONSTRAINT "PayrollWorkEntry_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollWorkEntry"
  ADD CONSTRAINT "PayrollWorkEntry_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollWorkEntry"
  ADD CONSTRAINT "PayrollWorkEntry_priceListItemId_fkey"
  FOREIGN KEY ("priceListItemId") REFERENCES "PriceListItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollWorkEntry"
  ADD CONSTRAINT "PayrollWorkEntry_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollWorkEntry"
  ADD CONSTRAINT "PayrollWorkEntry_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
