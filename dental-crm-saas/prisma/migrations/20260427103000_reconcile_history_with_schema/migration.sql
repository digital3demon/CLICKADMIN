-- AlterTable
ALTER TABLE "PriceListItem" ADD COLUMN "sectionTitle" TEXT;
ALTER TABLE "PriceListItem" ADD COLUMN "subsectionTitle" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "avatarPresetId" TEXT;
ALTER TABLE "User" ADD COLUMN "mentionHandle" TEXT;

-- CreateTable
CREATE TABLE "DoctorOnClinic" (
    "doctorId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,

    PRIMARY KEY ("doctorId", "clinicId"),
    CONSTRAINT "DoctorOnClinic_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DoctorOnClinic_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KaitenCardType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "externalTypeId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Clinic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "legalFullName" TEXT,
    "legalAddress" TEXT,
    "inn" TEXT,
    "kpp" TEXT,
    "ogrn" TEXT,
    "bankName" TEXT,
    "bik" TEXT,
    "settlementAccount" TEXT,
    "correspondentAccount" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "ceoName" TEXT,
    "worksWithReconciliation" BOOLEAN NOT NULL DEFAULT false,
    "reconciliationFrequency" TEXT,
    "contractSigned" BOOLEAN NOT NULL DEFAULT false,
    "contractNumber" TEXT,
    "worksWithEdo" BOOLEAN NOT NULL DEFAULT false,
    "billingLegalForm" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);
INSERT INTO "new_Clinic" ("address", "contractNumber", "createdAt", "id", "legalFullName", "name", "reconciliationFrequency") SELECT "address", "contractNumber", "createdAt", "id", "legalFullName", "name", "reconciliationFrequency" FROM "Clinic";
DROP TABLE "Clinic";
ALTER TABLE "new_Clinic" RENAME TO "Clinic";
CREATE TABLE "new_ContractorRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorLabel" TEXT NOT NULL,
    "actorUserId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'UPDATE',
    "clinicId" TEXT,
    "doctorId" TEXT,
    "summary" TEXT NOT NULL,
    "details" JSONB,
    CONSTRAINT "ContractorRevision_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ContractorRevision_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContractorRevision_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ContractorRevision" ("actorLabel", "actorUserId", "clinicId", "createdAt", "details", "doctorId", "id", "kind", "summary") SELECT "actorLabel", "actorUserId", "clinicId", "createdAt", "details", "doctorId", "id", "kind", "summary" FROM "ContractorRevision";
DROP TABLE "ContractorRevision";
ALTER TABLE "new_ContractorRevision" RENAME TO "ContractorRevision";
CREATE INDEX "ContractorRevision_createdAt_idx" ON "ContractorRevision"("createdAt");
CREATE INDEX "ContractorRevision_actorUserId_createdAt_idx" ON "ContractorRevision"("actorUserId", "createdAt");
CREATE TABLE "new_Doctor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "lastName" TEXT,
    "firstName" TEXT,
    "patronymic" TEXT,
    "formerLastName" TEXT,
    "specialty" TEXT,
    "city" TEXT,
    "email" TEXT,
    "clinicWorkEmail" TEXT,
    "phone" TEXT,
    "preferredContact" TEXT,
    "telegramUsername" TEXT,
    "birthday" DATETIME,
    "particulars" TEXT,
    "acceptsPrivatePractice" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);
