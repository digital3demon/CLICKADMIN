-- Мини-чат по задаче лаборатории.
CREATE TABLE IF NOT EXISTS "LabTaskComment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorLabel" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LabTaskComment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LabTaskCommentRead" (
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTaskCommentRead_pkey" PRIMARY KEY ("userId","taskId")
);

CREATE INDEX IF NOT EXISTS "LabTaskComment_taskId_createdAt_idx" ON "LabTaskComment"("taskId", "createdAt");
CREATE INDEX IF NOT EXISTS "LabTaskComment_parentId_idx" ON "LabTaskComment"("parentId");
CREATE INDEX IF NOT EXISTS "LabTaskCommentRead_taskId_idx" ON "LabTaskCommentRead"("taskId");

ALTER TABLE "LabTaskComment" DROP CONSTRAINT IF EXISTS "LabTaskComment_taskId_fkey";
ALTER TABLE "LabTaskComment" ADD CONSTRAINT "LabTaskComment_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "LabTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LabTaskComment" DROP CONSTRAINT IF EXISTS "LabTaskComment_authorUserId_fkey";
ALTER TABLE "LabTaskComment" ADD CONSTRAINT "LabTaskComment_authorUserId_fkey"
    FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LabTaskComment" DROP CONSTRAINT IF EXISTS "LabTaskComment_parentId_fkey";
ALTER TABLE "LabTaskComment" ADD CONSTRAINT "LabTaskComment_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "LabTaskComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LabTaskCommentRead" DROP CONSTRAINT IF EXISTS "LabTaskCommentRead_userId_fkey";
ALTER TABLE "LabTaskCommentRead" ADD CONSTRAINT "LabTaskCommentRead_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LabTaskCommentRead" DROP CONSTRAINT IF EXISTS "LabTaskCommentRead_taskId_fkey";
ALTER TABLE "LabTaskCommentRead" ADD CONSTRAINT "LabTaskCommentRead_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "LabTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
