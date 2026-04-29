-- Привязка ревизий к учётной записи (журнал по пользователю).
ALTER TABLE "OrderRevision" ADD COLUMN "actorUserId" TEXT;
ALTER TABLE "ContractorRevision" ADD COLUMN "actorUserId" TEXT;

CREATE INDEX "OrderRevision_actorUserId_createdAt_idx" ON "OrderRevision"("actorUserId", "createdAt");
CREATE INDEX "ContractorRevision_actorUserId_createdAt_idx" ON "ContractorRevision"("actorUserId", "createdAt");
