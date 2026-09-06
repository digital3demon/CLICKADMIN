-- Payroll staff roles + optional price links; rename description→name; nullable entry FKs.

CREATE TABLE "PayrollStaffRole" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PayrollStaffRole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PayrollStaffRole_tenantId_name_key" ON "PayrollStaffRole"("tenantId", "name");
CREATE INDEX "PayrollStaffRole_tenantId_sortOrder_idx" ON "PayrollStaffRole"("tenantId", "sortOrder");

ALTER TABLE "PayrollStaffRole" ADD CONSTRAINT "PayrollStaffRole_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StaffRoleModuleAccess" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "staffRoleId" TEXT NOT NULL,
    "module" "AppModule" NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StaffRoleModuleAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StaffRoleModuleAccess_tenantId_staffRoleId_module_key"
  ON "StaffRoleModuleAccess"("tenantId", "staffRoleId", "module");
CREATE INDEX "StaffRoleModuleAccess_tenantId_staffRoleId_idx"
  ON "StaffRoleModuleAccess"("tenantId", "staffRoleId");

ALTER TABLE "StaffRoleModuleAccess" ADD CONSTRAINT "StaffRoleModuleAccess_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffRoleModuleAccess" ADD CONSTRAINT "StaffRoleModuleAccess_staffRoleId_fkey"
  FOREIGN KEY ("staffRoleId") REFERENCES "PayrollStaffRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" ADD COLUMN "payrollStaffRoleId" TEXT;
CREATE INDEX "User_payrollStaffRoleId_idx" ON "User"("payrollStaffRoleId");
ALTER TABLE "User" ADD CONSTRAINT "User_payrollStaffRoleId_fkey"
  FOREIGN KEY ("payrollStaffRoleId") REFERENCES "PayrollStaffRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed 4 default roles per tenant
INSERT INTO "PayrollStaffRole" ("id", "tenantId", "name", "sortOrder", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || t."id" || v."name"), t."id", v."name", v."sortOrder", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Tenant" t
CROSS JOIN (
  VALUES
    ('Цифра', 10),
    ('Мануал', 20),
    ('Цифра+Мануал', 30),
    ('Производство', 40)
) AS v("name", "sortOrder");

UPDATE "User" u
SET "payrollStaffRoleId" = r."id"
FROM "PayrollStaffRole" r
WHERE r."tenantId" = u."tenantId"
  AND r."name" = CASE u."payrollTrack"::text
    WHEN 'DIGITAL' THEN 'Цифра'
    WHEN 'MANUAL' THEN 'Мануал'
    WHEN 'DIGITAL_MANUAL' THEN 'Цифра+Мануал'
    WHEN 'SHOP_FLOOR' THEN 'Производство'
    ELSE NULL
  END
  AND u."payrollTrack" IS NOT NULL;

-- Rename description → name; make priceListItemId and kind nullable
ALTER TABLE "PayrollPriceItemConfig" RENAME COLUMN "description" TO "name";
ALTER TABLE "PayrollPriceItemConfig" ALTER COLUMN "priceListItemId" DROP NOT NULL;
ALTER TABLE "PayrollPriceItemConfig" ALTER COLUMN "kind" DROP NOT NULL;
ALTER TABLE "PayrollPriceItemConfig" DROP CONSTRAINT IF EXISTS "PayrollPriceItemConfig_priceListItemId_fkey";
ALTER TABLE "PayrollPriceItemConfig" ADD CONSTRAINT "PayrollPriceItemConfig_priceListItemId_fkey"
  FOREIGN KEY ("priceListItemId") REFERENCES "PriceListItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "PayrollPriceItemConfig_tenantId_name_idx" ON "PayrollPriceItemConfig"("tenantId", "name");

CREATE TABLE "PayrollConfigStaffRole" (
    "configId" TEXT NOT NULL,
    "staffRoleId" TEXT NOT NULL,
    CONSTRAINT "PayrollConfigStaffRole_pkey" PRIMARY KEY ("configId", "staffRoleId")
);
CREATE INDEX "PayrollConfigStaffRole_staffRoleId_idx" ON "PayrollConfigStaffRole"("staffRoleId");
ALTER TABLE "PayrollConfigStaffRole" ADD CONSTRAINT "PayrollConfigStaffRole_configId_fkey"
  FOREIGN KEY ("configId") REFERENCES "PayrollPriceItemConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollConfigStaffRole" ADD CONSTRAINT "PayrollConfigStaffRole_staffRoleId_fkey"
  FOREIGN KEY ("staffRoleId") REFERENCES "PayrollStaffRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PayrollConfigPriceItem" (
    "configId" TEXT NOT NULL,
    "priceListItemId" TEXT NOT NULL,
    CONSTRAINT "PayrollConfigPriceItem_pkey" PRIMARY KEY ("configId", "priceListItemId")
);
CREATE INDEX "PayrollConfigPriceItem_priceListItemId_idx" ON "PayrollConfigPriceItem"("priceListItemId");
ALTER TABLE "PayrollConfigPriceItem" ADD CONSTRAINT "PayrollConfigPriceItem_configId_fkey"
  FOREIGN KEY ("configId") REFERENCES "PayrollPriceItemConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PayrollConfigPriceItem" ADD CONSTRAINT "PayrollConfigPriceItem_priceListItemId_fkey"
  FOREIGN KEY ("priceListItemId") REFERENCES "PriceListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "PayrollConfigPriceItem" ("configId", "priceListItemId")
SELECT "id", "priceListItemId" FROM "PayrollPriceItemConfig"
WHERE "priceListItemId" IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO "PayrollConfigStaffRole" ("configId", "staffRoleId")
SELECT c."id", r."id"
FROM "PayrollPriceItemConfig" c
JOIN "PayrollStaffRole" r ON r."tenantId" = c."tenantId"
  AND r."name" = CASE c."kind"::text
    WHEN 'CAD' THEN 'Цифра'
    WHEN 'CAD_SURGERY' THEN 'Цифра'
    WHEN 'MANUAL' THEN 'Мануал'
    WHEN 'PROCESSING' THEN 'Производство'
    WHEN 'UNCATEGORIZED' THEN 'Цифра+Мануал'
    ELSE 'Цифра+Мануал'
  END
WHERE c."kind" IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE "PayrollWorkEntry" ALTER COLUMN "priceListItemId" DROP NOT NULL;
ALTER TABLE "PayrollWorkEntry" ALTER COLUMN "kind" DROP NOT NULL;
