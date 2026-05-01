-- Локальные карточки канбана (без наряда) — синхрон между пользователями тенанта

CREATE TABLE "KanbanStandaloneCard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedByUserId" TEXT,

    CONSTRAINT "KanbanStandaloneCard_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KanbanStandaloneCard_tenantId_boardId_idx" ON "KanbanStandaloneCard"("tenantId", "boardId");
CREATE INDEX "KanbanStandaloneCard_tenantId_updatedAt_idx" ON "KanbanStandaloneCard"("tenantId", "updatedAt");

ALTER TABLE "KanbanStandaloneCard" ADD CONSTRAINT "KanbanStandaloneCard_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
