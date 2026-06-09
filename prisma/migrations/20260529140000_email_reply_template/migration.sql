-- CreateTable
CREATE TABLE "EmailReplyTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "subjectTemplate" TEXT NOT NULL DEFAULT '',
    "htmlTemplate" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailReplyTemplate_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "EmailAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EmailSourceOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "emailId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "isReplyTarget" BOOLEAN NOT NULL DEFAULT false,
    "autoReplySentAt" DATETIME,
    "autoReplyEmailId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailSourceOrder_emailId_fkey" FOREIGN KEY ("emailId") REFERENCES "Email" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailSourceOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmailSourceOrder_autoReplyEmailId_fkey" FOREIGN KEY ("autoReplyEmailId") REFERENCES "Email" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_EmailSourceOrder" ("id", "tenantId", "emailId", "orderId", "createdAt") SELECT "id", "tenantId", "emailId", "orderId", "createdAt" FROM "EmailSourceOrder";
DROP TABLE "EmailSourceOrder";
ALTER TABLE "new_EmailSourceOrder" RENAME TO "EmailSourceOrder";
CREATE UNIQUE INDEX "EmailSourceOrder_orderId_emailId_key" ON "EmailSourceOrder"("orderId", "emailId");
CREATE INDEX "EmailSourceOrder_tenantId_emailId_idx" ON "EmailSourceOrder"("tenantId", "emailId");
CREATE INDEX "EmailSourceOrder_tenantId_orderId_idx" ON "EmailSourceOrder"("tenantId", "orderId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EmailReplyTemplate_accountId_key" ON "EmailReplyTemplate"("accountId");
CREATE INDEX "EmailReplyTemplate_tenantId_accountId_idx" ON "EmailReplyTemplate"("tenantId", "accountId");
