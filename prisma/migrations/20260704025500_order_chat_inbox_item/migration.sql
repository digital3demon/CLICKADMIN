-- Unified deterministic chat inbox events (dual-write phase).
CREATE TYPE "OrderChatInboxItemType" AS ENUM ('CORRECTION', 'PROSTHETICS', 'LAB_MENTION');
CREATE TYPE "OrderChatInboxSyncState" AS ENUM ('PENDING_EXTERNAL', 'SYNCED_EXTERNAL', 'LOCAL_ONLY', 'FAILED_EXTERNAL');

CREATE TABLE "OrderChatInboxItem" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "type" "OrderChatInboxItemType" NOT NULL,
  "source" "OrderChatCorrectionSource" NOT NULL,
  "text" TEXT NOT NULL,
  "authorLabel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "kaitenCommentId" INTEGER,
  "crmDraftId" TEXT,
  "syncState" "OrderChatInboxSyncState" NOT NULL DEFAULT 'PENDING_EXTERNAL',
  "resolvedAt" TIMESTAMP(3),
  "resolvedByUserId" TEXT,
  "rejectedAt" TIMESTAMP(3),
  "rejectedByUserId" TEXT,

  CONSTRAINT "OrderChatInboxItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderChatInboxItem_orderId_type_kaitenCommentId_key"
  ON "OrderChatInboxItem"("orderId", "type", "kaitenCommentId");

CREATE UNIQUE INDEX "OrderChatInboxItem_orderId_type_crmDraftId_key"
  ON "OrderChatInboxItem"("orderId", "type", "crmDraftId");

CREATE INDEX "OrderChatInboxItem_tenantId_type_createdAt_idx"
  ON "OrderChatInboxItem"("tenantId", "type", "createdAt");
CREATE INDEX "OrderChatInboxItem_tenantId_type_resolvedAt_rejectedAt_idx"
  ON "OrderChatInboxItem"("tenantId", "type", "resolvedAt", "rejectedAt");
CREATE INDEX "OrderChatInboxItem_orderId_type_resolvedAt_rejectedAt_idx"
  ON "OrderChatInboxItem"("orderId", "type", "resolvedAt", "rejectedAt");
CREATE INDEX "OrderChatInboxItem_orderId_syncState_createdAt_idx"
  ON "OrderChatInboxItem"("orderId", "syncState", "createdAt");

ALTER TABLE "OrderChatInboxItem"
  ADD CONSTRAINT "OrderChatInboxItem_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderChatInboxItem"
  ADD CONSTRAINT "OrderChatInboxItem_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill corrections from legacy table.
INSERT INTO "OrderChatInboxItem" (
  "id",
  "tenantId",
  "orderId",
  "type",
  "source",
  "text",
  "authorLabel",
  "createdAt",
  "kaitenCommentId",
  "syncState",
  "resolvedAt",
  "resolvedByUserId",
  "rejectedAt",
  "rejectedByUserId"
)
SELECT
  CONCAT('corr_', c."id"),
  o."tenantId",
  c."orderId",
  'CORRECTION'::"OrderChatInboxItemType",
  c."source",
  c."text",
  c."authorLabel",
  c."createdAt",
  c."kaitenCommentId",
  CASE WHEN c."source" = 'KAITEN' THEN 'SYNCED_EXTERNAL'::"OrderChatInboxSyncState" ELSE 'LOCAL_ONLY'::"OrderChatInboxSyncState" END,
  c."resolvedAt",
  c."resolvedByUserId",
  c."rejectedAt",
  c."rejectedByUserId"
FROM "OrderChatCorrection" c
JOIN "Order" o ON o."id" = c."orderId";

-- Backfill prosthetics from legacy table.
INSERT INTO "OrderChatInboxItem" (
  "id",
  "tenantId",
  "orderId",
  "type",
  "source",
  "text",
  "authorLabel",
  "createdAt",
  "kaitenCommentId",
  "syncState",
  "resolvedAt",
  "resolvedByUserId",
  "rejectedAt",
  "rejectedByUserId"
)
SELECT
  CONCAT('pros_', p."id"),
  o."tenantId",
  p."orderId",
  'PROSTHETICS'::"OrderChatInboxItemType",
  p."source",
  p."text",
  p."authorLabel",
  p."createdAt",
  p."kaitenCommentId",
  CASE WHEN p."source" = 'KAITEN' THEN 'SYNCED_EXTERNAL'::"OrderChatInboxSyncState" ELSE 'LOCAL_ONLY'::"OrderChatInboxSyncState" END,
  p."resolvedAt",
  p."resolvedByUserId",
  p."rejectedAt",
  p."rejectedByUserId"
FROM "OrderProstheticsRequest" p
JOIN "Order" o ON o."id" = p."orderId";

-- Backfill lab mentions only from historical signal timestamp (no synthetic "now").
INSERT INTO "OrderChatInboxItem" (
  "id",
  "tenantId",
  "orderId",
  "type",
  "source",
  "text",
  "authorLabel",
  "createdAt",
  "syncState"
)
SELECT
  CONCAT('lm_', o."id"),
  o."tenantId",
  o."id",
  'LAB_MENTION'::"OrderChatInboxItemType",
  'KAITEN'::"OrderChatCorrectionSource",
  COALESCE(NULLIF(TRIM(o."kaitenLabMentionToastText"), ''), 'Упоминание в чате'),
  NULLIF(TRIM(o."kaitenLabMentionToastAuthor"), ''),
  o."kaitenLabMentionSignalAt",
  'SYNCED_EXTERNAL'::"OrderChatInboxSyncState"
FROM "Order" o
WHERE o."kaitenChatHasLabMention" = TRUE
  AND o."kaitenLabMentionSignalAt" IS NOT NULL;