INSERT INTO "new_Doctor" ("createdAt", "fullName", "id", "phone") SELECT "createdAt", "fullName", "id", "phone" FROM "Doctor";
DROP TABLE "Doctor";
ALTER TABLE "new_Doctor" RENAME TO "Doctor";
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "clinicId" TEXT,
    "doctorId" TEXT NOT NULL,
    "patientName" TEXT,
    "appointmentDate" DATETIME,
    "dueDate" DATETIME,
    "dueToAdminsAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'REVIEW',
    "notes" TEXT,
    "clientOrderText" TEXT,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "urgentCoefficient" REAL,
    "labWorkStatus" TEXT NOT NULL DEFAULT 'TO_SCAN',
    "legalEntity" TEXT,
    "payment" TEXT,
    "excludeFromReconciliation" BOOLEAN NOT NULL DEFAULT false,
    "excludeFromReconciliationUntil" DATETIME,
    "shade" TEXT,
    "hasScans" BOOLEAN NOT NULL DEFAULT false,
    "hasCt" BOOLEAN NOT NULL DEFAULT false,
    "hasMri" BOOLEAN NOT NULL DEFAULT false,
    "hasPhoto" BOOLEAN NOT NULL DEFAULT false,
    "additionalSourceNotes" TEXT,
    "quickOrder" JSONB,
    "prosthetics" JSONB,
    "kaitenDecideLater" BOOLEAN NOT NULL DEFAULT false,
    "kaitenCardTypeId" TEXT,
    "kaitenTrackLane" TEXT,
    "kaitenAdminDueHasTime" BOOLEAN NOT NULL DEFAULT true,
    "kaitenCardTitleLabel" TEXT,
    "kaitenCardId" INTEGER,
    "demoKanbanColumn" TEXT,
    "kaitenSyncError" TEXT,
    "kaitenSyncedAt" DATETIME,
    "kaitenColumnTitle" TEXT,
    "kaitenBlocked" BOOLEAN NOT NULL DEFAULT false,
    "kaitenBlockReason" TEXT,
    "invoiceIssued" BOOLEAN NOT NULL DEFAULT false,
    "invoiceNumber" TEXT,
    "invoicePaperDocs" BOOLEAN NOT NULL DEFAULT false,
    "invoiceSentToEdo" BOOLEAN NOT NULL DEFAULT false,
    "invoiceEdoSigned" BOOLEAN NOT NULL DEFAULT false,
    "narjadPrinted" BOOLEAN NOT NULL DEFAULT false,
    "adminShippedOtpr" BOOLEAN NOT NULL DEFAULT false,
    "continuesFromOrderId" TEXT,
    "prostheticsOrdered" BOOLEAN NOT NULL DEFAULT false,
    "correctionTrack" TEXT,
    "registeredByLabel" TEXT,
    "courierId" TEXT,
    "courierPickupId" TEXT,
    "courierDeliveryId" TEXT,
    "invoiceAttachmentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_kaitenCardTypeId_fkey" FOREIGN KEY ("kaitenCardTypeId") REFERENCES "KaitenCardType" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_continuesFromOrderId_fkey" FOREIGN KEY ("continuesFromOrderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "Courier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_courierPickupId_fkey" FOREIGN KEY ("courierPickupId") REFERENCES "Courier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_courierDeliveryId_fkey" FOREIGN KEY ("courierDeliveryId") REFERENCES "Courier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_invoiceAttachmentId_fkey" FOREIGN KEY ("invoiceAttachmentId") REFERENCES "OrderAttachment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("adminShippedOtpr", "appointmentDate", "clientOrderText", "clinicId", "continuesFromOrderId", "correctionTrack", "courierId", "createdAt", "doctorId", "dueDate", "dueToAdminsAt", "excludeFromReconciliation", "excludeFromReconciliationUntil", "hasCt", "hasMri", "hasPhoto", "hasScans", "id", "invoiceAttachmentId", "invoiceEdoSigned", "invoiceNumber", "invoicePaperDocs", "invoiceSentToEdo", "isUrgent", "kaitenCardId", "kaitenCardTitleLabel", "kaitenColumnTitle", "kaitenDecideLater", "kaitenSyncError", "kaitenSyncedAt", "kaitenTrackLane", "labWorkStatus", "legalEntity", "narjadPrinted", "notes", "orderNumber", "patientName", "payment", "prostheticsOrdered", "quickOrder", "registeredByLabel", "shade", "status", "updatedAt", "urgentCoefficient") SELECT "adminShippedOtpr", "appointmentDate", "clientOrderText", "clinicId", "continuesFromOrderId", "correctionTrack", "courierId", "createdAt", "doctorId", "dueDate", "dueToAdminsAt", "excludeFromReconciliation", "excludeFromReconciliationUntil", "hasCt", "hasMri", "hasPhoto", "hasScans", "id", "invoiceAttachmentId", "invoiceEdoSigned", "invoiceNumber", "invoicePaperDocs", "invoiceSentToEdo", "isUrgent", "kaitenCardId", "kaitenCardTitleLabel", "kaitenColumnTitle", "kaitenDecideLater", "kaitenSyncError", "kaitenSyncedAt", "kaitenTrackLane", "labWorkStatus", "legalEntity", "narjadPrinted", "notes", "orderNumber", "patientName", "payment", "prostheticsOrdered", "quickOrder", "registeredByLabel", "shade", "status", "updatedAt", "urgentCoefficient" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE UNIQUE INDEX "Order_invoiceAttachmentId_key" ON "Order"("invoiceAttachmentId");
