-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BillingLegalForm" AS ENUM ('IP', 'OOO');

-- CreateEnum
CREATE TYPE "ReconciliationFrequency" AS ENUM ('MONTHLY_1', 'MONTHLY_2');

-- CreateEnum
CREATE TYPE "ReconciliationSnapshotSlot" AS ENUM ('MONTHLY_FULL', 'FIRST_HALF', 'SECOND_HALF');

-- CreateEnum
CREATE TYPE "ContractorRevisionKind" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('BASIC', 'OPTIMAL', 'ULTRA');

-- CreateEnum
CREATE TYPE "SubscriptionInvoiceStatus" AS ENUM ('DRAFT', 'PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubscriptionPaymentProvider" AS ENUM ('MANUAL', 'YOOKASSA');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('REVIEW', 'PLANNING', 'IN_PROGRESS', 'IN_DELIVERY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LabWorkStatus" AS ENUM ('TO_SCAN', 'TO_EXECUTION', 'APPROVAL', 'PRODUCTION', 'ASSEMBLY', 'PROCESSING', 'MANUAL', 'TO_REVIEW', 'TO_ADMINS');

-- CreateEnum
CREATE TYPE "DemoKanbanColumn" AS ENUM ('NEW', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "KaitenTrackLane" AS ENUM ('ORTHOPEDICS', 'ORTHODONTICS', 'TEST');

-- CreateEnum
CREATE TYPE "OrderCorrectionTrack" AS ENUM ('ORTHOPEDICS', 'ORTHODONTICS', 'REWORK');

-- CreateEnum
CREATE TYPE "OrderChatCorrectionSource" AS ENUM ('KAITEN', 'DEMO_KANBAN');

-- CreateEnum
CREATE TYPE "AppModule" AS ENUM ('ORDERS', 'KANBAN', 'ORDER_HISTORY', 'ANALYTICS', 'SHIPMENTS', 'WAREHOUSE', 'CLIENTS', 'ATTENTION', 'DIRECTORY', 'CONFIG_PRICING', 'CONFIG_WAREHOUSE', 'CONFIG_KANBAN_BOARDS', 'CONFIG_KAITEN', 'CONFIG_COURIERS', 'CONFIG_COSTING', 'CONFIG_USERS');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMINISTRATOR', 'SENIOR_ADMINISTRATOR', 'ACCOUNTANT', 'FINANCIAL_MANAGER', 'USER', 'OWNER');

-- CreateEnum
CREATE TYPE "OrderRevisionKind" AS ENUM ('CREATE', 'SAVE', 'RESTORE');

-- CreateEnum
CREATE TYPE "OrderPriceListKind" AS ENUM ('MAIN', 'CUSTOM');

-- CreateEnum
CREATE TYPE "StockMovementKind" AS ENUM ('PURCHASE_RECEIPT', 'SALE_ISSUE', 'ADJUSTMENT_PLUS', 'ADJUSTMENT_MINUS', 'DEFECT_WRITE_OFF', 'RETURN_IN');

-- CreateEnum
CREATE TYPE "ConstructionCategory" AS ENUM ('FIXED', 'CONNECTING', 'BRIDGE', 'MISSING_TEETH', 'ARCH', 'PRICE_LIST');

-- CreateEnum
CREATE TYPE "CostingColumnKind" AS ENUM ('INPUT', 'COMPUTED');

-- CreateEnum
CREATE TYPE "JawArch" AS ENUM ('UPPER', 'LOWER', 'BOTH');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'BASIC',
    "addonKanban" BOOLEAN NOT NULL DEFAULT false,
    "subscriptionValidTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionInvoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "status" "SubscriptionInvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "SubscriptionPaymentProvider" NOT NULL DEFAULT 'MANUAL',
    "providerExternalId" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "SubscriptionInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinic" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
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
    "reconciliationFrequency" "ReconciliationFrequency",
    "contractSigned" BOOLEAN NOT NULL DEFAULT false,
    "contractNumber" TEXT,
    "worksWithEdo" BOOLEAN NOT NULL DEFAULT false,
    "billingLegalForm" "BillingLegalForm",
    "sourceDoctorId" TEXT,
    "orderPriceListKind" "OrderPriceListKind",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicReconciliationSnapshot" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "slot" "ReconciliationSnapshotSlot" NOT NULL,
    "periodFromStr" TEXT NOT NULL,
    "periodToStr" TEXT NOT NULL,
    "periodLabelRu" TEXT NOT NULL,
    "legalEntityLabel" TEXT NOT NULL,
    "xlsxBytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "ClinicReconciliationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorOnClinic" (
    "doctorId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,

    CONSTRAINT "DoctorOnClinic_pkey" PRIMARY KEY ("doctorId","clinicId")
);

-- CreateTable
CREATE TABLE "DoctorClinicLinkSuppression" (
    "doctorId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DoctorClinicLinkSuppression_pkey" PRIMARY KEY ("doctorId","clinicId")
);

-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
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
    "birthday" TIMESTAMP(3),
    "particulars" TEXT,
    "acceptsPrivatePractice" BOOLEAN NOT NULL DEFAULT false,
    "isIpEntrepreneur" BOOLEAN NOT NULL DEFAULT false,
    "orderPriceListKind" "OrderPriceListKind",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorRevision" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorLabel" TEXT NOT NULL,
    "actorUserId" TEXT,
    "kind" "ContractorRevisionKind" NOT NULL DEFAULT 'UPDATE',
    "clinicId" TEXT,
    "doctorId" TEXT,
    "summary" TEXT NOT NULL,
    "details" JSONB,

    CONSTRAINT "ContractorRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "passwordHash" TEXT,
    "inviteCodeHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "telegramId" TEXT,
    "telegramUsername" TEXT,
    "telegramKanbanNotifyPrefs" JSONB,
    "phone" TEXT,
    "avatarPresetId" TEXT,
    "avatarCustomMime" TEXT,
    "avatarCustomUploadedAt" TIMESTAMP(3),
    "mentionHandle" TEXT,
    "ordersListPageSize" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleModuleAccess" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "module" "AppModule" NOT NULL,
    "allowed" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleModuleAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramBotLinkPending" (
    "telegramUserId" TEXT NOT NULL,
    "tenantSlug" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramBotLinkPending_pkey" PRIMARY KEY ("telegramUserId")
);

