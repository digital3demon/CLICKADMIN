-- Rename legacy OpenRouter columns to neutral AI names and drop provider selector.
ALTER TABLE "Tenant" RENAME COLUMN "openRouterApiKey" TO "aiApiKey";
ALTER TABLE "Tenant" RENAME COLUMN "openRouterModel" TO "aiModel";
ALTER TABLE "Tenant" DROP COLUMN IF EXISTS "aiProvider";

UPDATE "Tenant"
SET "aiModel" = 'nvidia/nemotron-3-ultra-550b-a55b:free'
WHERE "aiModel" IS NULL OR TRIM("aiModel") = '';