CREATE INDEX "Order_clinicId_idx" ON "Order"("clinicId");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_labWorkStatus_idx" ON "Order"("labWorkStatus");
CREATE INDEX "Order_kaitenCardTypeId_idx" ON "Order"("kaitenCardTypeId");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "Order_courierId_idx" ON "Order"("courierId");
CREATE INDEX "Order_courierPickupId_idx" ON "Order"("courierPickupId");
CREATE INDEX "Order_courierDeliveryId_idx" ON "Order"("courierDeliveryId");
CREATE INDEX "Order_continuesFromOrderId_idx" ON "Order"("continuesFromOrderId");
CREATE TABLE "new_OrderConstruction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "constructionTypeId" TEXT,
    "priceListItemId" TEXT,
    "materialId" TEXT,
    "shade" TEXT,
    "teethFdi" JSONB,
    "bridgeFromFdi" TEXT,
    "bridgeToFdi" TEXT,
    "arch" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderConstruction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderConstruction_constructionTypeId_fkey" FOREIGN KEY ("constructionTypeId") REFERENCES "ConstructionType" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderConstruction_priceListItemId_fkey" FOREIGN KEY ("priceListItemId") REFERENCES "PriceListItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderConstruction_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OrderConstruction" ("arch", "bridgeFromFdi", "bridgeToFdi", "category", "constructionTypeId", "createdAt", "id", "materialId", "orderId", "priceListItemId", "shade", "sortOrder", "teethFdi") SELECT "arch", "bridgeFromFdi", "bridgeToFdi", "category", "constructionTypeId", "createdAt", "id", "materialId", "orderId", "priceListItemId", "shade", "sortOrder", "teethFdi" FROM "OrderConstruction";
DROP TABLE "OrderConstruction";
ALTER TABLE "new_OrderConstruction" RENAME TO "OrderConstruction";
CREATE INDEX "OrderConstruction_orderId_idx" ON "OrderConstruction"("orderId");
CREATE TABLE "new_OrderRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorLabel" TEXT NOT NULL,
    "actorUserId" TEXT,
    "summary" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'SAVE',
    "snapshot" JSONB NOT NULL,
    CONSTRAINT "OrderRevision_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderRevision_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OrderRevision" ("actorLabel", "actorUserId", "createdAt", "id", "kind", "orderId", "snapshot", "summary") SELECT "actorLabel", "actorUserId", "createdAt", "id", "kind", "orderId", "snapshot", "summary" FROM "OrderRevision";
DROP TABLE "OrderRevision";
ALTER TABLE "new_OrderRevision" RENAME TO "OrderRevision";
CREATE INDEX "OrderRevision_orderId_createdAt_idx" ON "OrderRevision"("orderId", "createdAt");
CREATE INDEX "OrderRevision_actorUserId_createdAt_idx" ON "OrderRevision"("actorUserId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DoctorOnClinic_clinicId_idx" ON "DoctorOnClinic"("clinicId");

-- CreateIndex
CREATE INDEX "DoctorOnClinic_doctorId_idx" ON "DoctorOnClinic"("doctorId");

-- CreateIndex
CREATE INDEX "KaitenCardType_isActive_sortOrder_idx" ON "KaitenCardType"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "KaitenCardType_name_idx" ON "KaitenCardType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_mentionHandle_key" ON "User"("mentionHandle");