-- CreateTable
CREATE TABLE "TelegramLinkToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "telegramUsername" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),

    CONSTRAINT "TelegramLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Courier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Courier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderRevision" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorLabel" TEXT NOT NULL,
    "actorUserId" TEXT,
    "summary" TEXT NOT NULL,
    "kind" "OrderRevisionKind" NOT NULL DEFAULT 'SAVE',
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "OrderRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderNumberSettings" (
    "id" TEXT NOT NULL,
    "postingYearMonth" TEXT NOT NULL,
    "nextSequenceFloor" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderNumberSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KaitenCardType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "externalTypeId" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "KaitenCardType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "clinicId" TEXT,
    "doctorId" TEXT NOT NULL,
    "patientName" TEXT,
    "appointmentDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "dueToAdminsAt" TIMESTAMP(3),
    "workReceivedAt" TIMESTAMP(3),
    "status" "OrderStatus" NOT NULL DEFAULT 'REVIEW',
    "notes" TEXT,
    "clientOrderText" TEXT,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "urgentCoefficient" DOUBLE PRECISION,
    "labWorkStatus" "LabWorkStatus" NOT NULL DEFAULT 'TO_EXECUTION',
    "legalEntity" TEXT,
    "payment" TEXT,
    "excludeFromReconciliation" BOOLEAN NOT NULL DEFAULT false,
    "excludeFromReconciliationUntil" TIMESTAMP(3),
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
    "kaitenTrackLane" "KaitenTrackLane",
    "kaitenAdminDueHasTime" BOOLEAN NOT NULL DEFAULT true,
    "kaitenCardTitleLabel" TEXT,
    "kaitenCardId" INTEGER,
    "demoKanbanColumn" "DemoKanbanColumn",
    "kaitenSyncError" TEXT,
    "kaitenSyncedAt" TIMESTAMP(3),
    "kaitenColumnTitle" TEXT,
    "kaitenCardSortOrder" DOUBLE PRECISION,
    "kaitenCardTitleMirror" TEXT,
    "kaitenCardDescriptionMirror" TEXT,
    "kaitenBlocked" BOOLEAN NOT NULL DEFAULT false,
    "kaitenBlockReason" TEXT,
    "invoiceIssued" BOOLEAN NOT NULL DEFAULT false,
    "invoiceNumber" TEXT,
    "invoicePaperDocs" BOOLEAN NOT NULL DEFAULT false,
    "invoiceSentToEdo" BOOLEAN NOT NULL DEFAULT false,
    "invoiceEdoSigned" BOOLEAN NOT NULL DEFAULT false,
    "invoicePrinted" BOOLEAN NOT NULL DEFAULT false,
    "narjadPrinted" BOOLEAN NOT NULL DEFAULT false,
    "adminShippedOtpr" BOOLEAN NOT NULL DEFAULT false,
    "shippedDescription" TEXT,
    "invoiceParsedLines" JSONB,
    "invoiceParsedTotalRub" INTEGER,
    "invoiceParsedSummaryText" TEXT,
    "invoicePaymentNotes" TEXT,
    "orderPriceListKind" "OrderPriceListKind",
    "orderPriceListNote" TEXT,
    "compositionDiscountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "continuesFromOrderId" TEXT,
    "prostheticsOrdered" BOOLEAN NOT NULL DEFAULT false,
    "correctionTrack" "OrderCorrectionTrack",
    "registeredByLabel" TEXT,
    "courierId" TEXT,
    "courierPickupId" TEXT,
    "courierDeliveryId" TEXT,
    "invoiceAttachmentId" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderChatCorrection" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "source" "OrderChatCorrectionSource" NOT NULL,
    "text" TEXT NOT NULL,
    "kaitenCommentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,

    CONSTRAINT "OrderChatCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderProstheticsRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "source" "OrderChatCorrectionSource" NOT NULL,
    "text" TEXT NOT NULL,
    "kaitenCommentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,

    CONSTRAINT "OrderProstheticsRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderCustomTag" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "OrderCustomTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAttachment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "diskRelPath" TEXT,
    "uploadedToKaitenAt" TIMESTAMP(3),
    "kaitenFileId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConstructionType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isArchWork" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConstructionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "warehouseType" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '╤И╤В',
    "manufacturer" TEXT,
    "unitsPerSupply" DOUBLE PRECISION,
    "referenceUnitPriceRub" DOUBLE PRECISION,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBalance" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "quantityOnHand" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageUnitCostRub" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "StockMovementKind" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "totalCostRub" DOUBLE PRECISION,
    "note" TEXT,
    "itemId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "orderId" TEXT,
    "actorLabel" TEXT NOT NULL DEFAULT '╨Я╨╛╨╗╤М╨╖╨╛╨▓╨░╤В╨╡╨╗╤М',
    "idempotencyKey" TEXT,
    "returnedToWarehouseAt" TIMESTAMP(3),

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostingVersion" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "monthlyFixedCostsRub" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fixedCostsPeriodNote" TEXT,
    "expectedWorksPerMonth" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostingVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostingFixedCostItem" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountRub" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostingFixedCostItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostingSharedPool" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "totalRub" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CostingSharedPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostingLinePoolShare" (
    "lineId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "shareRub" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "CostingLinePoolShare_pkey" PRIMARY KEY ("lineId","poolId")
);

-- CreateTable
CREATE TABLE "CostingColumn" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" "CostingColumnKind" NOT NULL,
    "formula" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "hint" TEXT,

    CONSTRAINT "CostingColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostingLine" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "priceListItemId" TEXT,
    "inputsJson" JSONB NOT NULL DEFAULT '{}',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostingLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostingClientProfile" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "clinicId" TEXT,
    "name" TEXT NOT NULL,
    "listDiscountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostingClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceListWorkspaceSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "activePriceListId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceListWorkspaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceListItem" (
    "id" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sectionTitle" TEXT,
    "subsectionTitle" TEXT,
    "priceRub" INTEGER NOT NULL,
    "leadWorkingDays" INTEGER,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicPriceOverride" (
    "clinicId" TEXT NOT NULL,
    "priceListItemId" TEXT NOT NULL,
    "priceRub" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicPriceOverride_pkey" PRIMARY KEY ("clinicId","priceListItemId")
);

