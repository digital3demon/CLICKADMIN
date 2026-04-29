-- Backfill for migration history replay on clean/shadow SQLite databases.
-- Some environments had revision tables created outside migrations; we ensure
-- they exist before 20260419140000_revision_actor_user alters them.

CREATE TABLE IF NOT EXISTS "ContractorRevision" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorLabel" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'UPDATE',
  "clinicId" TEXT,
  "doctorId" TEXT,
  "summary" TEXT NOT NULL,
  "details" JSONB,
  CONSTRAINT "ContractorRevision_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ContractorRevision_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ContractorRevision_createdAt_idx"
  ON "ContractorRevision"("createdAt");

CREATE TABLE IF NOT EXISTS "OrderRevision" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorLabel" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'SAVE',
  "snapshot" JSONB NOT NULL,
  CONSTRAINT "OrderRevision_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OrderRevision_orderId_createdAt_idx"
  ON "OrderRevision"("orderId", "createdAt");
