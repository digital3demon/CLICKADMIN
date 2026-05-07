-- CreateEnum
CREATE TYPE "DoctorMessengerItemStatus" AS ENUM ('OPEN', 'ARCHIVED');

-- CreateTable
CREATE TABLE "DoctorTelegramGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorTelegramGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorMessengerItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "doctorTelegramGroupId" TEXT,
    "telegramChatId" TEXT NOT NULL,
    "telegramMessageId" TEXT NOT NULL,
    "fromTgUserId" TEXT,
    "fromTgUsername" TEXT,
    "textFull" TEXT NOT NULL,
    "snippetBefore" TEXT NOT NULL,
    "snippetAfter" TEXT NOT NULL,
    "status" "DoctorMessengerItemStatus" NOT NULL DEFAULT 'OPEN',
    "archivedAt" TIMESTAMP(3),
    "replyTelegramMessageId" TEXT,
    "replyText" TEXT,
    "replyAuthorUserId" TEXT,
    "repliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorMessengerItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorTelegramGroup_tenantId_telegramChatId_key" ON "DoctorTelegramGroup"("tenantId", "telegramChatId");

-- CreateIndex
CREATE INDEX "DoctorTelegramGroup_doctorId_idx" ON "DoctorTelegramGroup"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorMessengerItem_tenantId_telegramChatId_telegramMessageId_key" ON "DoctorMessengerItem"("tenantId", "telegramChatId", "telegramMessageId");

-- CreateIndex
CREATE INDEX "DoctorMessengerItem_tenantId_status_createdAt_idx" ON "DoctorMessengerItem"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "DoctorMessengerItem_doctorId_idx" ON "DoctorMessengerItem"("doctorId");

-- AddForeignKey
ALTER TABLE "DoctorTelegramGroup" ADD CONSTRAINT "DoctorTelegramGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorTelegramGroup" ADD CONSTRAINT "DoctorTelegramGroup_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorMessengerItem" ADD CONSTRAINT "DoctorMessengerItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorMessengerItem" ADD CONSTRAINT "DoctorMessengerItem_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorMessengerItem" ADD CONSTRAINT "DoctorMessengerItem_doctorTelegramGroupId_fkey" FOREIGN KEY ("doctorTelegramGroupId") REFERENCES "DoctorTelegramGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorMessengerItem" ADD CONSTRAINT "DoctorMessengerItem_replyAuthorUserId_fkey" FOREIGN KEY ("replyAuthorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
