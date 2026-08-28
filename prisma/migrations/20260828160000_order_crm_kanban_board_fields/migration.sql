-- CRM-канбан: люди и этапный срок на наряде (без Kaiten).
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "kanbanAssigneeIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "kanbanParticipantIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "kanbanStageDueYmd" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "kanbanBoardUpdatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Order_tenantId_kaitenTrackLane_archivedAt_idx"
  ON "Order"("tenantId", "kaitenTrackLane", "archivedAt");
CREATE INDEX IF NOT EXISTS "Order_tenantId_kanbanBoardUpdatedAt_idx"
  ON "Order"("tenantId", "kanbanBoardUpdatedAt");
CREATE INDEX IF NOT EXISTS "Order_kanbanAssigneeIds_gin_idx"
  ON "Order" USING GIN ("kanbanAssigneeIds");
CREATE INDEX IF NOT EXISTS "Order_kanbanParticipantIds_gin_idx"
  ON "Order" USING GIN ("kanbanParticipantIds");
