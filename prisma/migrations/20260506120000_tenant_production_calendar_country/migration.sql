CREATE TYPE "ProductionCalendarCountry" AS ENUM ('RU', 'BY', 'KZ');

ALTER TABLE "Tenant"
ADD COLUMN "productionCalendarCountry" "ProductionCalendarCountry" NOT NULL DEFAULT 'RU';
