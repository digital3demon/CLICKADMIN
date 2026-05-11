-- CreateTable
CREATE TABLE "DoctorTelegramMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "doctorTelegramGroupId" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "telegramMessageId" TEXT NOT NULL,
    "messageSeq" INTEGER NOT NULL,
    "fromTgUserId" TEXT,
    "fromTgUsername" TEXT,
    "textFull" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorTelegramMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DoctorTelegramMessage_tenantId_telegramChatId_telegramMessageId_key" ON "DoctorTelegramMessage"("tenantId", "telegramChatId", "telegramMessageId");

-- CreateIndex
CREATE INDEX "DoctorTelegramMessage_tenantId_telegramChatId_messageSeq_idx" ON "DoctorTelegramMessage"("tenantId", "telegramChatId", "messageSeq");

-- CreateIndex
CREATE INDEX "DoctorTelegramMessage_doctorTelegramGroupId_messageSeq_idx" ON "DoctorTelegramMessage"("doctorTelegramGroupId", "messageSeq");

-- AddForeignKey
ALTER TABLE "DoctorTelegramMessage" ADD CONSTRAINT "DoctorTelegramMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorTelegramMessage" ADD CONSTRAINT "DoctorTelegramMessage_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorTelegramMessage" ADD CONSTRAINT "DoctorTelegramMessage_doctorTelegramGroupId_fkey" FOREIGN KEY ("doctorTelegramGroupId") REFERENCES "DoctorTelegramGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
