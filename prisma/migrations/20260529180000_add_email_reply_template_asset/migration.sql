-- CreateEnum
CREATE TYPE "EmailReplyTemplateAssetKind" AS ENUM ('INLINE_IMAGE', 'ATTACHMENT');

-- CreateTable
CREATE TABLE "EmailReplyTemplateAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "kind" "EmailReplyTemplateAssetKind" NOT NULL,
    "contentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailReplyTemplateAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailReplyTemplateAsset_tenantId_accountId_idx" ON "EmailReplyTemplateAsset"("tenantId", "accountId");

-- CreateIndex
CREATE INDEX "EmailReplyTemplateAsset_accountId_kind_idx" ON "EmailReplyTemplateAsset"("accountId", "kind");

-- AddForeignKey
ALTER TABLE "EmailReplyTemplateAsset" ADD CONSTRAINT "EmailReplyTemplateAsset_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