-- CreateTable
CREATE TABLE "OrderConstruction" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "category" "ConstructionCategory" NOT NULL,
    "constructionTypeId" TEXT,
    "priceListItemId" TEXT,
    "materialId" TEXT,
    "shade" TEXT,
    "teethFdi" JSONB,
    "bridgeFromFdi" TEXT,
    "bridgeToFdi" TEXT,
    "arch" "JawArch",
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION,
    "lineDiscountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderConstruction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionInvoice_providerExternalId_key" ON "SubscriptionInvoice"("providerExternalId");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_tenantId_createdAt_idx" ON "SubscriptionInvoice"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionInvoice_status_idx" ON "SubscriptionInvoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_sourceDoctorId_key" ON "Clinic"("sourceDoctorId");

-- CreateIndex
CREATE INDEX "Clinic_tenantId_idx" ON "Clinic"("tenantId");

-- CreateIndex
CREATE INDEX "ClinicReconciliationSnapshot_clinicId_createdAt_idx" ON "ClinicReconciliationSnapshot"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "ClinicReconciliationSnapshot_dismissedAt_idx" ON "ClinicReconciliationSnapshot"("dismissedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicReconciliationSnapshot_clinicId_slot_periodFromStr_pe_key" ON "ClinicReconciliationSnapshot"("clinicId", "slot", "periodFromStr", "periodToStr");

-- CreateIndex
CREATE INDEX "DoctorOnClinic_clinicId_idx" ON "DoctorOnClinic"("clinicId");

-- CreateIndex
CREATE INDEX "DoctorOnClinic_doctorId_idx" ON "DoctorOnClinic"("doctorId");

-- CreateIndex
CREATE INDEX "DoctorClinicLinkSuppression_clinicId_idx" ON "DoctorClinicLinkSuppression"("clinicId");

-- CreateIndex
CREATE INDEX "Doctor_tenantId_idx" ON "Doctor"("tenantId");

-- CreateIndex
CREATE INDEX "ContractorRevision_createdAt_idx" ON "ContractorRevision"("createdAt");

-- CreateIndex
CREATE INDEX "ContractorRevision_actorUserId_createdAt_idx" ON "ContractorRevision"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_mentionHandle_key" ON "User"("mentionHandle");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE INDEX "RoleModuleAccess_tenantId_role_idx" ON "RoleModuleAccess"("tenantId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "RoleModuleAccess_tenantId_role_module_key" ON "RoleModuleAccess"("tenantId", "role", "module");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLinkToken_token_key" ON "TelegramLinkToken"("token");

-- CreateIndex
CREATE INDEX "TelegramLinkToken_telegramUserId_idx" ON "TelegramLinkToken"("telegramUserId");

-- CreateIndex
CREATE INDEX "Courier_tenantId_isActive_sortOrder_idx" ON "Courier"("tenantId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "Courier_name_idx" ON "Courier"("name");

-- CreateIndex
CREATE INDEX "OrderRevision_orderId_createdAt_idx" ON "OrderRevision"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderRevision_actorUserId_createdAt_idx" ON "OrderRevision"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "KaitenCardType_tenantId_isActive_sortOrder_idx" ON "KaitenCardType"("tenantId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "KaitenCardType_name_idx" ON "KaitenCardType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Order_invoiceAttachmentId_key" ON "Order"("invoiceAttachmentId");

-- CreateIndex
CREATE INDEX "Order_tenantId_idx" ON "Order"("tenantId");

-- CreateIndex
CREATE INDEX "Order_clinicId_idx" ON "Order"("clinicId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_labWorkStatus_idx" ON "Order"("labWorkStatus");

-- CreateIndex
CREATE INDEX "Order_kaitenCardTypeId_idx" ON "Order"("kaitenCardTypeId");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_courierId_idx" ON "Order"("courierId");

-- CreateIndex
CREATE INDEX "Order_courierPickupId_idx" ON "Order"("courierPickupId");

-- CreateIndex
CREATE INDEX "Order_courierDeliveryId_idx" ON "Order"("courierDeliveryId");

-- CreateIndex
CREATE INDEX "Order_continuesFromOrderId_idx" ON "Order"("continuesFromOrderId");

-- CreateIndex
CREATE INDEX "Order_archivedAt_createdAt_idx" ON "Order"("archivedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_tenantId_orderNumber_key" ON "Order"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "OrderChatCorrection_orderId_resolvedAt_idx" ON "OrderChatCorrection"("orderId", "resolvedAt");

-- CreateIndex
CREATE INDEX "OrderChatCorrection_orderId_rejectedAt_idx" ON "OrderChatCorrection"("orderId", "rejectedAt");

-- CreateIndex
CREATE INDEX "OrderChatCorrection_orderId_createdAt_idx" ON "OrderChatCorrection"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderChatCorrection_orderId_kaitenCommentId_key" ON "OrderChatCorrection"("orderId", "kaitenCommentId");

-- CreateIndex
CREATE INDEX "OrderProstheticsRequest_orderId_resolvedAt_idx" ON "OrderProstheticsRequest"("orderId", "resolvedAt");

-- CreateIndex
CREATE INDEX "OrderProstheticsRequest_orderId_rejectedAt_idx" ON "OrderProstheticsRequest"("orderId", "rejectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderProstheticsRequest_orderId_kaitenCommentId_key" ON "OrderProstheticsRequest"("orderId", "kaitenCommentId");

-- CreateIndex
CREATE INDEX "OrderCustomTag_label_idx" ON "OrderCustomTag"("label");

-- CreateIndex
CREATE INDEX "OrderCustomTag_orderId_idx" ON "OrderCustomTag"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderCustomTag_orderId_label_key" ON "OrderCustomTag"("orderId", "label");

-- CreateIndex
CREATE INDEX "OrderAttachment_orderId_idx" ON "OrderAttachment"("orderId");

-- CreateIndex
CREATE INDEX "InventoryItem_warehouseId_idx" ON "InventoryItem"("warehouseId");

-- CreateIndex
CREATE INDEX "InventoryItem_isActive_sortOrder_idx" ON "InventoryItem"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "InventoryItem_name_idx" ON "InventoryItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_warehouseId_sku_key" ON "InventoryItem"("warehouseId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "StockBalance_itemId_warehouseId_key" ON "StockBalance"("itemId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_idempotencyKey_key" ON "StockMovement"("idempotencyKey");

-- CreateIndex
CREATE INDEX "StockMovement_itemId_createdAt_idx" ON "StockMovement"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_warehouseId_createdAt_idx" ON "StockMovement"("warehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_orderId_idx" ON "StockMovement"("orderId");

-- CreateIndex
CREATE INDEX "CostingVersion_archived_effectiveFrom_idx" ON "CostingVersion"("archived", "effectiveFrom");

-- CreateIndex
CREATE INDEX "CostingFixedCostItem_versionId_sortOrder_idx" ON "CostingFixedCostItem"("versionId", "sortOrder");

-- CreateIndex
CREATE INDEX "CostingSharedPool_versionId_sortOrder_idx" ON "CostingSharedPool"("versionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CostingSharedPool_versionId_key_key" ON "CostingSharedPool"("versionId", "key");

-- CreateIndex
CREATE INDEX "CostingLinePoolShare_poolId_idx" ON "CostingLinePoolShare"("poolId");

-- CreateIndex
CREATE INDEX "CostingColumn_versionId_sortOrder_idx" ON "CostingColumn"("versionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CostingColumn_versionId_key_key" ON "CostingColumn"("versionId", "key");

-- CreateIndex
CREATE INDEX "CostingLine_versionId_idx" ON "CostingLine"("versionId");

-- CreateIndex
CREATE INDEX "CostingLine_priceListItemId_idx" ON "CostingLine"("priceListItemId");

-- CreateIndex
CREATE INDEX "CostingClientProfile_versionId_idx" ON "CostingClientProfile"("versionId");

-- CreateIndex
CREATE INDEX "CostingClientProfile_clinicId_idx" ON "CostingClientProfile"("clinicId");

-- CreateIndex
CREATE INDEX "PriceList_sortOrder_name_idx" ON "PriceList"("sortOrder", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PriceListWorkspaceSettings_activePriceListId_key" ON "PriceListWorkspaceSettings"("activePriceListId");

-- CreateIndex
CREATE INDEX "PriceListItem_priceListId_isActive_sortOrder_idx" ON "PriceListItem"("priceListId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PriceListItem_priceListId_code_key" ON "PriceListItem"("priceListId", "code");

-- CreateIndex
CREATE INDEX "ClinicPriceOverride_priceListItemId_idx" ON "ClinicPriceOverride"("priceListItemId");

-- CreateIndex
CREATE INDEX "OrderConstruction_orderId_idx" ON "OrderConstruction"("orderId");

-- AddForeignKey
ALTER TABLE "SubscriptionInvoice" ADD CONSTRAINT "SubscriptionInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clinic" ADD CONSTRAINT "Clinic_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clinic" ADD CONSTRAINT "Clinic_sourceDoctorId_fkey" FOREIGN KEY ("sourceDoctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicReconciliationSnapshot" ADD CONSTRAINT "ClinicReconciliationSnapshot_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorOnClinic" ADD CONSTRAINT "DoctorOnClinic_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorOnClinic" ADD CONSTRAINT "DoctorOnClinic_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorClinicLinkSuppression" ADD CONSTRAINT "DoctorClinicLinkSuppression_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorClinicLinkSuppression" ADD CONSTRAINT "DoctorClinicLinkSuppression_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorRevision" ADD CONSTRAINT "ContractorRevision_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorRevision" ADD CONSTRAINT "ContractorRevision_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorRevision" ADD CONSTRAINT "ContractorRevision_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleModuleAccess" ADD CONSTRAINT "RoleModuleAccess_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramLinkToken" ADD CONSTRAINT "TelegramLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Courier" ADD CONSTRAINT "Courier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderRevision" ADD CONSTRAINT "OrderRevision_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderRevision" ADD CONSTRAINT "OrderRevision_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderNumberSettings" ADD CONSTRAINT "OrderNumberSettings_id_fkey" FOREIGN KEY ("id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KaitenCardType" ADD CONSTRAINT "KaitenCardType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_kaitenCardTypeId_fkey" FOREIGN KEY ("kaitenCardTypeId") REFERENCES "KaitenCardType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_continuesFromOrderId_fkey" FOREIGN KEY ("continuesFromOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "Courier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_courierPickupId_fkey" FOREIGN KEY ("courierPickupId") REFERENCES "Courier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_courierDeliveryId_fkey" FOREIGN KEY ("courierDeliveryId") REFERENCES "Courier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_invoiceAttachmentId_fkey" FOREIGN KEY ("invoiceAttachmentId") REFERENCES "OrderAttachment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderChatCorrection" ADD CONSTRAINT "OrderChatCorrection_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderChatCorrection" ADD CONSTRAINT "OrderChatCorrection_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderChatCorrection" ADD CONSTRAINT "OrderChatCorrection_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderProstheticsRequest" ADD CONSTRAINT "OrderProstheticsRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderProstheticsRequest" ADD CONSTRAINT "OrderProstheticsRequest_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderProstheticsRequest" ADD CONSTRAINT "OrderProstheticsRequest_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderCustomTag" ADD CONSTRAINT "OrderCustomTag_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAttachment" ADD CONSTRAINT "OrderAttachment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBalance" ADD CONSTRAINT "StockBalance_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostingFixedCostItem" ADD CONSTRAINT "CostingFixedCostItem_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CostingVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostingSharedPool" ADD CONSTRAINT "CostingSharedPool_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CostingVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostingLinePoolShare" ADD CONSTRAINT "CostingLinePoolShare_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "CostingSharedPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostingLinePoolShare" ADD CONSTRAINT "CostingLinePoolShare_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "CostingLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostingColumn" ADD CONSTRAINT "CostingColumn_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CostingVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostingLine" ADD CONSTRAINT "CostingLine_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CostingVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostingLine" ADD CONSTRAINT "CostingLine_priceListItemId_fkey" FOREIGN KEY ("priceListItemId") REFERENCES "PriceListItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostingClientProfile" ADD CONSTRAINT "CostingClientProfile_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "CostingVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostingClientProfile" ADD CONSTRAINT "CostingClientProfile_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListWorkspaceSettings" ADD CONSTRAINT "PriceListWorkspaceSettings_activePriceListId_fkey" FOREIGN KEY ("activePriceListId") REFERENCES "PriceList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceListItem" ADD CONSTRAINT "PriceListItem_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicPriceOverride" ADD CONSTRAINT "ClinicPriceOverride_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicPriceOverride" ADD CONSTRAINT "ClinicPriceOverride_priceListItemId_fkey" FOREIGN KEY ("priceListItemId") REFERENCES "PriceListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderConstruction" ADD CONSTRAINT "OrderConstruction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderConstruction" ADD CONSTRAINT "OrderConstruction_constructionTypeId_fkey" FOREIGN KEY ("constructionTypeId") REFERENCES "ConstructionType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderConstruction" ADD CONSTRAINT "OrderConstruction_priceListItemId_fkey" FOREIGN KEY ("priceListItemId") REFERENCES "PriceListItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderConstruction" ADD CONSTRAINT "OrderConstruction_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

