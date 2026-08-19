-- CreateTable
CREATE TABLE "DemoAccessCode" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "codeHash" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "boundSid" TEXT,
    "boundUserAgent" TEXT,
    "boundIpAddress" TEXT,

    CONSTRAINT "DemoAccessCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemoAccessCode_prefix_idx" ON "DemoAccessCode"("prefix");

-- CreateIndex
CREATE INDEX "DemoAccessCode_createdAt_idx" ON "DemoAccessCode"("createdAt");

-- CreateIndex
CREATE INDEX "DemoAccessCode_consumedAt_idx" ON "DemoAccessCode"("consumedAt");
