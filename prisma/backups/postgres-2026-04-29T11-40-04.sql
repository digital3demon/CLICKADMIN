--
-- PostgreSQL database dump
--

\restrict 8uXM1ErHOAIhfgFk30CZhN9pCh8xQPhIffYBuNO4JfaoQlclT030FlDw6hlNnRz

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AppModule; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AppModule" AS ENUM (
    'ORDERS',
    'KANBAN',
    'ORDER_HISTORY',
    'ANALYTICS',
    'SHIPMENTS',
    'WAREHOUSE',
    'CLIENTS',
    'ATTENTION',
    'DIRECTORY',
    'CONFIG_PRICING',
    'CONFIG_WAREHOUSE',
    'CONFIG_KANBAN_BOARDS',
    'CONFIG_KAITEN',
    'CONFIG_COURIERS',
    'CONFIG_COSTING',
    'CONFIG_USERS'
);


--
-- Name: BillingLegalForm; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BillingLegalForm" AS ENUM (
    'IP',
    'OOO'
);


--
-- Name: ConstructionCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ConstructionCategory" AS ENUM (
    'FIXED',
    'CONNECTING',
    'BRIDGE',
    'MISSING_TEETH',
    'ARCH',
    'PRICE_LIST'
);


--
-- Name: ContractorRevisionKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContractorRevisionKind" AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE',
    'RESTORE'
);


--
-- Name: CostingColumnKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CostingColumnKind" AS ENUM (
    'INPUT',
    'COMPUTED'
);


--
-- Name: DemoKanbanColumn; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DemoKanbanColumn" AS ENUM (
    'NEW',
    'IN_PROGRESS',
    'DONE'
);


--
-- Name: JawArch; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."JawArch" AS ENUM (
    'UPPER',
    'LOWER',
    'BOTH'
);


--
-- Name: KaitenTrackLane; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."KaitenTrackLane" AS ENUM (
    'ORTHOPEDICS',
    'ORTHODONTICS',
    'TEST'
);


--
-- Name: LabWorkStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LabWorkStatus" AS ENUM (
    'TO_SCAN',
    'TO_EXECUTION',
    'APPROVAL',
    'PRODUCTION',
    'ASSEMBLY',
    'PROCESSING',
    'MANUAL',
    'TO_REVIEW',
    'TO_ADMINS'
);


--
-- Name: OrderChatCorrectionSource; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderChatCorrectionSource" AS ENUM (
    'KAITEN',
    'DEMO_KANBAN'
);


--
-- Name: OrderCorrectionTrack; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderCorrectionTrack" AS ENUM (
    'ORTHOPEDICS',
    'ORTHODONTICS'
);


--
-- Name: OrderPriceListKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderPriceListKind" AS ENUM (
    'MAIN',
    'CUSTOM'
);


--
-- Name: OrderRevisionKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderRevisionKind" AS ENUM (
    'CREATE',
    'SAVE',
    'RESTORE'
);


--
-- Name: OrderStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OrderStatus" AS ENUM (
    'REVIEW',
    'PLANNING',
    'IN_PROGRESS',
    'IN_DELIVERY',
    'DELIVERED',
    'CANCELLED'
);


--
-- Name: ReconciliationFrequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReconciliationFrequency" AS ENUM (
    'MONTHLY_1',
    'MONTHLY_2'
);


--
-- Name: ReconciliationSnapshotSlot; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReconciliationSnapshotSlot" AS ENUM (
    'MONTHLY_FULL',
    'FIRST_HALF',
    'SECOND_HALF'
);


--
-- Name: StockMovementKind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StockMovementKind" AS ENUM (
    'PURCHASE_RECEIPT',
    'SALE_ISSUE',
    'ADJUSTMENT_PLUS',
    'ADJUSTMENT_MINUS',
    'DEFECT_WRITE_OFF',
    'RETURN_IN'
);


--
-- Name: SubscriptionInvoiceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubscriptionInvoiceStatus" AS ENUM (
    'DRAFT',
    'PENDING',
    'PAID',
    'CANCELLED'
);


--
-- Name: SubscriptionPaymentProvider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubscriptionPaymentProvider" AS ENUM (
    'MANUAL',
    'YOOKASSA'
);


--
-- Name: SubscriptionPlan; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubscriptionPlan" AS ENUM (
    'BASIC',
    'OPTIMAL',
    'ULTRA'
);


--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMINISTRATOR',
    'SENIOR_ADMINISTRATOR',
    'ACCOUNTANT',
    'FINANCIAL_MANAGER',
    'USER',
    'OWNER'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Clinic; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Clinic" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    address text,
    "isActive" boolean DEFAULT true NOT NULL,
    notes text,
    "legalFullName" text,
    "legalAddress" text,
    inn text,
    kpp text,
    ogrn text,
    "bankName" text,
    bik text,
    "settlementAccount" text,
    "correspondentAccount" text,
    phone text,
    email text,
    "ceoName" text,
    "worksWithReconciliation" boolean DEFAULT false NOT NULL,
    "reconciliationFrequency" public."ReconciliationFrequency",
    "contractSigned" boolean DEFAULT false NOT NULL,
    "contractNumber" text,
    "worksWithEdo" boolean DEFAULT false NOT NULL,
    "billingLegalForm" public."BillingLegalForm",
    "sourceDoctorId" text,
    "orderPriceListKind" public."OrderPriceListKind",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


--
-- Name: ClinicPriceOverride; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ClinicPriceOverride" (
    "clinicId" text NOT NULL,
    "priceListItemId" text NOT NULL,
    "priceRub" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ClinicReconciliationSnapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ClinicReconciliationSnapshot" (
    id text NOT NULL,
    "clinicId" text NOT NULL,
    slot public."ReconciliationSnapshotSlot" NOT NULL,
    "periodFromStr" text NOT NULL,
    "periodToStr" text NOT NULL,
    "periodLabelRu" text NOT NULL,
    "legalEntityLabel" text NOT NULL,
    "xlsxBytes" bytea NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "dismissedAt" timestamp(3) without time zone
);


--
-- Name: ConstructionType; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConstructionType" (
    id text NOT NULL,
    name text NOT NULL,
    code text,
    "isArchWork" boolean DEFAULT false NOT NULL
);


--
-- Name: ContractorRevision; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ContractorRevision" (
    id text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actorLabel" text NOT NULL,
    "actorUserId" text,
    kind public."ContractorRevisionKind" DEFAULT 'UPDATE'::public."ContractorRevisionKind" NOT NULL,
    "clinicId" text,
    "doctorId" text,
    summary text NOT NULL,
    details jsonb
);


--
-- Name: CostingClientProfile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CostingClientProfile" (
    id text NOT NULL,
    "versionId" text NOT NULL,
    "clinicId" text,
    name text NOT NULL,
    "listDiscountPercent" double precision DEFAULT 0 NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CostingColumn; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CostingColumn" (
    id text NOT NULL,
    "versionId" text NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    kind public."CostingColumnKind" NOT NULL,
    formula text,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    hint text
);


--
-- Name: CostingFixedCostItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CostingFixedCostItem" (
    id text NOT NULL,
    "versionId" text NOT NULL,
    label text NOT NULL,
    "amountRub" double precision DEFAULT 0 NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CostingLine; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CostingLine" (
    id text NOT NULL,
    "versionId" text NOT NULL,
    "priceListItemId" text,
    "inputsJson" jsonb DEFAULT '{}'::jsonb NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: CostingLinePoolShare; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CostingLinePoolShare" (
    "lineId" text NOT NULL,
    "poolId" text NOT NULL,
    "shareRub" double precision DEFAULT 0 NOT NULL
);


--
-- Name: CostingSharedPool; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CostingSharedPool" (
    id text NOT NULL,
    "versionId" text NOT NULL,
    key text NOT NULL,
    label text NOT NULL,
    "totalRub" double precision DEFAULT 0 NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL
);


--
-- Name: CostingVersion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CostingVersion" (
    id text NOT NULL,
    title text NOT NULL,
    "effectiveFrom" timestamp(3) without time zone,
    archived boolean DEFAULT false NOT NULL,
    "monthlyFixedCostsRub" double precision DEFAULT 0 NOT NULL,
    "fixedCostsPeriodNote" text,
    "expectedWorksPerMonth" double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Courier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Courier" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Doctor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Doctor" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "fullName" text NOT NULL,
    "lastName" text,
    "firstName" text,
    patronymic text,
    "formerLastName" text,
    specialty text,
    city text,
    email text,
    "clinicWorkEmail" text,
    phone text,
    "preferredContact" text,
    "telegramUsername" text,
    birthday timestamp(3) without time zone,
    particulars text,
    "acceptsPrivatePractice" boolean DEFAULT false NOT NULL,
    "isIpEntrepreneur" boolean DEFAULT false NOT NULL,
    "orderPriceListKind" public."OrderPriceListKind",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deletedAt" timestamp(3) without time zone
);


--
-- Name: DoctorClinicLinkSuppression; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DoctorClinicLinkSuppression" (
    "doctorId" text NOT NULL,
    "clinicId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DoctorOnClinic; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DoctorOnClinic" (
    "doctorId" text NOT NULL,
    "clinicId" text NOT NULL
);


--
-- Name: InventoryItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."InventoryItem" (
    id text NOT NULL,
    "warehouseId" text NOT NULL,
    sku text,
    name text NOT NULL,
    unit text DEFAULT 'шт'::text NOT NULL,
    manufacturer text,
    "unitsPerSupply" double precision,
    "referenceUnitPriceRub" double precision,
    notes text,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: KaitenCardType; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."KaitenCardType" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    name text NOT NULL,
    "externalTypeId" integer NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL
);


--
-- Name: Material; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Material" (
    id text NOT NULL,
    name text NOT NULL
);


--
-- Name: Order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Order" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "orderNumber" text NOT NULL,
    "clinicId" text,
    "doctorId" text NOT NULL,
    "patientName" text,
    "appointmentDate" timestamp(3) without time zone,
    "dueDate" timestamp(3) without time zone,
    "dueToAdminsAt" timestamp(3) without time zone,
    "workReceivedAt" timestamp(3) without time zone,
    status public."OrderStatus" DEFAULT 'REVIEW'::public."OrderStatus" NOT NULL,
    notes text,
    "clientOrderText" text,
    "isUrgent" boolean DEFAULT false NOT NULL,
    "urgentCoefficient" double precision,
    "labWorkStatus" public."LabWorkStatus" DEFAULT 'TO_EXECUTION'::public."LabWorkStatus" NOT NULL,
    "legalEntity" text,
    payment text,
    "excludeFromReconciliation" boolean DEFAULT false NOT NULL,
    "excludeFromReconciliationUntil" timestamp(3) without time zone,
    shade text,
    "hasScans" boolean DEFAULT false NOT NULL,
    "hasCt" boolean DEFAULT false NOT NULL,
    "hasMri" boolean DEFAULT false NOT NULL,
    "hasPhoto" boolean DEFAULT false NOT NULL,
    "additionalSourceNotes" text,
    "quickOrder" jsonb,
    prosthetics jsonb,
    "kaitenDecideLater" boolean DEFAULT false NOT NULL,
    "kaitenCardTypeId" text,
    "kaitenTrackLane" public."KaitenTrackLane",
    "kaitenAdminDueHasTime" boolean DEFAULT true NOT NULL,
    "kaitenCardTitleLabel" text,
    "kaitenCardId" integer,
    "demoKanbanColumn" public."DemoKanbanColumn",
    "kaitenSyncError" text,
    "kaitenSyncedAt" timestamp(3) without time zone,
    "kaitenColumnTitle" text,
    "kaitenCardSortOrder" double precision,
    "kaitenCardTitleMirror" text,
    "kaitenCardDescriptionMirror" text,
    "kaitenBlocked" boolean DEFAULT false NOT NULL,
    "kaitenBlockReason" text,
    "invoiceIssued" boolean DEFAULT false NOT NULL,
    "invoiceNumber" text,
    "invoicePaperDocs" boolean DEFAULT false NOT NULL,
    "invoiceSentToEdo" boolean DEFAULT false NOT NULL,
    "invoiceEdoSigned" boolean DEFAULT false NOT NULL,
    "invoicePrinted" boolean DEFAULT false NOT NULL,
    "narjadPrinted" boolean DEFAULT false NOT NULL,
    "adminShippedOtpr" boolean DEFAULT false NOT NULL,
    "shippedDescription" text,
    "invoiceParsedLines" jsonb,
    "invoiceParsedTotalRub" integer,
    "invoiceParsedSummaryText" text,
    "invoicePaymentNotes" text,
    "orderPriceListKind" public."OrderPriceListKind",
    "orderPriceListNote" text,
    "compositionDiscountPercent" double precision DEFAULT 0 NOT NULL,
    "continuesFromOrderId" text,
    "prostheticsOrdered" boolean DEFAULT false NOT NULL,
    "correctionTrack" public."OrderCorrectionTrack",
    "registeredByLabel" text,
    "courierId" text,
    "courierPickupId" text,
    "courierDeliveryId" text,
    "invoiceAttachmentId" text,
    "archivedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: OrderAttachment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderAttachment" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "fileName" text NOT NULL,
    "mimeType" text NOT NULL,
    size integer NOT NULL,
    data bytea NOT NULL,
    "diskRelPath" text,
    "uploadedToKaitenAt" timestamp(3) without time zone,
    "kaitenFileId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: OrderChatCorrection; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderChatCorrection" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    source public."OrderChatCorrectionSource" NOT NULL,
    text text NOT NULL,
    "kaitenCommentId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "resolvedByUserId" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectedByUserId" text
);


--
-- Name: OrderConstruction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderConstruction" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    category public."ConstructionCategory" NOT NULL,
    "constructionTypeId" text,
    "priceListItemId" text,
    "materialId" text,
    shade text,
    "teethFdi" jsonb,
    "bridgeFromFdi" text,
    "bridgeToFdi" text,
    arch public."JawArch",
    quantity integer DEFAULT 1 NOT NULL,
    "unitPrice" double precision,
    "lineDiscountPercent" double precision DEFAULT 0 NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: OrderCustomTag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderCustomTag" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    label text NOT NULL
);


--
-- Name: OrderNumberSettings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderNumberSettings" (
    id text NOT NULL,
    "postingYearMonth" text NOT NULL,
    "nextSequenceFloor" integer,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: OrderProstheticsRequest; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderProstheticsRequest" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    source public."OrderChatCorrectionSource" NOT NULL,
    text text NOT NULL,
    "kaitenCommentId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "resolvedByUserId" text,
    "rejectedAt" timestamp(3) without time zone,
    "rejectedByUserId" text
);


--
-- Name: OrderRevision; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."OrderRevision" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "actorLabel" text NOT NULL,
    "actorUserId" text,
    summary text NOT NULL,
    kind public."OrderRevisionKind" DEFAULT 'SAVE'::public."OrderRevisionKind" NOT NULL,
    snapshot jsonb NOT NULL
);


--
-- Name: PriceList; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PriceList" (
    id text NOT NULL,
    name text NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PriceListItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PriceListItem" (
    id text NOT NULL,
    "priceListId" text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    "sectionTitle" text,
    "subsectionTitle" text,
    "priceRub" integer NOT NULL,
    "leadWorkingDays" integer,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "sortOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: PriceListWorkspaceSettings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PriceListWorkspaceSettings" (
    id text DEFAULT 'default'::text NOT NULL,
    "activePriceListId" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: RoleModuleAccess; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RoleModuleAccess" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    role public."UserRole" NOT NULL,
    module public."AppModule" NOT NULL,
    allowed boolean NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StockBalance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockBalance" (
    id text NOT NULL,
    "itemId" text NOT NULL,
    "warehouseId" text NOT NULL,
    "quantityOnHand" double precision DEFAULT 0 NOT NULL,
    "averageUnitCostRub" double precision,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StockMovement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StockMovement" (
    id text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    kind public."StockMovementKind" NOT NULL,
    quantity double precision NOT NULL,
    "totalCostRub" double precision,
    note text,
    "itemId" text NOT NULL,
    "warehouseId" text NOT NULL,
    "orderId" text,
    "actorLabel" text DEFAULT 'Пользователь'::text NOT NULL,
    "idempotencyKey" text,
    "returnedToWarehouseAt" timestamp(3) without time zone
);


--
-- Name: SubscriptionInvoice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SubscriptionInvoice" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    "amountMinor" integer NOT NULL,
    currency text DEFAULT 'RUB'::text NOT NULL,
    status public."SubscriptionInvoiceStatus" DEFAULT 'PENDING'::public."SubscriptionInvoiceStatus" NOT NULL,
    provider public."SubscriptionPaymentProvider" DEFAULT 'MANUAL'::public."SubscriptionPaymentProvider" NOT NULL,
    "providerExternalId" text,
    title text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "paidAt" timestamp(3) without time zone
);


--
-- Name: TelegramBotLinkPending; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TelegramBotLinkPending" (
    "telegramUserId" text NOT NULL,
    "tenantSlug" text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: TelegramLinkToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."TelegramLinkToken" (
    id text NOT NULL,
    token text NOT NULL,
    "userId" text NOT NULL,
    "tenantId" text NOT NULL,
    "telegramUserId" text NOT NULL,
    "telegramUsername" text,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "consumedAt" timestamp(3) without time zone
);


--
-- Name: Tenant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Tenant" (
    id text NOT NULL,
    slug text NOT NULL,
    name text,
    plan public."SubscriptionPlan" DEFAULT 'BASIC'::public."SubscriptionPlan" NOT NULL,
    "addonKanban" boolean DEFAULT false NOT NULL,
    "subscriptionValidTo" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "tenantId" text NOT NULL,
    email text NOT NULL,
    "displayName" text NOT NULL,
    role public."UserRole" NOT NULL,
    "passwordHash" text,
    "inviteCodeHash" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "telegramId" text,
    "telegramUsername" text,
    "telegramKanbanNotifyPrefs" jsonb,
    phone text,
    "avatarPresetId" text,
    "avatarCustomMime" text,
    "avatarCustomUploadedAt" timestamp(3) without time zone,
    "mentionHandle" text,
    "ordersListPageSize" integer
);


--
-- Name: Warehouse; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Warehouse" (
    id text NOT NULL,
    name text NOT NULL,
    "warehouseType" text,
    "isDefault" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Data for Name: Clinic; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Clinic" (id, "tenantId", name, address, "isActive", notes, "legalFullName", "legalAddress", inn, kpp, ogrn, "bankName", bik, "settlementAccount", "correspondentAccount", phone, email, "ceoName", "worksWithReconciliation", "reconciliationFrequency", "contractSigned", "contractNumber", "worksWithEdo", "billingLegalForm", "sourceDoctorId", "orderPriceListKind", "createdAt", "deletedAt") FROM stdin;
cmnokktj9001stj509osp3nql	cltenantdefault0000000000	26-я линия В.О.	д. 15/2	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.782	2026-04-08 09:02:33.173
cmnnn6dyv0025tj80akb2jomx	cltenantdefault0000000000	31 поликлиника	\N	t	Также в исходной строке было название: солидарности 12	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:35.096	2026-04-08 09:03:32.102
cmnokksp6000dtj50od7c0e07	cltenantdefault0000000000	31 поликлиника	Солидарности 12	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	MONTHLY_1	f	\N	f	\N	\N	\N	2026-04-07 12:02:34.699	\N
cmnnlv6im0000tjogesc6vytl	cltenantdefault0000000000	32 Практика	г. Пермь	t	для оперативного перенаправления счетов бухгалтеру попросили отправлять их на почту \nnechaevaekaterina77@mail.ru\n\n\n\nпочта директора honcho@32praktika.ru\nдля договора\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: honcho@32praktika.ru	ООО «Центр Стоматологии «32 Практика»	614000, Пермский край,	5902176259	590201001	1105902012127	Волго-Вятский банк ПАО Сбербанк	042202603	40702810849090031027	30101810900000000603	\N	nechaevaekaterina77@mail.ru	Капанадзе Ираклий Ираклиевич	f	\N	t	Доп.согл.№ от 09.01.25 к дог 2409-013 от 04.09.25	t	OOO	\N	\N	2026-04-06 19:50:52.606	\N
cmnnlv6iw0001tjogmkn0hwvu	cltenantdefault0000000000	33 зуб	ул. Ильюшина д. 1 к.1	t	клиника не активна, не поступают заказы	заказ был на частное лицо с клиникой не работали ООО «»\nИНН	Р/с	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:52.617	\N
cmnokktgh001ntj50mf85yoni	cltenantdefault0000000000	Atribeaute Clinique	Чкаловский пр., д. 50	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.682	\N
cmnnn6ht50084tj80tpa388gv	cltenantdefault0000000000	BelozubClinic	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:40.073	\N
cmnnn6h330078tj806813ztkj	cltenantdefault0000000000	MY ORT Есенина	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:39.136	\N
cmnnlv9fi00h2tjog41tzl313	cltenantdefault0000000000	Orthoone (ООО «МДМ+»)	наб. реки Карповки, 31, корп. 1	t	89657733444	ООО «МДМ+»	197022, г. Санкт-Петербург, набережная реки Карповки, д. 31, к. 1, стр. 1, помещ. 34н	7813686364	781301001	1257800016858	АО Альфа-Банк, г. Москва	044030786	40702810832410017142	30101810600000000786	\N	merdanwhite37771@mail.ru	Мерданов Мердан Мухаммедович	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.382	\N
cmnnlv7320039tjog4hcyvjvk	cltenantdefault0000000000	Orthoone (ООО Невамед) НЕТ ДОГОВОРА	наб. реки Карповки, 31, корп. 1	t	Работаем от юр. лица: ИП Соколов	ООО «Невамед+» ООО ЭДО	197136, г. Санкт-Петербург,	7804617163	780401001	1187847070707	К/счет 30101810600000000786	044030786	40702810432130005698	30101810600000000786	\N	merdanwhite37771@mail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.343	\N
cmnnn6e3c002gtj80tn0ofo4i	cltenantdefault0000000000	olga.gudko@507-9393.ru	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:35.256	2026-04-08 09:02:50.355
cmnokkstb000gtj50wq0fg8jw	cltenantdefault0000000000	«Orbis»	ул.Мира 37	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:34.847	\N
cmnnn6eem0037tj80ayc0xkcy	cltenantdefault0000000000	«Orbis», ул.Мира 37	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:35.663	2026-04-08 08:55:49.697
cmnnlv6kk0007tjogo16jyz1r	cltenantdefault0000000000	АВС Клиник/ AVS-clinic	ул. Пулковская, д. 8, к. 3	f	клиника не активна, не поступают заказы\n\n\nvetchinkinav@mail.ru	ООО «Авсклиник»	196158, г. Санкт-Петербург,	7810936471	781001001	1147847081128	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:52.676	\N
cmnnlv6rw001dtjoguqyt2ngj	cltenantdefault0000000000	АНО Современная медицина	Заневский пр. 15	t	info@sovmedclinic.ru\n\nПрайс v1_01\n\nРаботаем от юр. лица: ИП Соколов	АНО «Современная медицина» (ИП-ЭДО)	195196, г. Санкт-Петербург,	7806562953	780601001	1197800003400	Точка»	044525104	\N	\N	\N	7lazerstom@mail.ru	\N	f	\N	f	выслал договр 16.10.2023\n7lazerstom@mail.ru	t	IP	\N	\N	2026-04-06 19:50:52.941	\N
cmnnlv6sh001htjogwxtb4tbs	cltenantdefault0000000000	АРС Дентал	ул. Грибалёвой, 7, корп. 4 (этаж 1)\nКлиник ул. Грибалёвой, д. 7, к. 4 НЕОБХОДИМО ЗАКЛЮЧИТЬ НОВЫЙ ДОГОВОР	t	+7 921 888 87 30\n +7 812 322 97 55\n\nГл.врач 89213980008\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «АРС ДЕНТАЛ КЛИНИК» ООО ЭДО НЕОБХОДИМО ЗАКЛЮЧИТЬ НОВЫЙ ДОГОВОР	194100, г Санкт-Петербург,	7802704886	780201001	1207800035530	ПАО "БАНК "САНКТ-ПЕТЕРБУРГ"	044030790	\N	30101810900000000790	\N	office@arsdentalclinic.ru	7 921 398-00-08 Таймураз\nИнформацию попросил ему в мессенджеры присылать	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:52.961	\N
cmnnlv6j40002tjognhyke8ib	cltenantdefault0000000000	Аванта	ул. Белы Куна, д. 2	t	Работаем от юр. лица: ИП Соколов	ООО «Аванта» ИП бум.доки НЕТ ДОГОВОРА	192242, г. Санкт-Петербург,	7816255670	781601001	1157847108924	\N	044030786	40702810332370000579	30101810600000000786	\N	avanta.dental@mail.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:52.624	\N
cmnnlv6kq0008tjogzkrb1u7x	cltenantdefault0000000000	Аданте	ул. Можайская, д.1	t	9850602@gmail.com\n\nРаботаем от юр. лица: ИП Соколов	ООО «Аданте» ИП бум.доки	190013, г. Санкт-Петербург,	7838476030	783801001	1127847298590	УРАЛСИБ» г. Санкт-Петербург	044030706	40702810922120001932	30101810800000000706	\N	9850602@gmail.com	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:52.682	\N
cmnnlv6ku0009tjogoq4uzkn4	cltenantdefault0000000000	Адентис	г. Ставрополь\nул. Тухачевского 26/3	f	Работаем от юр. лица: НЕ РАБОТАЕМ (ЧС)	ООО «Санавитас»	35500, Ставропольский край,	2635829605	263501001	1142651011260	К/счет 30101.810.9.07020000615	040702615	\N	\N	\N	adentisclinic@mail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:52.687	\N
cmnnlv6l7000btjogxzxfdw1w	cltenantdefault0000000000	Адептика	Аптекарская наб., д. 8	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Адептика» ООО ЭДО	197022, г. Санкт-Петербург,	7805703016	781301001	1177847137038	\N	044030786	40702810332320001515	30101810600000000786	\N	hello@adeptica.pro	\N	f	\N	t	2407-005\t30.07.24	t	OOO	\N	\N	2026-04-06 19:50:52.7	\N
cmnnlv6ld000ctjog083tfoes	cltenantdefault0000000000	Аис	Светлановский пр., д. 44	t	aisdend@mail.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «АИС» ООО ЭДО	195427 г. Санкт-Петербург,	7842139493	780401001	1177847261008	\N	044030786	40702810532130005268	30101810600000000786	\N	aisdend@mail.ru	\N	f	\N	t	2411-015 20.11.24	t	OOO	\N	\N	2026-04-06 19:50:52.705	\N
cmnokktmy0022tj508e1bdzew	cltenantdefault0000000000	Ами Вита	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.914	\N
cmnnlv6ml000jtjogfk39k15a	cltenantdefault0000000000	АйСмайл	6-я Красноармейская ул., д.16	t	e-mail: 7126747@bk.ru\n7 812 712 67 47 \nтел.: +7-960-232-22-22\n\nРаботаем от юр. лица: ИП Соколов	ООО «АйСмайл» ИП бум.доки	190005, г. Санкт-Петербург,	7839120982	783901001	1197847185810	Точка»	044525104	40702810603500020724	30101810745374525104	\N	7126747@bk.ru	Директор: Лембрикова Елена Аркадьевна	f	\N	t	ИП2502-017        26.02.2025	f	IP	\N	\N	2026-04-06 19:50:52.749	\N
cmnnlv6lq000etjog87yq8wfl	cltenantdefault0000000000	Айвори	Москва, ул. 26 Бакинских комиссаров, д.14	t	Работаем от юр. лица: ИП Соколов	ООО «АЙВОРИ» ИП ЭДО ДОСТАВКА!	119526, г. Москва, вн.тер.г.	9729323038	772901001	1227700250194	К/счет 30101810400000000225	044525225	40702810538000372883	30101810400000000225	\N	ivory.stom@gmail.com\nи дублировать врачу в Телеграмм!	\N	f	\N	t	\N	t	IP	\N	\N	2026-04-06 19:50:52.718	\N
cmnnn6ddq000otj80jmwkggkg	cltenantdefault0000000000	Айвори	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:34.335	\N
cmnnlv6m3000gtjog7tzhn1lg	cltenantdefault0000000000	Айдентика	Парашютная ул., 25, корп. 1	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Андромеда» ООО ЭДО	197349, г. Санкт-Петербург,	7814452055	470345001	1097847323100	УРАЛСИБ» г. Санкт - Петербург	044030706	40702810922090002508	30101810800000000706	\N	Info@i-dentika.ru	\N	f	\N	t	2406-011  от 01.07.24	t	OOO	\N	\N	2026-04-06 19:50:52.731	\N
cmnnlv6mg000itjogb8dgkrsg	cltenantdefault0000000000	Аймед	г. Москва,, ул. Южнобутовская, 42	t	imed-clinic@yandex.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Индивидуальная Медицина» ООО ЭДО	117042, г.Москва,	7727211350	772701001	1157746673677	\N	044525411	40702810400000078719	30101810145250000411	\N	imed-clinic@yandex.ru	\N	f	\N	t	2412-008 24.12.24	t	OOO	\N	\N	2026-04-06 19:50:52.745	\N
cmnnlv6mw000ltjogb7kewzqn	cltenantdefault0000000000	Академическая Стоматология	Каменноостровский пр., д.27	t	Старый прайс, договор сентябрь\n\nРаботаем от юр. лица: ИП Соколов\n\nE-mail для договора/прайса: baranov0379@mail.ru\nдоговор acstom2012@gmail.com	ООО «Академическая Стоматология» ИП бум.доки	197022, г Санкт-Петербург,	7813329299	781301001	1057812411139	\N	044030704	40702810718020000201	30101810200000000704	\N	на почту бухгалтера \nbaranov0379@mail.ru\n\nсчет или на почту \nskanceva@mail.ru	\N	f	\N	t	\N	f	IP	\N	\N	2026-04-06 19:50:52.761	\N
cmnnlv9cl00gitjoggrs42xf0	cltenantdefault0000000000	Аксиома-Дентал	ул.Гагаринская д.30	t	\N	ООО «Аксиома-Дентал»	191028, Санкт-Петербург г, муниципальный округ Литейный округ, Гагаринская ул, дом 30, литер А, помещение 3Н	7813299816	784101001	1187847037410	СЕВЕРО-ЗАПАДНЫЙ БАНК ПАО СБЕРБАНК	044030653	40702810755000068470	30101810500000000653	\N	clinic@axiomadental.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.278	\N
cmnnlv6n9000ntjogy02ijrco	cltenantdefault0000000000	Алекса	г. Ростов-на-Дону,, п. Янтарный,	t	7(863) 235-66-39\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: oooalexa@bk.ru	ООО «Алекса» ООО ЭДО напр.договор в нов.редакции	344092, Ростов-на-Дону,	6161055650	616101001	1096193002597	Филиал «ЦЕНТРАЛЬНЫЙ»	044525411	40702810500230000075	30101810145250000411	\N	oooalexa@bk.ru	Генеральный директор \n\n\nДавыдова Александра Викторовна	f	\N	t	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:52.773	\N
cmnnlv6nl000ptjog7lufr5m8	cltenantdefault0000000000	Александрия	ул.Купчинская, д.3	t	Управляющая  Ольга Павловна -89112789672\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «РВ» ООО ЭДО	192284,Россич,Г.Санкт-Петербург,	7814378059	781601001	1077847460976	ООО "Банк Точка"	044525104	40702810920000261371	30101810745374525104	\N	stom-alexandria@mail.ru\nСчета выставлять с указанием фио пациента и фио врача	\N	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:52.785	\N
cmnokkt5e000vtj50ru49lz3y	cltenantdefault0000000000	Аллегро	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	t	[object Object]	t	OOO	\N	\N	2026-04-07 12:02:35.282	\N
cmnnlv6o9000ttjogli53lnoa	cltenantdefault0000000000	Аллюранс	г.Москва, ул. Зоологическая, д.22	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «АЛЛЮРАНС» ООО ЭДО	123242, г.Москва,	7724330648	770301001	1157746768300	\N	044525700	\N	30101810200000000700	\N	sergeylesin@yandex.ru	\N	f	\N	t	2405-006        22.05.2024\n\nДС №1 от 09.01.25	t	OOO	\N	\N	2026-04-06 19:50:52.809	\N
cmnnn6dlo001btj80dqd6exgz	cltenantdefault0000000000	Альбадент	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:34.621	\N
cmnnlv6od000utjogz53xsda7	cltenantdefault0000000000	Альфа Дент	г. Колпино	t	alfa-dent1974@mail.ru\nСергей Солдатов\n\nесли долго не оплачивают счета, сделать акт сверки взаиморасчетов и отправить Солдатову в Ватсап\n\nНовый прайс 16.10.23 выслан\n\nРаботаем от юр. лица: ИП Соколов	ООО Лдсц «Альфа-Дент» ИП бум.доки	196653, город Санкт-Петербург, город Колпино, Павловская ул., д. 23/16 литера а, пом. №1-н	7817306454	781701001	5067847038815	ПАО «Сбербанк»	044030653	40702810855000057394	30101810500000000653	\N	alfa-dent1974@mail.ru	Генеральный директор \nСолдатов Сергей Валериевич\n8 921 932-92-06	f	\N	t	\N	f	IP	\N	\N	2026-04-06 19:50:52.814	\N
cmnnlv9jy00i2tjoga8gtu15t	cltenantdefault0000000000	Альфа-Стом плюс	Виленский пер., 17/5	t	Также в исходной строке было название: 17/5	ООО «Альфа-Стом Плюс»	191014, Санкт-Петербург г, Виленский	7825386830	784201001	1027809252195	ПАО Банк «Алексанровский»	044030755	40702810000200004410	30101810000000000755	\N	bolbina@yandex.ru	Полевикова Юлия Игоревна	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.543	\N
cmnnn6krh00batj802mp1w2lm	cltenantdefault0000000000	Амара Мед	Пулковское ш., д. 20 к. 3	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	t	2410-001 от 02.10.2024	t	OOO	\N	\N	2026-04-06 20:27:43.901	\N
cmnnlv6pu0011tjog8tjjw0io	cltenantdefault0000000000	Амара Мед Пулковское ш., д. 20 к. 3 (сделать новый договор!)	196158, Санкт-Петербург, Пулковское шоссе дом 20 к 3 помещение 8 Н E	t	Старший администратор Бесфамильная Елена Валерьевна 8-(921)-908-53-28\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: amarabux@mail.ru	ООО «ЗайнКомпани» ООО ЭДО НЕОБХОДИМ НОВЫЙ ДОГОВОР!!!	192284, г.Санкт-Петербург,	7816434823	781601001	1089847065439	ПАО « Банк «Санкт-Петербург»	044030790	40702810090390000076	30101810900000000790	\N	lenabes44@yandex.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:52.867	\N
cmnnlv6qm0015tjogwb17uvs4	cltenantdefault0000000000	Аморе Дентал / Amore Dental Clinic	Комендантский пр., д. 56	t	https://amoredent.ru/\nПн-пт, вс: 09:00—21:00\n\n8-921-971-67-77\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Аморе Дент» ООО ЭДО	197373 Санкт-Петербург г.,	7814791925	781401001	1217800086020	ООО "Банк Точка"	044525104	40702810303500028754	30101810745374525104	\N	amoredent@mail.ru	\N	f	\N	t	2411-016 20.11.24	t	OOO	\N	\N	2026-04-06 19:50:52.894	\N
cmnnlv9aq00g6tjog8rdec60y	cltenantdefault0000000000	АнгелДент	Московская область, Реутов, ул.Улица Победы д.22	t	\N	ООО «Ангел-Дент»	143968, Московская область, город Реутов, ул. Победы, д.22, помещение V	5012077543	504101001	1135012000936	Филиал "Центральный" Банка ВТБ (ПАО)	044525411	40702810224800001188	30101810145250000411	\N	Angel.dent@bk.ru	Геворкян Санатрук Иванович 89115868848	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.21	\N
cmnnlv9is00httjog2kjef7zm	cltenantdefault0000000000	АнерМед	г. Калининград, Партизана железняка 1А	t	\N	ООО «ЭС класс клиник»	236017, Калининградская область, г. о. город Калининград, г. Калининград, пр-кт Победы, д. 35	3906179426	390601001	1073906027909	Филиал «Центральный» Банка ВТБ (ПАО)	044525411	40702810128470003667	30101810145250000411	\N	buhgalter@class-clinic.ru	Ермолаев Антон Владимирович\n89521142951	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.501	\N
cmnnlv6r50018tjognt2a7xsc	cltenantdefault0000000000	Анже	ул. Корпусная, д.3	t	anzheclinic@gmail.com\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «АНЖЕ» ООО бум.доки Сверка 2р/мес	197110, г. Санкт-Петербург,	7813630033	781301001	1197847012802	\N	044525411	40702810717130003635	30101810145250000411	\N	august_66@mail.ru	\N	f	\N	f	2412-002\n03.12.24	f	OOO	\N	\N	2026-04-06 19:50:52.914	\N
cmnnn6ict008ptj80hp0dj5ma	cltenantdefault0000000000	Анле Дент	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:40.781	\N
cmnnlv6rt001ctjogjyaipqay	cltenantdefault0000000000	Анле-Дент	ул. Варшавская, д.6, к.2	t	Работаем от юр. лица: ИП Соколов	ООО «ГлавСтом» ИП БУМ.Д.	196105, г. Санкт-Петербург,	7810734852	781001001	1187847202949	ПАО СБЕРБАНК	044030653	40702810755000019306	30101810500000000653	\N	glavstomspb@yandex.ru	Генеральный директор Рыжова Екатерина Юрьевна	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:52.937	\N
cmnnlv6rp001btjogrn8xmduu	cltenantdefault0000000000	Анле-Дент ОЗЕРНОЙ	Лиговский пр., д.3/9	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Озерной» ООО бум.доки ДОГОВОР НЕДЕЙСТВИТЕЛЕН	191014,Санкт-Петербург,	7842387471	784201001	1089847235345	К/счет 30101810100000000778	044030778	40702810593700000718	30101810100000000778	\N	ozernoyd9@yandex.ru	\N	f	\N	f	2406-021 от 26.06.24	f	OOO	\N	\N	2026-04-06 19:50:52.933	\N
cmnnlv6s7001ftjogypnbdmej	cltenantdefault0000000000	АпСмайл /UpSmile	5-й Предпортовый пр-д, д. 2	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «ПРОСМАЙЛ» ООО бум.доки	196240, г. Санкт-Петербург,	7810920070	781001001	1217800083709	ФИЛИАЛ «ЦЕНТРАЛЬНЫЙ» БАНКА	044525411	40702810126600000047	30101810145250000411	\N	info@upsmile.ru, ilya.gamovdoc@yandex.ru	\N	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:52.952	\N
cmnokku800033tj50a3b49n5y	cltenantdefault0000000000	Аптекарская наб.	д. 8", "Мезон	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.672	\N
cmnnlv6sc001gtjoghhva1t4v	cltenantdefault0000000000	Аркадия - VIP	Невский пр., д. 22-24	f	Работаем от юр. лица: ИП Соколов	ООО «Медика» ИП бум.доки	199226, Санкт-Петербург,	7840014160	780101001	1047839011010	УРАЛСИБ» в г.Санкт-Петербург	044030706	\N	30101810800000000706	\N	arkstoma@yandex.ru	\N	f	\N	f	2401-031 от 20.03.24 выслан с курьером	f	IP	\N	\N	2026-04-06 19:50:52.956	\N
cmnnlv9eu00gytjog5a4080vi	cltenantdefault0000000000	Аркадия мед	Невский 22-24, 4 этаж	t	Девятова Любовь\nДиректор по работе с клиентами ООО "Медика"\n(Сеть клиник Аркадия)\nСпб, Невский пр., д.22-24\nмоб.тел. 8-921-870-88-95\nраб.тел. 8-812-571-63-60	ООО «Аркадия Мед» ООО	197082, Санкт-Петербург г, Шуваловский	7814715191	781401001	1177847398112	ФИЛИАЛ "САНКТ-ПЕТЕРБУРГСКИЙ" АО "АЛЬФА-БАНК"	044030786	40702810632470001149	30101810600000000786	\N	arkstoma@yandex.ru	Голант Виктория Владимировна	f	\N	t	\N	f	\N	\N	\N	2026-04-06 19:50:56.358	\N
cmnnn6dkd0018tj80me6kz8gd	cltenantdefault0000000000	Арс дентал	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:34.574	\N
cmnnlv95n00fctjogtfqhjl5k	cltenantdefault0000000000	Арт Дент ()	Лесколово, ул. Зеленая д.60В, 2 этаж	t	8 (981) 127-27-27 / 8 (931) 359-33-90 ,\nwww. stomli.com / stomliliya@mail.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: stom.89657773900@gmail.com	ООО «Лилия» ООО ЭДО НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	188668, Ленинградская обл., м.р-н Всеволожский ,	4703107971	470301001	1084703006354	ООО «Банк Точка»	044525104	40702810320000137351	30101810745374525104	\N	stom.89657773900@gmail.com	Каева Лилия Аавовна\n+7 (965) 777-39-00	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:56.028	\N
cmnnlv95y00fetjogbo82ml7f	cltenantdefault0000000000	Арт Дент (ул.Ленсовета)	ул.  Ленсовета, д. 90, пом.4Н, лит. А	t	тел. 382 88 58;    \nе-mail: stom@art-dent.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: stom@art-dent.ru	ООО «Арт Дент» ООО ЭДО	196158, г. Санкт-Петербург, улица  Ленсовета, д. 90, пом.4Н, лит. А	7810173149	781001001	1027804878155	СЕВЕРО-ЗАПАДНЫЙ БАНК ПАО СБЕРБАНК	044030653	40702810555000065372	30101810500000000653	\N	stom@art-dent.ru	Генеральный директор - Сунгеев Руслан Рашидович\n\n+7 921 561-61-87 (ватсап)\n\n___________\nИнф.от Алины 06.02.26  \nномер и почта гендира\nras8366@yandex.ru\n+79215600925	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:56.039	\N
cmnnlv6sl001itjogfydyvklk	cltenantdefault0000000000	Арт Дентал	пр. Просвещения, д. 33 к. 2	t	artdental.su@gmail.com\n\n+7 (812) 296-09-94\n+7 (921) 891-37-76\n\nВыслать прайс и договор со счетом\n\nРаботаем от юр. лица: ИП Соколов	ООО «АРТДЕНТАЛ» ИП бум.доки	194295, г. Санкт-Петербург,	7802466818	780201001	1097847096104	\N	044525411	40702810427360000798	30101810145250000411	\N	katena_mishka@mail.ru	Генеральный директор\nПьюдик Александр Борисович	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:52.966	\N
cmnokkt940017tj50ytr6cmp4	cltenantdefault0000000000	Арт Класс	Ланское ш., д. 65	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.416	\N
cmnnlv6sz001ktjoga1rxqvgz	cltenantdefault0000000000	Арт Класс (сделать новый договор!)	Ланское ш., д. 65	t	mail@ak-stom.ru\n88124929000-админы\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «АРТ Класс» СК» ООО-бум.д. НУЖЕН НОВЫЙ ДОГОВОР	Российская Федерация,	7814470777	781401001	1107847187030	\N	044525974	40702810810000225929	30101810145250000974	\N	mail@ak-stom.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:52.979	\N
cmnnlv6t4001ltjogdnz245cn	cltenantdefault0000000000	Артес	Малый пр. В.О., д. 4	f	клиника не активна, не поступают заказы	ООО «»\nИНН	Р/с	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:52.984	\N
cmnnlv95c00fatjogskhek8on	cltenantdefault0000000000	Ас-Медик	Димитрова, 12, к.1	t	Старшая м/с \nПолина Кузнецова, +79523641417\n polinakyznetsova1199@mail.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: asmedicdimitrova@mail.ru	ООО «МЕДИН» ООО ЭДО	192239, город Санкт-Петербург, ул Димитрова, д. 12 к. 1 литера А, помещ. 3-н	7816746935	781601001	1247800002120	ПАО СБЕРБАНК	044030653	40702810355000135965	30101810500000000653	\N	polinakyznetsova1199@mail.ru	Генеральный директор Кысса Михаил Михайлович, \n89062422224	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:56.017	\N
cmnnlv6t8001mtjogkr06heje	cltenantdefault0000000000	Асгард	ул. Оптиков д. 51 к. 1	t	8(911)9773003\nasgardmed@yandex.ru\n\n\nlekar12@mail.ru\nЗубова Кетеван Нугзаровна — направлен договор\n\nlardar@mail.ru (дублировать счета)\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: lekar12@mail.ru	ООО «Асгард Мед»	197082, г. Санкт-Петербург,	7814595864	781401001	1137847484774	Санкт-Петербург»	044030790	40702810390430000102	\N	\N	asgardmed@yandex.ru\n\nlardar@mail.ru	\N	t	MONTHLY_1	t	2405-016 от 28.05.2024	t	OOO	\N	\N	2026-04-06 19:50:52.988	\N
cmnnlv6tz001qtjog4859wx4u	cltenantdefault0000000000	Асклепиус	Комендантский пр., д.21 к.1	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Асклепиус» ООО бум.доки	197372, г. Санкт-Петербург,	7814327520	781401001	1057812547924	"САНКТ-ПЕТЕРБУРГ"	\N	\N	\N	\N	6524924@mail.ru	\N	f	\N	f	2406-023 от 28.06.24	f	OOO	\N	\N	2026-04-06 19:50:53.016	\N
cmnnlv97000fktjogvi4hqyzr	cltenantdefault0000000000	Ассоциация стоматологов	Туристская ул., 30, корп. 1	t	8(921) 902-04-02, (812) 407-16-09\n\n\nдоки в бум.виде! счет, упд и договор!\nпочта для договора astomspb@bk.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: alena8003@yandex.ru\nastomspb@bk.ru	ООО «СТОМАСС» БУМ.ДОКИ	197082, Санкт-Петербург, ул. Туристская, д. 30 к. 1, пом. 26Н	7814734476	781401001	1187847195689	Санкт-Петербургский филиал АО «Альфа-банк»	044030786	40702810632470001424	30101810600000000786	\N	alena8003@yandex.ru	Ямов Леонид Владимирович	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.076	\N
cmnnlv97d00fmtjogaztpldmz	cltenantdefault0000000000	Ассоциация стоматологов	ул. Ильюшина д.2, лит. А	t	8(921) 902-04-02, (812) 407-16-09\n\nпочта для договора astomspb@bk.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: astomspb@bk.ru\nalena8003@yandex.ru	ООО «Ассоциация стоматологов Санкт-Петербурга » БУМ.ДОКИ	197372, Санкт-Петербург, ул. Ильюшина д.2, лит. А, пом.18-Н	7839455530	781401001	1117847645640	Санкт-Петербургский филиал АО «Альфа-банк»	044030786	40702810332470000107	30101810600000000786	\N	alena8003@yandex.ru	Ямов Леонид Владимирович	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.09	\N
cmnnlv6u4001rtjogc7b5h1ud	cltenantdefault0000000000	Астра	наб. реки Мойки д.51	f	клиника не активна, не поступают заказы\n\n\nMoika@astraclinic.ru	ООО «АСТРА»	191186, г. Санкт-Петербург,	7825413139	784101001	1037843067844	\N	044030704	\N	\N	\N	elena0903@list.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.02	\N
cmnnn6ec00032tj80gb63mbf4	cltenantdefault0000000000	Астра	\N	t	Также в исходной строке было название: Асгард	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:35.569	\N
cmnokksso000ftj50wwy1fwqn	cltenantdefault0000000000	Астра, Асгард	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:34.824	\N
cmnokksgf0003tj50so8di8ve	cltenantdefault0000000000	Атрибьют Кидс	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:34.383	\N
cmnnn6gyl0072tj80k3fovvph	cltenantdefault0000000000	Атрибьют Клиник	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:38.973	\N
cmnokktkk001xtj50rzxsctd1	cltenantdefault0000000000	Атрибьют Клиник /	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.829	\N
cmnnlv6uj001utjogotf4ncro	cltenantdefault0000000000	Атрибьют Клиник / Atribeaute Clinique	Новочеркасский пр., д. 33, к. 3	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «РЕМИ» ООО сверка ЭДО	195112, г. Санкт-Петербург,	7806419569	780601001	1097847299043	ПАО СБЕРБАНК	\N	\N	\N	\N	a.litvinov@centrstomatologii.ru	\N	t	\N	t	2405-004 от 01.06.24\n\nПодписан 04.06.24	t	OOO	\N	\N	2026-04-06 19:50:53.036	\N
cmnnn6gme006qtj80vwfd21wn	cltenantdefault0000000000	Атрибьют Клиник ОП	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:38.534	\N
cmnokktga001mtj50e5116tfd	cltenantdefault0000000000	Атрибьют Клиник ОП /	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.675	\N
cmnnlv6uo001vtjogxi0a6tii	cltenantdefault0000000000	Атрибьют Клиник ОП / Atribeaute Clinique	Чкаловский пр., д. 50	t	Работаем от юр. лица: ООО КЛИКЛаб	ОП ООО «РЕМИ» ООО сверка ЭДО	195112, г. Санкт-Петербург,	7806419569	781345001	1097847299043	ПАО СБЕРБАНК г. Санкт-Петербург	044030653	\N	\N	\N	a.litvinov@centrstomatologii.ru	\N	t	\N	t	2405-004-01 от 01.06.24\n\nПодписан 04.06.24 ЭДО	t	OOO	\N	\N	2026-04-06 19:50:53.041	\N
cmnnlv9ek00gwtjoghf43pos0	cltenantdefault0000000000	Афина	Выборг, Ленинградское ш., 59	t	Баратов Василий Мерабович\nТелефон        +7(905)-326-50-69\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: Afina.stom@mail.ru	ООО «Афина» ООО Бум.Доки!	188800, РОССИЯ, ЛЕНИНГРАДСКАЯ ОБЛАСТЬ, Р-Н	4704103722	470401001	1184704006970	АО «ТБанк»	044525974	40702810010000789281	30101810145250000974	\N	Afina.stom@mail.ru	Баратов Василий Мерабович\nТелефон\t+7(905)-326-50-69	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.349	\N
cmnnlv70t002ttjog3447hcz8	cltenantdefault0000000000	Ви-Дент 1	ГП им. Морозова, ул. Первомайская д. 11	f	не активны с сентября 23г	ООО «ВИ-Дент №1» НЕТ ДОГОВОРА	188679, Ленинградская обл.,	4703124046	470301001	1114703005262	\N	044030920	40702810406000079476	30101810000000000920	\N	в тг Ирина Владимировна Басалаева \n+7 921 775 50 83\nнапоминать в вотсапе	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.261	\N
cmnnlv6us001wtjogs78nkgks	cltenantdefault0000000000	Аэлита	Киевская ул., д.6	t	счета отправлять в бум.виде\n\nРаботаем от юр. лица: ИП Соколов	ООО «Аэлита-дент» ИП бум.доки	196084, г. Санкт-Петербург,	7810536410	781001001	1089848036948	ОАО «Сбербанк России» г. Санкт-Петербург	044030653	\N	30101810500000000653	\N	mail@aelita-dent.ru	Генеральный директор \nВанчугин Сергей Иванович.	f	\N	t	ИП2502-011\t25.02.2025	t	IP	\N	\N	2026-04-06 19:50:53.045	\N
cmnokkt33000qtj50ne3yk23f	cltenantdefault0000000000	Б.Сампсониевский пр.	д. 38-40", Частное лицо	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.2	\N
cmnnlv6v5001ytjogbqynk06g	cltenantdefault0000000000	Балтийская Стоматология	ул. Катерников, д. 5 к. 2	t	WhatsApp: +7 (931) 965-38-52\ninfo@balt-stoma.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: vizage3857755@mail.ru\ninfo@balt-stoma.ru	ООО «БАЛТИЙСКАЯ СТОМАТОЛОГИЯ» ООО ЭДО	198206 г. Санкт-Петербург,	7807130924	780701001	1167847294526	ООО «Банк Точка»	044525104	40702810820000093966	30101810745374525104	\N	vizage3857755@mail.ru	генеральный директор Чурилина Юлия Олеговна	f	\N	t	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:53.058	\N
cmnnlv6va001ztjog6zpwmg1w	cltenantdefault0000000000	Балтмед / BALTMED	Выборгское ш., д. 40	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Медицинские услуги» ООО ЭДО	194356, Санкт-Петербург г,	7802276038	780201001	1157847071260	\N	044525411	40702810227360006358	30101810145250000411	\N	rg@baltclinic.ru	\N	f	\N	t	2411-014 от 19.11.24	t	OOO	\N	\N	2026-04-06 19:50:53.062	\N
cmnnlv6ve0020tjogwjlarmej	cltenantdefault0000000000	Белая Медведица	Выборгское ш., д. 23 к. 2\n26-я линия В.О., д. 15/2	t	mail@wbdent.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: office@wbdent.ru	ООО «Белая Медведица»	194355, г. Санкт-Петербург,	7801251224	780201001	1037800123822	Точка»	044525104	40702810120000127257	30101810745374525104	\N	admin@wbdent.ru	Управляющий — ИП Федотов Никита Александрович\noffice@wbdent.ru	f	\N	t	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:53.066	\N
cmnnn6di70011tj808fqh3am5	cltenantdefault0000000000	Белая медведица	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:34.496	\N
cmnnlv6wk0025tjogcce3o83q	cltenantdefault0000000000	Белозуб Клиник	ул. Катерников, д. 7	t	8 (921) 945-01-35 админы\n8 (921) 945-70-00\n\nРаботаем от юр. лица: ИП Соколов	ООО «Белозуб Клиник» ООО ЭДО	198322, г. Санкт-Петербург,	7807240540	\N	\N	\N	044030786	\N	30101810600000000786	\N	Belozubclinic@mail.ru	Генеральный директор\nБелозуб Елена Анатольевна	f	\N	t	\N	f	IP	\N	\N	2026-04-06 19:50:53.109	\N
cmnokkskn0007tj5034wruvel	cltenantdefault0000000000	Белый Слон	Малый пр. В.О. д. 63/14	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:34.535	\N
cmnnlv9ci00ghtjogq3pp0emp	cltenantdefault0000000000	Бережная стоматология	г.Санкт-Петербург, Большой Сампсониевский проспект, д.19	t	E-mail для договора/прайса: info@Bstom.ru	ООО «Бережная стоматология»	194044 г.Санкт-Петербург, Большой Сампсониевский проспект, д.19 лит.Б пом. 1Н	7825062956	780201001	1037843029366	Дополнительный офис «Энергия»  в ПАО  «БАНК «САНКТ-ПЕТЕРБУРГ»	044030790	40702810690180000097	30101810900000000790	\N	info@Bstom.ru	Малько Михаил Павлович 945-43-80	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.274	\N
cmnnlv6xk0029tjogygvb46b8	cltenantdefault0000000000	Благо	ул.Адмирала Коновалова 2-4	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «ИНДЕНТИУМ» ООО бум.доки	Российская Федерация, 198206, САНКТ-ПЕТЕРБУРГ Г,	7807238759	780701001	1207800022836	ООО "Банк Точка"	044525104	40702810420000124617	30101810745374525104	\N	blagoclinicspb@gmail.com	\N	f	\N	t	2407-010 \n31.07.24	f	OOO	\N	\N	2026-04-06 19:50:53.145	\N
cmnnn6fmc005ktj80u7ci1ao8	cltenantdefault0000000000	Благо	ул.Адмирала Коновалова 2-4	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:37.237	\N
cmnnlv6yd002dtjogcrh12xqk	cltenantdefault0000000000	Благодатная 47	ул. Благодатная, д. 47	t	https://blago47.ru/\nТелефон  386-59-56\n\nПн. - Сб.:  10.00 - 20.00\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: Avm-stoma@mail.ru	ООО «АВМ» ООО бум.доки	198332, г. Санкт-Петербург,	7807206570	780701001	1187847186548	Филиал «Санкт –Петербургский»	044030786	40702810332250002189	30101810600000000786	\N	Avm-stoma@mail.ru	Генеральный директор        Романов Андрей Сергеевич\n+7 921 908 88 18	f	\N	t	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:53.173	\N
cmnnlv96200fftjog4ghc28y6	cltenantdefault0000000000	Бланко	Среднерогатская ул., 13, корп. 1	t	dentalblanko@mail.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: dentalblanko@mail.ru	ООО «СТОМАТОЛОГИЯ БЛАНКО» ООО ЭДО	196158, Россия,	7810959856	781001001	1227800159355	В АО «ТИНЬКОФФ БАНК»	044525974	40702810310001252365	30101810145250000974	\N	dentalblanko@mail.ru	Ген.директор \nКурбанов Шамиль Тагирович	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:56.042	\N
cmnokktfq001ktj50akxpcf0v	cltenantdefault0000000000	Большеохтинский пр.	д.10", "ДентаЛаб / Dentalab	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.655	\N
cmnokkt5j000wtj50krgs630u	cltenantdefault0000000000	Большой Казачий пер., 13/	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.288	\N
cmnokkt7r0014tj50k761ji9n	cltenantdefault0000000000	Будапештская ул.	д. 87 к. 3	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.368	\N
cmnnlv6yv002gtjog51k9ii31	cltenantdefault0000000000	Бьюти Ортошик/Beauty Orthoshik	наб. Реки Смоленки, д. 3 к. 1	f	Работаем от юр. лица: ИП Соколов	ООО «БЬЮТИ ОРТО ШИК»	199155, г. Санкт-Петербург,	7801699464	\N	1217800076471	\N	044030786	40702810932430001889	30101810600000000786	\N	shonina.yulya@yandex.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:53.192	\N
cmnnlv6zx002ntjogs7yb7p81	cltenantdefault0000000000	ВВДент / VVDent	ул. Заставская, д. 46 к. 1	t	Работаем от юр. лица: ИП Соколов	ООО «ВВ Дент» ИП бум.доки НЕТ ДОГОВОРА!	196006, г. Санкт-Петербург, вн.тер.г.	7810747139	781001001	1197847002803	\N	044030786	\N	30101810600000000786	\N	info@vv-dent.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:53.229	\N
cmnnlv8z500e3tjogk7lsnc19	cltenantdefault0000000000	Частное лицо Гамаонова	\N	t	Работаем от юр. лица: Перевод	Всегда на частное запускаем в работу сразу. Счет выставить после согласования не запускать в производство без оплаты	Р/с	\N	\N	\N	К/с	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:55.793	\N
cmnnlv95100f8tjogg91u035s	cltenantdefault0000000000	ВДент/WDent	пр.Медиков, д.10	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: hello@wclinic.pro	ООО «Состояние здоровья» ООО ЭДО	195299, г.Санкт-Петербург, пр.Просвещения, д.99, лит. А, оф.975	7804590151	780401001	1177847059345	«АО ТИНЬКОФФ БАНК»	044525974	40702810010000924376	30101810145250000974	\N	hello@wclinic.pro	Бурмакин Евгений Сергеевич	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:56.005	\N
cmnnlv71a002wtjoghji8s3nh	cltenantdefault0000000000	ВИ-Дент №2 пгт им. Свердлова, , 3 а	188683, Ленинградская область, Всеволожский район, поселок городского типа им Свердлова, Западный проезд, 3 а.	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «ВИ-Дент № 2» ООО ЭДО НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	188683, Ленинградская обл.,	4703134816	470301001	1134703003313	\N	044525411	40702810432260000113	30101810145250000411	\N	nir-olga@yandex.ru\n9045585430@mail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.279	\N
cmnnlv72c0033tjogocn8jrml	cltenantdefault0000000000	ВС Клиник / VS Клик Московская обл.	г. Кубинка, г-к Кубинка-8, д. 15	f	клиника не активна, не поступают заказы	ООО «ВС-Клиник»	143070, Московская обл., Одинцовский г.о.,	5032319110	503201001	1205000053720	\N	\N	\N	\N	\N	vs-clinic@yandex.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.316	\N
cmnnlv6z4002itjogzymym870	cltenantdefault0000000000	Вайт	ул.Нахимова, д.7, к. 2	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: w-dent@yandex.ru	ООО «Вайт Дент» ООО ТОЛЬКО БУМ.ДОКИ!!!	197371, Санкт-Петербург,	7814155207	781401001	1047823008562	\N	044030786	40702810632000015152	30101810600000000786	\N	w-dent@yandex.ru	Генеральный директор        \nМоисейчиков Андрей Евгеньевич\n\n+7 (906) 262-26-32	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.2	\N
cmnnlv6yz002htjogsz2twydz	cltenantdefault0000000000	Вайт Вейв / White Wave	Орловский пер., д. 1/4	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: info@wwstom.ru	ООО «Пульс-сервис» ООО сверка ЭДО	191036, г. Cанкт-Петербург,	7815023490	784201001	1027809223650	\N	044030704	40702810828000000577	30101810200000000704	\N	info@wwstom.ru	Генеральный директор Крячков Дмитрий Юрьевич	f	\N	t	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:53.196	\N
cmnnlv6zh002ktjog9ce9j5m6	cltenantdefault0000000000	Вайт Дэнт / White Dent , , д. 10	п. Парголово\nул. Заречная, д. 10	t	whitedent-spb@mail.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Вайт Дэнт» ООО БУМ ДОКИ!!! напр.договор в нов.редакции	194356 г.Санкт-Петербург,	7802703716	780201001	1207800024420	СЕВЕРО-ЗАПАДНЫЙ БАНК ПАО СБЕРБАНК	044030653	40702810355000007242	30101810500000000653	\N	whitedent-spb@mail.ru	Куторова Яна Александровна\n\n8 921 090 21 80	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.213	\N
cmnnlv94x00f7tjogrt1est8g	cltenantdefault0000000000	ВайтЛаб/Whitelab	ул.Тореза, 118	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: info@whitelab.dental	ООО «Вайтлаб» ООО БУМ.ДОКИ!	199004, г.Санкт-Петербург, Кадетская линия В.О., д.11, лит.А, кв.1	7801723910	780101001	1237800064105	\N	044525974	40702810610001409355	30101810145250000974	\N	info@whitelab.dental	Генеральный директор Стрелков Антон Михайлович\n89992219901	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.001	\N
cmnnlv9ii00hqtjoghdhtj9i3	cltenantdefault0000000000	ВалаАМ	пр. Ветеранов 122	t	тел.777-01-23\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «ВалаАМ юг»	198205, город Санкт-Петербург, пр-кт Ветеранов, д.122 литер а, помещение 100 н	7807345197	780701001	1097847241470	Северо-западный Банк ПАО «Сбербанк» г. Санкт-Петербург	044030653	40702810255240001111	30101810500000000653	\N	V122@valaam-med.ru	Мешалкин Павел Сергеевич	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.49	\N
cmnnlv6zl002ltjog5qt6pb8q	cltenantdefault0000000000	Ваш стоматолог	ул. Гжатская, д. 22, к. 1	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Клиника «Ваш стоматолог» ООО ЭДО НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	195220, г. Санкт-Петербург,	7804313510	780401001	1057810145029	\N	044030786	40702810932440001455	30101810600000000786	\N	vashstom@yandex.ru	Генеральный директор \nН.А. Шехмаметьев	f	\N	t	2412-003 12.12.24	t	OOO	\N	\N	2026-04-06 19:50:53.217	\N
cmnnn6h4x007btj80oi1vs23n	cltenantdefault0000000000	Веда	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:39.201	\N
cmnnlv709002ptjogwy5yjdzh	cltenantdefault0000000000	Веда ПРЕДОПЛАТА п. Шушары	Первомайская ул., д. 26	t	info@cl-veda.ru (до 09.12.24 отправляли на эту почту)\n\nРаботаем от юр. лица: ИП Соколов	ООО «Веда» ИП-бум.д	196626, г. Санкт-Петербург,	7820331394	782001001	1137847043443	АО «Тинькофф Банк»	044525974	40702810110000753609	\N	\N	emelyanova@cl-veda.ru	\N	f	\N	f	2401-043	f	IP	\N	\N	2026-04-06 19:50:53.242	\N
cmnnlv70l002rtjogyrjel3vm	cltenantdefault0000000000	Вектор Стом	Вектор Стом\nул. Ленинградская, д. 9/8	t	616-16-55\n\nhttps://www.vector-stom.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Вектор-Стом» ООО ЭДО	188691, Ленинградская обл.,	4703148294	470301001	1174704000613	ПАО СБЕРБАНК	044030653	40702810155000006427	\N	\N	vectorstom2017@gmail.com	\N	f	\N	f	2406-013 от 13.06.24	f	OOO	\N	\N	2026-04-06 19:50:53.253	\N
cmnnlv8zu00e7tjogmki3ho1s	cltenantdefault0000000000	Велум / Velum	ул. Кораблестроителей, д.16, к.2	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Парус» ООО бум.доки	199226, Санкт-Петербург,	7801565580	780101001	1127847049813	ФИЛИАЛ «САНКТ-ПЕТЕРБУРГСКИЙ»	044030786	40702810332510001833	30101810600000000786	\N	velumstom@gmail.com	Генеральный директор        Гульчук А.А.	f	\N	t	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:55.818	\N
cmnnlv70p002stjogoqoeo6mg	cltenantdefault0000000000	Венеция Дент	пр. Королёва, д. 65	t	veneziadentalclinic@gmail.com\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: veneziadentalclinic@gmail.com	ООО «Венеция Дент» ООО ЭДО+бум.доки	197350, г. Санкт-Петербург,	7814535093	781401001	1127847240542	ПАО СБЕРБАНК	\N	\N	\N	\N	vylyuba@mail.ru	\N	f	\N	t	ДС №1 от 09.01.25 до 30.06.25\n\n2405-017 от 28.05.2024\n\nПодписан ЭДО 30.05.24	f	OOO	\N	\N	2026-04-06 19:50:53.258	\N
cmnokkt780013tj50uxy3avrm	cltenantdefault0000000000	ул. Крупской	д. 82/2	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.349	\N
cmnnlv71t002ztjogk99z3jwh	cltenantdefault0000000000	Виру /VIRU	ул. Ропшинская, д. 24	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «АЙСКЛИНИК» ООО ЭДО	197110, г. Санкт-Петербург,	7813295280	781301001	1177847394306	\N	044525974	40702810110000252087	30101810145250000974	\N	Viru.clinic@gmail.com	ген. дир.\nВойнилко Екатерины Андреевна\n\nВойнилко Е.А.\nviru.clinic@gmail.com	f	\N	t	2406-025 от 28.06.24\n2406-025 Д.с№1        18.12.24	t	OOO	\N	\N	2026-04-06 19:50:53.297	\N
cmnokkt9k0018tj50tgh831kq	cltenantdefault0000000000	Виру Ван	Комендантский пр., д.11	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.433	\N
cmnnlv9g200h6tjogfazk4myr	cltenantdefault0000000000	Витаника	Звездная д. 8	t	\N	ООО «Витаника»	192131, Санкт-Петербург,	7816387524	781101001	1069847285122	ПАО СБЕРБАНК г.Санкт-Петербург	044030653	40702810655130005238	\N	\N	Ses32@mail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.402	\N
cmnnlv9hs00hjtjog8wjymm10	cltenantdefault0000000000	Витаника	Малая Бухарестская ул., 2	t	\N	ООО «Витаника»	192131, Санкт-Петербург,	7816387524	781101001	1069847285122	ПАО СБЕРБАНК г.Санкт-Петербург	044030653	40702810655130005238	\N	\N	Ses32@mail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.464	\N
cmnnlv7270032tjog0lknwk9i	cltenantdefault0000000000	Витаника Кудрово, ул. Столичная д.4, к.4	Кудрово, Столичная 4, к 4	f	Работаем от юр. лица: ИП Соколов	ООО «Витаника»	192131, Санкт-Петербург,	7816387524	781101001	1069847285122	ПАО СБЕРБАНК г.Санкт-Петербург	044030653	40702810655130005238	\N	\N	vitanika@inbox.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:53.312	\N
cmnnlv94t00f6tjogky1vf39s	cltenantdefault0000000000	Все свои	Хабаровск, ул. им.Лейтенанта Орлова С.В., д.2	t	(4212)24-47-97\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: 244797stom@mail.ru	ООО «ХЗТЛ» ООО ЭДО	680013, г.Хабаровск, ул. им. Лейтенанта Орлова С.В., д.2, пом.1/1	2721127818	272101001	1052740165895	ПАО "Сбербанк"	040813608	40702810370000024815	30101810600000000608	\N	244797stom@mail.ru	Директор Карноухова Анастасия Васильевна	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.997	\N
cmnokkt0g000jtj50vdzhdetv	cltenantdefault0000000000	Выборгское ш.	д. 23 к. 2	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.104	\N
cmnnlv9gn00hbtjog2z5osnr7	cltenantdefault0000000000	Галактика	Пироговская наб., 5/2	t	8-812-403-02-03\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: zatonova@edmed.ru\n\nТакже в исходной строке было название: 5/2	ООО «Арктур» ООО ЭДО	194044, ГОРОД САНКТ-ПЕТЕРБУРГ, НАБЕРЕЖНАЯ ПИРОГОВСКАЯ, ДОМ 5/2,	7814706567	780201001	1177847323147	Дополнительный офис «Лесной» ПАО «Банк «Санкт-Петербург»,	044030790	40702810990200001702	30101810900000000790	\N	zatonova@edmed.ru	Юнг Наталия Александровна\n8-812-403-02-03	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.423	\N
cmnnlv98400fqtjogjgs72rtv	cltenantdefault0000000000	Гента	Петергофское шоссе  д.57	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: Gentaclinic@mail.ru	ООО «ГЕНТА» напр.договор в нов.редакции	198322, Россия, г. Санкт-Петербург, ш. Петергофское, д. 57, литера А, помещ., 52-Н	7807272485	780701001	1247800009819	АО "ТИНЬКОФФ БАНК"	044525974	40702810210001558224	30101810145250000974	\N	gentaclinic@mail.ru	Ген директор Бабич Дмитрий Валерьевич	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.117	\N
cmnnlv72g0034tjogzqapixp9	cltenantdefault0000000000	Гионикс / Gionix	ул. Пулковская, д.8, к.1	f	клиника не активна, не поступают заказы	ООО«ГИОНИКС»	196142, г.Санкт-Петербург,	7810766332	781001001	1137847424967	"ФК Открытие"	044030795	40702810106180000751	30101810540300000795	\N	stmed@gionix.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.32	\N
cmnnlv72k0035tjog7jye4v0z	cltenantdefault0000000000	Голливуд	ул. В. Вишневского, д. 7	f	\N	ООО «Голливуд Смайл»\nИНН 7813 1994 66	197136, Г.Санкт-Петербург,	\N	\N	\N	\N	\N	\N	\N	\N	79112504900@yandex.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.324	\N
cmnokksn5000atj50lehwbua1	cltenantdefault0000000000	Гражданский пр.	д. 45 к. 1	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:34.626	\N
cmnnlv99v00g0tjogntfp1ykf	cltenantdefault0000000000	ГрандДент	Пр. Энгельса, д.154, лит А	t	\N	ООО «Гранддент » НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	194358, г. Санкт-Петербург, пр. Энгельса, д. 154, литера А, помещение 15Н №3	7802613251	780201001	1177847073865	СЕВЕРО-ЗАПАДНЫЙ БАНК ПАО СБЕРБАНК	044030653	40702810155000044764	30101810500000000653	\N	t.petrova@granddent.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.179	\N
cmnnlv72o0036tjog5cqrpyyd	cltenantdefault0000000000	Грин Стом	пр.Большевиков д.47	t	Работаем от юр. лица: ИП Соколов	ООО«Ленстом» ИП-бум.д.	193315,г.Санкт-Петербург,	7811541557	781101001	1137847033940	"ФК ОТКРЫТИЕ"	044030795	40702810203180000489	30101810540300000795	\N	info@greenstom.spb.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:53.328	\N
cmnnlv7d7004ytjogyiuqrvbv	cltenantdefault0000000000	ДМ	ул. 2-я Жерновская, д.28	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «ДМ Стоматологический центр» ООО ЭДО НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	195043, г. Санкт-петербург,	7806414602	780601001	1097847208260	\N	044030920	40702810806000062643	30101810000000000920	\N	dmstom@list.ru	\N	f	\N	t	2501-007\t14.01.25	t	OOO	\N	\N	2026-04-06 19:50:53.707	\N
cmnnlv7ee0058tjog7cyyssun	cltenantdefault0000000000	ДС Гражданский	Гражданский пр., д.24	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «ДС» НЕОБХОДИМ НОВЫЙ ДОГОВОР!!!	196006, г. Санкт-Петербург,	7810460577	781001001	1137847176631	Санкт-Петербург»	044030790	\N	\N	\N	orlova.m@ds-spb.com	\N	f	\N	t	2409-014 от 05.09.24	f	OOO	\N	\N	2026-04-06 19:50:53.751	\N
cmnnlv7ei0059tjogk1ay6aj9	cltenantdefault0000000000	ДС Дунайский	Дунайский пр., д. 55, к. 1	t	dun55@ds-spb.com-бухгалтерия\n \nобщий телефон \n8-812-607-17-17\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «ДС» НЕОБХОДИМ НОВЫЙ ДОГОВОР!!!	196006, г. Санкт-Петербург,	7810460577	781001001	1137847176631	Санкт-Петербург»	044030790	\N	\N	\N	dun55@ds-spb.com	\N	f	\N	t	2409-014 от 05.09.24	f	OOO	\N	\N	2026-04-06 19:50:53.755	\N
cmnnn6hkm007ttj80rxmgpu7d	cltenantdefault0000000000	ДС Коллонтай	ул. Коллонтай, д. 31, к. 2а	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	t	2409-014 от 05.09.24	f	OOO	\N	\N	2026-04-06 20:27:39.767	\N
cmnokku870034tj5082i1ucpd	cltenantdefault0000000000	ул. Куйбышева	д. 24", "Юнион / UnionGK Dental Clinic	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.679	\N
cmnnlv7en005atjogkdz0cnzz	cltenantdefault0000000000	ДС Коллонтай (сделать новый договор на 25год на все филиалы)	ул. Коллонтай, д. 31, к. 2а	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «ДС» ООО-ЭДО НЕОБХОДИМ НОВЫЙ ДОГОВОР!!!	196006, г. Санкт-Петербург,	7810460577	781001001	1137847176631	Санкт-Петербург»	044030790	\N	\N	\N	ds-glb@indental.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.759	\N
cmnnlv7eq005btjogcfobbsk3	cltenantdefault0000000000	ДС Ленинский	Ленинский пр., д. 131	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «ДС» НЕОБХОДИМ НОВЫЙ ДОГОВОР!!!	196006, г. Санкт-Петербург,	7810460577	781001001	1137847176631	Санкт-Петербург»	044030790	\N	\N	\N	orlova.m@ds-spb.com	\N	f	\N	t	2409-014 от 05.09.24	f	OOO	\N	\N	2026-04-06 19:50:53.763	\N
cmnnlv7eu005ctjogd24dhwyq	cltenantdefault0000000000	ДС Московский	Московский пр., д. 125	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «ДС» НЕОБХОДИМ НОВЫЙ ДОГОВОР!!!	196006, г. Санкт-Петербург,	7810460577	781001001	1137847176631	Санкт-Петербург»	044030790	\N	\N	\N	orlova.m@ds-spb.com	\N	f	\N	t	2409-014 от 05.09.24	f	OOO	\N	\N	2026-04-06 19:50:53.767	\N
cmnnlv7ez005dtjogxun3nlmx	cltenantdefault0000000000	ДС Савушкина (сделать новый договор на 25год на все филиалы)	ул. Савушкина, д.140	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «ДС» НЕОБХОДИМ НОВЫЙ ДОГОВОР!!!	196006, г. Санкт-Петербург,	7810460577	781001001	1137847176631	Санкт-Петербург»	044030790	\N	\N	\N	orlova.m@ds-spb.com	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.771	\N
cmnnlv98a00frtjog9r7xoe61	cltenantdefault0000000000	Данте Малая Митрофаньевская 8к1 стр 1	улица МАЛАЯ МИТРОФАНЬЕВСКАЯ, д. Д. 8, корп./ст. К. 1 СТР. 1	t	89213077747\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: dante.stom@mail.ru	ООО «Данте»	196006, город Санкт-Петербург, Малая Митрофаньевская ул, д. 8 к. 1 стр. 1, помещ. 7н	7810991546	781001001	1237800132756	ФИЛИАЛ "САНКТ-ПЕТЕРБУРГСКИЙ" АО "АЛЬФА-БАНК"	044030786	40702810032470004225	30101810600000000786	\N	dante.stom@mail.ru	Котуа Нугзар\n89219479901	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.122	\N
cmnokktad0019tj50v9gskbou	cltenantdefault0000000000	Два Дантиста	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.462	\N
cmnnlv73v003etjogoiin7gnk	cltenantdefault0000000000	Дель-Рио	ул. Коллонтай, д. 30	t	\N	Доставка в клинику заказ на частное лицо ООО «»\nИНН	Р/с	\N	\N	\N	К/счет	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.372	\N
cmnnlv74l003itjogsqbvgm06	cltenantdefault0000000000	ДенатА	\N	f	клиника не активна, не поступают заказы	ООО «КРАСИВАЯ УЛЫБКА»	Р/с	7802627110	\N	\N	К/счет	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.397	\N
cmnnlv74q003jtjogeukk889t	cltenantdefault0000000000	Дент Деко	Дальневосточный просп., 12, корп. 2 (стр 1, помещение 93-Н)\nДальневосточный пр., 12, корп. 2	t	+7 921 953 64 64\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «ДЕНТ ДЕКО» ООО Сверка ЭДО	193318, г. Санкт-Петербург,	7811756827	781101001	1217800034561	АО «Тинькофф Банк»	044525974	40702810810001207218	30101810145250000974	\N	dentdeco@mail.ru	\N	f	\N	t	2409-015        11.09.24\n\n2409-015 ДС №1\t09.01.25	t	OOO	\N	\N	2026-04-06 19:50:53.402	\N
cmnnn6fsf005stj80dqsli9lh	cltenantdefault0000000000	Дент Деко	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:37.455	\N
cmnnlv74u003ktjogboa6cri8	cltenantdefault0000000000	Дент Крафт	Коломяжский пр., д.23 к.3	t	тел админов\n+7-921-965-71-53\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «ДЕК» ООО ЭДО НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	197341, г.Санкт-Петербург,	7814161120	781401001	1147847546098	ПАО СБЕРБАНК	044030653	40702810955080008344	30101810500000000653	\N	dentcraft@mail.ru	\N	f	\N	t	2412-006\t17.12.24	t	OOO	\N	\N	2026-04-06 19:50:53.406	\N
cmnnlv754003mtjog9wcjo0dp	cltenantdefault0000000000	Дент Сити	ул. Блохина д. 33	t	mail@dostoma.ru\n\nРаботаем от юр. лица: ИП Соколов	ООО «Стома Идеал» ИП бум.доки	197198, г. Санкт-Петербург,	7842357950	781301001	1077847376991	ПАО СБЕРБАНК	044030653	40702810155200002234	30101810500000000653	\N	D.anna@dostoma.ru	Директор \nСитников Максим Сергеевич	f	\N	f	ИП2502-009 21.02.2025	f	IP	\N	\N	2026-04-06 19:50:53.417	\N
cmnnlv75o003otjog5tcww5tg	cltenantdefault0000000000	Дент Эйр Dentaire	Выборгское ш., д. 112	t	7 (812) 650-23-24– администратор\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «М-ГРУПП» ООО ЭДО	194356, Санкт-Петербург,	7802858734	780201001	1147847149713	«САНКТ-ПЕТЕРБУРГ» Г. САНКТ-ПЕТЕРБУРГ	044030790	\N	30101810900000000790	\N	info@dentaire.ru\njustas2003@mail.ru	\N	f	\N	f	\N	f	OOO	\N	\N	2026-04-06 19:50:53.436	\N
cmnnlv9ie00hptjogp9hlpjbe	cltenantdefault0000000000	ДентАвеню	п. Парголово\nул. Валерия Гаврилина 3 корпус 1 литера А	t	Телефон\n339-69-69\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: da3396969@gmail.com	ООО «Дентавеню»	194363, п. Парголово	7802691806	780201001	1197847135133	Северо-Западный Банк ПАО Сбербанк	044030653	40702810155000055245	30101810500000000653	\N	da3396969@gmail.com	Болгов Александр Сергеевич	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.487	\N
cmnnlv9ib00hotjogou50hygb	cltenantdefault0000000000	Дента - Люкс	Тамбов, Студенецкая набережная, д 25, оф.167	t	8991-351-33-16\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: Лицо, ответственное за заключение договора (Ф.И.О.)\nКоннов Иван Сергеевич\nТелефон\n8-991-351-33-16\nE-mail для направления договора и прайса\nDenta-lux@list.ru	ООО «Стоматология «Дента-Люкс» ООО ЭДО	392000,  Тамбов, Студенецкая набережная, д 25, офис 167	6829029179	682901001	1076829000654	Тамбовское отделение 8594 ПАО Сбербанк г.Тамбов	046850649	40702810961000008256	30101810800000000649	\N	Denta-lux@list.ru	\N	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.483	\N
cmnnlv75s003ptjogtva5nzil	cltenantdefault0000000000	Дента-С	г. Екатеринбург	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Дента-С» ООО ЭДО	620062, Свердловская обл.,	6670177396	667001001	1076670018875	филиал «Екатеринбургский» «Альфа-банк»	046577964	40702810738060002223	\N	\N	denta-s@list.ru	\N	f	\N	t	2502-005\t05.02.2025	t	OOO	\N	\N	2026-04-06 19:50:53.44	\N
cmnokksu6000htj50tp1zzzc9	cltenantdefault0000000000	ул. Лизы Чайкиной	д. 4/12", "Конфиденция	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:34.879	\N
cmnnlv79b004atjogyn30hbk9	cltenantdefault0000000000	ДентаЛаб / Dentalab	ул. Гаккелевская, дом 22, корп.1	t	7-921-903-42-03\n@dentalab_spb - группа клиник\n\n8(812)602-39-40 - общий call\n\nтелефон администратора клиники +7 (812) 603-88-41\ninfo@dentalab.ru\n\nPriem@dentalab.ru\nAccounting@dentalab.ru\n\nРаботаем от юр. лица: ИП Соколов	ООО «Мастерстом» ИП бум.доки	197372, г.Санкт- Петербург,	7814449687	781401001	1097847294357	ПАО «Сбербанк»  г. Санкт-Петербург	044030653	40702810855040003573	30101810200000000704	\N	nursing@dentalab.ru	Генеральный директор Харитошина Галина Станиславовна \n+7-921-903-42-03	f	\N	t	\N	f	IP	\N	\N	2026-04-06 19:50:53.567	\N
cmnnlv75w003qtjoghblpzn96	cltenantdefault0000000000	Дентаграфия	Комендантский пр., д. 54	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Д-Графия Север» ООО ЭДО	197373, Санкт-Петербург г,	7814805864	781401001	1227800035100	ПАО СБЕРБАНКБАНКА	044030653	40702810355000078873	30101810500000000653	\N	denta.gr@mail.ru	\N	f	\N	t	2406-019 от 20.06.2024	t	OOO	\N	\N	2026-04-06 19:50:53.444	\N
cmnnlv76d003ttjogetc25y3v	cltenantdefault0000000000	Дентал	г. Пермь\nул.Екатерининская д.52 (филиал)	t	dental.perm@gmail.com\ndental.perm.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «ДЕНТАЛ» ООО ЭДО НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	614107, Пермский край, Пермский г.о., г. Пермь, ул. Веры Фигнер, д. 2, ОФИС 1	5906996326	590601001	1145958003839	ПАО Сбербанк	042202603	40702810449770013639	30101810900000000603	\N	dental.perm@gmail.com	Бузина Юлия Анатольевна	f	\N	t	2410-015        29.10.24	t	OOO	\N	\N	2026-04-06 19:50:53.462	\N
cmnnlv97n00fntjogzq962m6e	cltenantdefault0000000000	Дентал Арт	ул.Большая Пушкарская д.31	t	Комиссарова Елена Азизбековна\n+79111455262 управляющая,отвечает за договора\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: doctorbenin@mail.ru	ООО «Дентал Арт» ООО ЭДО	197198,РФ, г.Санкт-Петербург, ул.Большая Пушкарская д.31 пом.3Н лит. А	7813636892	781301001	1197847153602	"СДМ-Банк" ПАО	045525685	40702810605000002338	\N	\N	doctorbenin@mail.ru	Бенина Инна Николаевна	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.099	\N
cmnnlv778003xtjoglhezgke8	cltenantdefault0000000000	Дентал Дизайнер / Dental Designer	Каменноостровский пр., д. 56 к.2	t	Работаем от юр. лица: ИП Соколов	ООО «Клуб ортодонтов» ИП ЭДО	197022, Санкт-Петербург,	7841045980	781301001	1167847364717	ПАО Сбербанк	044030653	40702810855040009470	30101810500000000653	\N	dentaldesignerbuh@gmail.com	Генеральный директор Быкова Евгения Владимировна	f	\N	t	\N	t	IP	\N	\N	2026-04-06 19:50:53.492	\N
cmnnlv77j003ztjogsu2yh2c9	cltenantdefault0000000000	Дентал Клауд / Dental Cloud	ул.Садовая, д.38	f	клиника не активна, не поступают заказы	ООО "АР-Мед"	190031, г. Санкт-Петербург,	7838490726	783801001	1137847204131	ПАО СБЕРБАНК	044030653	\N	\N	\N	rmsps@list.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.504	\N
cmnnlv77v0041tjogbh33kjo2	cltenantdefault0000000000	Дентал Клиник	ул. Ушинского, д. 3, к. 3	f	клиника не активна, не поступают заказы с ноября 23г	ООО «Ля Дентик»	195267, г. Санкт-Петербург,	7804499463	780401001	1129847011238	К/счет 30101810500000000653	044030653	40702810055000040185	30101810500000000653	\N	dantist-2401@mail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.515	\N
cmnnlv77z0042tjogivm9glqa	cltenantdefault0000000000	Дентал Конфидэнс	ул. Бармалеева, д.12	t	8 (812) 614-11-96\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Дэнтал Конфидэнс» ООО ЭДО	197136, г.Санкт-Петербург,	7813647750	781301001	1207800129283	ООО БАНК ОРАНЖЕВЫЙ, Г. САНКТ-ПЕТЕРБУРГ	044030904	40702810000000010271	30101810000000000904	\N	pavelkinovich@gmail.com	\N	f	\N	f	\N	f	OOO	\N	\N	2026-04-06 19:50:53.519	\N
cmnnlv78j0045tjog7ddfgbqn	cltenantdefault0000000000	Дентал Плейс / Dental Place	ул. Савушкина, д. 127	f	клиника не активна, не поступают заказы	ООО «»\nИНН	Р/с	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.54	\N
cmnnlv94400f2tjogf8tde2ct	cltenantdefault0000000000	Дентал Стори	Среднегаванский просп., 1	t	8 (812) 416 62 41; 8 (921) 656 62 41\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: clinic@dentalstory.ru	ООО «ИСТОРИЯ УЛЫБКИ» ООО ЭДО	199106, г. Санкт-Петербург, Среднегаванский пр-кт, д. 1, литера А, помещ. 6-Н	7801713630	780101001	1227800078802	«Санкт-Петербург»	044030790	40702810990480003054	30101810900000000790	\N	clinic@dentalstory.ru	\N	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.972	\N
cmnnlv78n0046tjogdnsxh170	cltenantdefault0000000000	Дентал Хаус /Dental House	наб. Черной речки, д. 51	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: dh@dentalhouse.ru, office@dentalhouse.ru	ООО «Дентал Хаус» ООО бум.доки	197342, город Санкт-Петербург,	7814456821	781401001	1109847005498	г.Санкт-Петербург	\N	40702810455130002088	30101810500000000653	\N	dh@dentalhouse.ru, office@dentalhouse.ru	Генеральный директор        Мурадов Бахруз Бахлул Оглы	f	\N	t	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:53.544	\N
cmnnlv99z00g1tjogcmuphevt	cltenantdefault0000000000	Дентал ЭМ	г.Калининград, переулок Нарвский д. 2	t	8 921 2604084\nЭдуард Борисович	ООО «ДЕНТАЛ ЭМ» ООО ЭДО +ДОСТАВКА!	236022, Калининград, переулок Нарвский, дом 2, офис V.	3906371320	390601001	1183926022103	КАЛИНИНГРАДСКОЕ ОТДЕЛЕНИЕ N8626 ПАО СБЕРБАНК	042748634	40702810820000005299	30101810100000000634	\N	dentalem@yandex.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.184	\N
cmnnlv78z0048tjogw3ysbr9s	cltenantdefault0000000000	Дентал Эстетик Клиник	Волынский пер., д. 8	f	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Дентал Эстетик Клиник» ООО ЭДО НЕТ ДОГОВОРА!!!	191186 г. Санкт-Петербург,	7841090478	784101001	1207800111903	АО «ТБанк»	044525974	40702810610001508748	30101810145250000974	\N	elena@dental-esthetics.ru	Шапиро Владислав Маркович	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:53.555	\N
cmnnlv7im0061tjogjpsy6jw6	cltenantdefault0000000000	ИП Мануйлов Р. А.	г. Краснодар, ул. Ким, д.147, кв. 88	f	Работаем от юр. лица: НЕ РАБОТАЕМ (ЧС)	ИП Мануйлов Роман Алексеевич НЕТ ДОГОВОРА!	350040 Краснодарский край,	231136539477	\N	\N	Банк АО "ТБАНК"	044525974	40802810300003070455	30101810145250000974	\N	manrolab.krd@gmail.com	\N	f	\N	f	\N	t	\N	\N	\N	2026-04-06 19:50:53.903	\N
cmnnlv7a3004dtjogj9wgyscf	cltenantdefault0000000000	Денталиум (Империя Улыбки)	г. Павловск,, ул. Конюшенная, д. 2	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «ДЕНТАЛИУМ» ООО-бум.док. НАПР.ДОГОВОР В НОВОЙ РЕДАКЦИИ	196620, Санкт-Петербург г,	7805757621	781701001	1197847206391	\N	044030723	40702810403000055304	30101810100000000723	\N	dentalium87@mail.ru	\N	f	\N	t	2409-028 от 30.09.2024, есть доп.соглашение 30.06.25	f	OOO	\N	\N	2026-04-06 19:50:53.596	\N
cmnnlv7a7004etjog5fqrvalo	cltenantdefault0000000000	Дентальная история	г. Москва,	t	8-915-285-57-75, \n(499)110-05-75\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Медицинская фирма Ваш Стоматолог» НЕТ ДОГОВОРА!	198332, г. Санкт-Петербург,	7807356030	772245002	1107847390970	ООО "Банк Точка"	\N	40702810820000111877	30101810745374525104	\N	svetlana@vashstomatolog.com	\N	f	\N	f	\N	f	OOO	\N	\N	2026-04-06 19:50:53.6	\N
cmnnlv7ab004ftjoggrrza9k4	cltenantdefault0000000000	Дентаплан / Dentaplan	ул. Тележная, д. 32	t	info@dentaplan.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Дентаплан» ООО бум.доки	191167, г. Санкт-Петербург,	7842205918	784201001	1227800092046	\N	044030723	40702810503000091200	30101810100000000723	\N	oss@dentaplan.ru	\N	f	\N	f	2411-012\t22.11.24	f	OOO	\N	\N	2026-04-06 19:50:53.604	\N
cmnnlv9ah00g4tjogxlq396da	cltenantdefault0000000000	Дентар ул.Королева 43 к 1	г.Санкт-Петербург, проспект Королёва 43 к 1 литера А	t	\N	ООО «Дентар»	197371, Санкт-Петербург, проспект Королёва 43 к 1 литера А, помещение 10-Н	7814765570	781401001	1197847194808	ПАО «БАНК УРАЛСИБ»	044030706	40702810122070001248	30101810800000000706	\N	imudentar@yandex.ru	Сулейманов Алибек Сократович	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.201	\N
cmnnlv7am004htjogdc7e5m0f	cltenantdefault0000000000	Дентерия	ул. Пионерская, д. 8	t	i.kacherin@denteria.ru \n clinic@denteria.ru\nписьма счета и всю инфу на обе почты отправлять!\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Дентерия» (ООО ЭДО)\nИНН 7813 6414 51	197198, Г.Санкт-Петербург,	\N	\N	\N	"САНКТ-ПЕТЕРБУРГ"	\N	\N	\N	\N	i.kacherin@denteria.ru \n clinic@denteria.ru	\N	f	\N	t	2405-011 от 23.05.2024\n\nДС №1 от 09.01.25 до 30.06.25	t	OOO	\N	\N	2026-04-06 19:50:53.614	\N
cmnnlv9iw00hutjoge613swtd	cltenantdefault0000000000	Дентика	Комендантский, д. 27, к. 1	t	Телефон        +79992132727	ООО «Диамант»	197371, город Санкт-Петербург, Комендантский пр-кт, д.27 лит. а к.1, помещение 6-н	7814494658	781401001	1117847092868	АО «ТБанк»	044525974	40702810210001910024	30101810145250000974	\N	dentika.spb@mail.ru	Азизян Кристина Рафиковна\nТелефон\t+79217852446	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.504	\N
cmnnlv7ay004jtjogmne2bcyo	cltenantdefault0000000000	Дентикюр	ул. Шпалерная д. 54	t	89117023311 Админ\n\nv3\n\nРаботаем от юр. лица: ИП Соколов	ООО «Дентикюр» ИП	197022, Санкт-Петербург г, Литераторов ул, дом № 17,	7813306460	781301001	1047855076455	"ФК ОТКРЫТИЕ"	044030795	40702810301073100385	\N	\N	denticure@mail.ru	\N	f	\N	f	Нет	f	IP	\N	\N	2026-04-06 19:50:53.626	\N
cmnnlv7ba004ltjogtcidt8hr	cltenantdefault0000000000	Депо	Б.Сампсониевский пр., д. 38-40	t	счета Кристат на ее личную почту или в ТГ\nи дублировать Екатерине на почту!(ст.админу)\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Депо» ООО ЭДО	195277, г. Санкт-Петербург,	7802597786	780201001	1167847412193	АО «ТИНЬКОФФ БАНК»	\N	40702810010001373379	30101810145250000974	\N	kristat.irina@yandex.ru\ndepo38@mail.ru \nzavgorodnyayaev@gmail.com\n\ndenisov.dentist@yandex.ru	\N	f	\N	t	2406-016 от 20.06.2024	t	OOO	\N	\N	2026-04-06 19:50:53.638	\N
cmnnlv9ba00gatjogi4slglti	cltenantdefault0000000000	Детская улыбка	ул. Володарского, 7, Мурманск	t	\N	ООО «ДЕТСКАЯ УЛЫБКА» ООО ЭДО	183038,  г. Мурманск, пр-кт Ленина, д. 92	5190078467	519001001	1185190006715	в филиале № 7806 Банка ВТБ (ПАО)	044030707	40702810645060000267	30101810240300000707	\N	April_smile@mail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.231	\N
cmnnlv7bq004ntjogcq9a8npq	cltenantdefault0000000000	Дженерал Дентал / General Dental	наб. реки Карповки д. 5	f	клиника не активна, не поступают заказы	ООО «»\nИНН	Р/с	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.654	\N
cmnnlv7bu004otjog28etahk6	cltenantdefault0000000000	Джи Клиник	Комендантский пр., д. 11	f	клиника не активна, не поступают заказы с ноября 23г\n\n\nkonstantin@gamydov.ru   Константин Михайлович  +7 (911) 215-44-73\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Джи Клиник» ООО ЭДО	г. Санкт-Петербург,	7814743128	781401001	1187847289101	\N	044525411	40702810135260000151	30101810145250000411	\N	dental.g.clinic@gmail.com	\N	f	\N	f	№ 2510-008 \nот 22.10	t	OOO	\N	\N	2026-04-06 19:50:53.659	\N
cmnnlv7by004ptjogshexjfxd	cltenantdefault0000000000	Диадент	пр.Просвещения, д.53, к.1	f	tatyana0171@mail.ru \nстаршая медсестра\n\nРаботаем от юр. лица: ИП Соколов	ООО «Диадент 53»	195274, Россия, г.Санкт-Петербург, пр.Просвещения, д.53, к.1, лит.А, пом.77Н	7804554410	780401001	1157847439760	(АО) г.Москва	044030785	40702810800020002721	30101810300000000785	\N	tageso@yandex.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:53.663	\N
cmnnlv94800f3tjogpkxcqbzz	cltenantdefault0000000000	Диадент	Бухарестская ул., 110, корп. 1	t	документы в бумажном виде везем!\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: diadent@mail.ru (для договора и рассылок!)	ООО «Диадент110»ООО БУМ.ДОКИ!\nНЕОБХОДИМ ДОГОВОР!	192288, г. Санкт-Петербург, ул.Бухарестская, д.110, к.1, лит.А, пом.16-Н	7816563096	781601001	1137847205363	(АО) г.Москва	044525769	40702810002100003655	30101810745250000769	\N	annadiadent110@mail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:55.977	\N
cmnnlv7c6004qtjogeqjlxo5n	cltenantdefault0000000000	ДивиДент пр. Стачек д.92 к.3 НЕТ ДОГОВОРА!	пр. Стачек д.92 корп.3, пом. 20Н	t	Владислав +7 965 076 56 38\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «ДивиДент» ООО бум.доки НЕТ ДОГОВОРА!	198096, г. Санкт-петербург пр. Стачек д.92 корп.3, пом. 20Н	7805598330	780501001	1127847440324	Ф-Л СЕВЕРО-ЗАПАДНЫЙ ПАО БАНК "ФК ОТКРЫТИЕ"	044030795	40702810600230002804	30101810540300000795	\N	dividentclinik@gmail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.67	\N
cmnnn6h230076tj801bgy0x1z	cltenantdefault0000000000	ИП Николаев	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:39.099	\N
cmnokkt6w0011tj50pts3r0ft	cltenantdefault0000000000	ул. Малиновского	д.68, к.1	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.336	\N
cmnnlv7c9004rtjog9n2f9xj8	cltenantdefault0000000000	Династия	г. Великий Новгород\nул. Московская, д. 14	f	клиника не активна, не поступают заказы с декабря 23г	ООО «Династия»	173014, г. Великий Новгород, ул. Московская, д. 14, ПОМЕЩ. 65Н	5321202174	532101001	1205300000476	К/счет 30101810100000000698	044959698	40702810043000101985	30101810100000000698	\N	9116303030@mail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.674	\N
cmnnlv7cd004stjog6uo5g956	cltenantdefault0000000000	Династия С	г. Ростов на Дону	t	v.3,2 \n04/12 накладки Васьковой\n\nРаботаем от юр. лица: ИП Соколов	ООО «СЦ «Династия-с» ИП ЭДО	344015, г. Ростов-на-Дону,	6168067535	616801001	1136194003230	\N	046015061	40702810401000001571	30101810560150000061	\N	vikvit_77@mail.ru	\N	f	\N	f	\N	t	IP	\N	\N	2026-04-06 19:50:53.678	\N
cmnnn6he8007mtj80gb7pmi3k	cltenantdefault0000000000	Династия СТ	пр.Обуховской обороны д. 110 к.1	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:39.536	\N
cmnnlv7cl004utjogsa5et7oz	cltenantdefault0000000000	Династия СТ ПРЕДОПЛАТА	пр.Обуховской обороны д. 110 к.1	t	Телефон +79119252633\ndynasty.ct@yandex.ru\n\nРаботаем от юр. лица: ИП Соколов	ООО «Династия ст»\nТолько ПРЕДОПЛАТА! ИП бум.доки	188661, Ленинградская обл., Всеволожский р-н,	7804188517	470301001	1157847071975	\N	044030723	40702810903000001418	30101810100000000723	\N	dynasty.ct@yandex.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:53.686	\N
cmnnlv7ci004ttjog70ct4l78	cltenantdefault0000000000	Династия СТ ПРЕДОПЛАТА д. Новое Девяткино, ул. Арсенальная, д. 7	\N	t	Телефон +79119252633\ndynasty.ct@yandex.ru\n\nРаботаем от юр. лица: ИП Соколов	ООО «Династия ст»\nТолько ПРЕДОПЛАТА! ИП бум.доки	188661, Ленинградская обл., Всеволожский р-н,	7804188517	470301001	1157847071975	\N	044030723	40702810903000001418	30101810100000000723	\N	dynasty.ct@yandex.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:53.682	\N
cmnnlv7cp004vtjoguku0weuw	cltenantdefault0000000000	Диомед	г. Калининград\nпр. Московский, д. 155-159	t	Тел-/8(4012) 58-22-15; \nwww:diomed39.ru\n\n\n+7 (909) 782-91-19 WhApp\n\n\nИП ЭДО?\n\nРаботаем от юр. лица: ИП Соколов	ООО «Диомед» ИП ЭДО	236006, КАЛИНИНГРАДСКАЯ ОБЛАСТЬ, Г. КАЛИНИНГРАД, ПР-КТ МОСКОВСКИЙ, Д. 155-159, ЛИТЕРА III	3904011516	390601001	1023900594838	\N	044525411	40702810820380005516	30101810145250000411	\N	diomed39@mail.ru	\N	f	\N	t	\N	t	IP	\N	\N	2026-04-06 19:50:53.689	\N
cmnokktfd001jtj50azbein0z	cltenantdefault0000000000	Добрые Врачи	г. Волхов	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.642	\N
cmnnlv7df0050tjogkqep0xew	cltenantdefault0000000000	Доктор Дент	пр. Энгельса, д. 66	t	mail@clinikadoctordent.ru\nсюда счета не отправлять\n\nРаботаем от юр. лица: ИП Соколов	ООО «ДОКТОР ДЕНТ Северо-Запад» ИП бум.доки	194017, Санкт-Петербург, проспект Энгельса, дом 66, литера Б, помещение 3-Н	7802683072	780201001	1187847388178	ПАО СБЕРБАНК	044030653	40702810255000040655	30101810500000000653	\N	doctordent.engels66@gmail.com	\N	f	\N	f	Есть старый у Севы в тг или вотсап	f	IP	\N	\N	2026-04-06 19:50:53.716	\N
cmnnlv7dj0051tjog4zcavkf8	cltenantdefault0000000000	Доктор Левин	г. Москва\nпр. Вернадского, д. 8А	f	Работаем от юр. лица: ИП Соколов	ООО «Центр Приватной Стоматологии «Доктор Левин»	119311, г. Москва,	9729312050	772901001	1217700371151	АО «Альфа-банк»	044525593	40702810502340002287	30101810200000000593	\N	\N	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:53.719	\N
cmnnlv7dm0052tjog2erghljg	cltenantdefault0000000000	Доктор Мареев	г. Нижний Новгород\nул.Фрунзе, д.12	t	7 (831) 432-00-99\n7 (929) 050-00-99\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: doctormareev@mail.ru	ООО «ДОКТОР МАРЕЕВ» ООО ЭДО напр.договор в нов.редакции	603155, Нижегородская обл,	5260428862	526001001	1165275028830	ВОЛГО-ВЯТСКИЙ БАНК ПАО СБЕРБАНК	042202603	40702810142000003836	30101810900000000603	\N	doctormareev@mail.ru	Мареева Нина Александровна	f	\N	t	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:53.723	\N
cmnnlv7dq0053tjogduiufoq1	cltenantdefault0000000000	Доктор Яковлев	ул. Дыбенко д. 13, к. 5	t	dr.yakovlev@bk.ru\n\n+7 (812) 748-94-47\n+7 (906) 260-66-39\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Стоматологический Центр «Доктор Яковлев» ООО ЭДО	193230, г. Санкт-Петербург,	7811580281	781101001	1147847166719	Точка" г. Москва	044525104	40702810603500033245	30101810745374525104	\N	dr.yakovlev@bk.ru	Генеральнй директор\nИ.В. Яковлев	f	\N	t	2501-004\t13.01.25	f	OOO	\N	\N	2026-04-06 19:50:53.726	\N
cmnnlv91s00emtjogl5dylw0l	cltenantdefault0000000000	Доктор плюс	Искровский проспект 19	t	документы в бум.виде! \nНЕТ ЭДО\n\nskyshine84@gmail.com вторая почта для выставления счетов\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: evt-neva@yandex.ru	ООО «Доктор плюс» ООО ЭДО НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	198261, город Санкт-Петербург, пр-кт Маршала Жукова, д.60 к.1, литер В	7805576199	780501001	1127847041673	Филиал  «Северная столица» ЗАО «Райффайзенбанк»	044030723	40702810903000448039	30101810500000000723	\N	evt-neva@yandex.ru	Генеральный директор Вадачкория Медея Давидовна	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.889	\N
cmnnn6ejb003jtj80r0nlyrdd	cltenantdefault0000000000	Доктор/Doctor	пр. Стачек, д. 55	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	2409-020 \n18.09.24\nбыл подписан, срок истек, работы не поступают	f	OOO	\N	\N	2026-04-06 20:27:35.831	\N
cmnnlv7e10055tjogbalyq8ez	cltenantdefault0000000000	Доктор/Doctor (сделать новый договор!)	пр. Стачек, д. 55	t	+7 931 214 61 58 \nАнтон Александрович Зинченко, директор, занимается оплатами\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Майя» ООО-бум.документы НЕОБХОДИМ НОВЫЙ ДОГОВОР	198096, г. Санкт-Петербург,	7805128366	780501001	1027802737654	\N	044525411	40702810130060006981	30101810145250000411	\N	Do-ctor@mail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.738	\N
cmnnlv7iq0062tjog9dif83aj	cltenantdefault0000000000	ИП Николаев Эксклюзив	ММЦ ул. Кораблестроителей д. 33 к.2	t	Работаем от юр. лица: ИП Соколов	ИП Николаев Андрей Владимирович ИП бум.доки	198516 г. Санкт-Петербург,	781912420460	\N	\N	\N	044525974	40802810300003602768	30101810145250000974	\N	@nikolaevortho\n\nnikolaev23@gmail.com	\N	f	\N	t	\N	f	IP	\N	\N	2026-04-06 19:50:53.907	\N
cmnnlv7e40056tjog262dsjar	cltenantdefault0000000000	ДокторДент	г. Муром\nВладимирское ш., д. 9	t	Тел. (49234)4-18-08\nФакс. (49234)4-60-74\n89101855556@mail.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: m77944@mail.ru	ООО «Дентал» ООО ЭДО	602266, Владимирская область,	3334010980	333401001	1083334000320	\N	041708602	40702810410000010512	30101810000000000602	\N	m77944@mail.ru	Генеральный директор \nПогосян Эдуард Рафикович	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:53.741	\N
cmnnlv7f3005etjog52dq1wir	cltenantdefault0000000000	Дэви Дентал	ул. Варшавская д.6 к.2	t	deviclinica@gmail.com\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Дэви Дентал» ООО бум.доки НЕТ ДОГОВОРА	196105 г. Санкт-Петербург,	7810950317	781001001	1227800088889	\N	044030786	40702810332400003734	30101810600000000786	\N	deviclinica@gmail.com	\N	f	\N	f	\N	f	OOO	\N	\N	2026-04-06 19:50:53.776	\N
cmnnlv9b500g9tjognzl197iw	cltenantdefault0000000000	Евродент	г.Тамбов, ул.Советская 163А	t	Также в исходной строке было название: ул.Советская 163А	ООО «МК» ООО ЭДО ДОСТАВКА!	392008 г.Тамбов, ул. Советская, д.163А, пом.№35	6829091667	682901001	1136829003695	Ярославский филиал ПАО «ПРОМСВЯЗЬБАНК» г. Ярославль	047888760	40702810702000094074	40702810702000094074	\N	ooomk68@mail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.226	\N
cmnnlv7f7005ftjogcu8yplbr	cltenantdefault0000000000	Европа	г. Благовещенск, ул. Шимановского, д. 61/2	t	Работаем от юр. лица: ИП Соколов	ООО «Реалитистом» ИП ЭДО	675001, Амурская обл., г.о. город Благовещенск, г. Благовещенск, ул. Шимановского, д. 61/2	2801104333	280101001	1052800060015	ОАО «Сбербанк России» г. Хабаровск	040813608	40702810403010111928	30101810600000000608	\N	Realitistom00@mail.ru	\N	f	\N	f	\N	t	IP	\N	\N	2026-04-06 19:50:53.779	\N
cmnnlv7fb005gtjog18ymbk48	cltenantdefault0000000000	Жадан Дентал	Пр-кт Приморский д62 к1 стр 1\nПом 29-Н	t	Жадан Анастасия Антоновна, ген. директор   +7 911 253 6145\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: Jadan.dental@mail.ru	ООО "ЖАДАН ДЕНТАЛ"	197374 Санкт-Петербург	7814810550	781401001	1227800087283	К/с 30101810500000000653	044030653	40702810155000087695	30101810500000000653	\N	по вопросам оплаты писать в телеграмм	Жадан Анастасия Антоновна   +7 911 253 6145	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:53.783	\N
cmnnn6dn6001ftj801z8nsv3n	cltenantdefault0000000000	Завотделением Остеостоматологии Университета Здоровья БРИКС	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:34.675	\N
cmnokkt5p000xtj50tfee7i6b	cltenantdefault0000000000	Загородный пр.	д.45", "Денталиум (Империя Улыбки)	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.293	\N
cmnokkt1p000mtj50fyrx08tp	cltenantdefault0000000000	Загородный пр.,  д.10	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.15	\N
cmnokkto30026tj50v8rc9lwn	cltenantdefault0000000000	Загребский б-р, д.9	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.956	\N
cmnokkt2c000ntj50obznec31	cltenantdefault0000000000	Заневский пр.	д. 1/82	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.172	\N
cmnnlv7fe005htjogajn98ihj	cltenantdefault0000000000	Здоровые зубы	8-я линия В.О. д.9	t	alfadent003@mail.ru\n\n Тел. +7(921)9998688 \n\nСт.Админ Екатерина по тел.админов\n\nДиректор - Гурам Назарович (связь через Всеволода)\n\nАлександра -управляющая\nMalyarovaaleks@yandex.ru\n8-931-354-51-08 не работает больше там\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Альфа» ООО сверка ЭДО	199034, РОССИЯ, г. Санкт-Петербург,	7801657552	780101001	1197847003310	«Санкт-Петербург»	044030790	40702810390480001494	30101810900000000790	\N	alfadent003@mail.ru	\N	f	\N	t	2408-011 30.08.24	f	OOO	\N	\N	2026-04-06 19:50:53.787	\N
cmnnlv9fx00h5tjogkwsfvdc4	cltenantdefault0000000000	Здоровье	ул. Бабушкина, 3	t	тел (812)327-21-12\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Стоматологическая клиника Здоровье»	192029, г. Санкт-Петербург, ул. Бабушкина, д. 3, лит. А, пом. 7Н, офис 59.	7811646655	781101001	1177847145915	Филиал "Северная столица" АО "Райффайзенбанк"	\N	40702810303000034331	30101810100000000723	\N	zdoroviye@inbox.ru	Соколов Михаил Израилевич	f	\N	f	№2512-010 от 26.12.25	t	OOO	\N	\N	2026-04-06 19:50:56.397	\N
cmnnlv7fm005jtjogkw4d3vqn	cltenantdefault0000000000	Зубарев С.В. Stom Pro Lab	Аптекарский пр., д. 18	t	Работаем от юр. лица: НАЛ	Наличные	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.794	\N
cmnnlv7fi005itjogoybijbaj	cltenantdefault0000000000	Зубарев С.В. Одент	Гжатская ул., д. 22 к.1	t	Работаем от юр. лица: НАЛ	Наличные	Р/с	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.791	\N
cmnnlv7fq005ktjogbl413eks	cltenantdefault0000000000	Зубной центр	ул. Будапештская, д. 2	t	634-48-00\n\nРаботаем от юр. лица: ИП Соколов	ООО "МОНТЭ" ИП бум.доки	192242, г. Санкт-Петербург, муниципальный округ Волковское вн.тер.г.,	7816719554	781601001	1217800105016	Точка"	044030786	40702810432400003184	30101810600000000788	\N	m0k0r0n0@icloud.com	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:53.798	\N
cmnnlv7gc005ntjogqet3kie1	cltenantdefault0000000000	Зэд Эм ZM clinic	Мал. Митрофаньевская ул. д.5 к.1	f	клиника не активна, не поступают заказы	Частное	Р/с	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.821	\N
cmnnlv9au00g7tjog7hp40bw0	cltenantdefault0000000000	ИНСАН (доставка в DANA Пороховская) Подписать Пикалёво	г. Пикалёво, ул. Советская, д. 1а, пом.1, оф.1.	t	\N	ООО «ИНСАН» ООО	187600, Ленинградская область, г. Пикалёво, ул. Советская, д. 1а, пом.1, оф.1.	4715033820	471501001	1214700000844	АО «ТБанк»	044525974	40702810410001675664	30101810145250000974	\N	insan.stom@mail.ru	Шахаев Сагид Гаджияхьяевич	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.214	\N
cmnnlv7hz005ytjogq4p38f55	cltenantdefault0000000000	ИП Грищенко Дентал мед Санкт-Петербургское ш., д.46	\N	t	Работаем от юр. лица: ИП Соколов	ИП Грищенко Э.Б. ИП ЭДО	198504, г. Санкт-Петербург,	781620740906	\N	\N	ПАО СБЕРБАНК	044030653	40802810955000047997	30101310500000000653	\N	\N	\N	t	\N	t	\N	t	IP	\N	\N	2026-04-06 19:50:53.879	\N
cmnnlv7i3005ztjogobokb6bg	cltenantdefault0000000000	ИП Кузнецов Е.А.	\N	t	Работаем от юр. лица: ИП Соколов	ИП КУЗНЕЦОВ ЕВГЕНИЙ АЛЕКСАНДРОВИЧ ИП бумюдоки	Р/с 40802810555000084758	890511874819	\N	320890100014457	ПАО Сбербанк	\N	40802810555000084758	30101810500000000653	\N	\N	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:53.884	\N
cmnnlv7iu0063tjogbnxsfo2f	cltenantdefault0000000000	ИП Савинова (Гамаонова) К.А.	если не указано другое\nпр. Медиков д.10 к.1\nклиника «ДенатА»	f	клиника не активна, не поступают заказы	ИП Савинова Камила Авдановна	426060, Россия, респ Удмуртская,	151108557026	\N	\N	АО «ТБанк»	044525974	40802810700005323577	30101810145250000974	\N	kamila1005@mail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.91	\N
cmnokktd3001dtj50pksgqm42	cltenantdefault0000000000	Идеальная Пломба	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.56	\N
cmnnlv7gg005otjog1wjvkw7k	cltenantdefault0000000000	Идеальная пломба	Гражданский пр., д. № 117, к. 1	t	290-53-53, 290-51-51\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Идеальная пломба» ООО ЭДО	195299, Санкт-Петербург,	7804179174	780401001	1047806009866	Дополнительный офис «Центральный» ПАО «БАНК САНКТ-ПЕТЕРБУРГ»	044030790	40702810870000001417	30101810900000000790	\N	mail@ideal-plomba.ru	Рябошапка Олег Васильевич	f	\N	t	2501-008        14.01.25	t	OOO	\N	\N	2026-04-06 19:50:53.825	\N
cmnnlv7gk005ptjogrk4x6gfl	cltenantdefault0000000000	Икар	ул Пулковская, д.10, к. 1	f	Работаем от юр. лица: ИП Соколов	ООО «Икар»	196158, г. Санкт-Петербург, ул. Пулковская, Д.10, К.1, ПОМ.18Н	7810054342	781001001	1067847468237	ПАО СБЕРБАНК	044030653	40702810755000045464	30101810500000000653	\N	karasevspb@mail.ru	\N	f	\N	f	Отвез сам 27.10.23	f	IP	\N	\N	2026-04-06 19:50:53.829	\N
cmnnlv7gx005rtjog5358xdrv	cltenantdefault0000000000	Импладент	ул. Ропшинская, дом 19/40	t	8 812 701 0252\nimpladent-spb@yandex.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: impladent-bills@yandex.ru	ООО «ФЕНИКС» ООО бум.доки НАПР ДОГ.В НОВ.РЕДАКЦИИ	197110, г. Санкт-Петербург,	7813626855	781301001	1187847361921	АО "ТИНЬКОФФ БАНК"	044525974	40702810710001009927	30101810145250000974	\N	impladent-bills@yandex.ru	\N	f	\N	t	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:53.841	\N
cmnnlv7h8005ttjogdag0gzax	cltenantdefault0000000000	ИнВита НЕТ ДОГОВОРА!	ул. Шпалерная, д. 34	t	Тел.: (921) 380-33-80, (812) 209-69-79\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: invita@list.ru	ООО «ИВ» ООО бум.доки НЕТ ДОГОВОРА!	191123, г. Санкт-Петербург,	7825509850	784101001	1037843111240	\N	044030920	40702810506000001425	30101810000000000920	\N	invita@list.ru	Генеральный директор Максимов Алексей Борисович	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.853	\N
cmnnlv7hj005vtjogb3koc08f	cltenantdefault0000000000	Интан 15	ул. Варшавская д. 61, к.1	f	\N	ООО «Стоматология 15»	\N	7810994970	781001001	1147847373156	ОАО «Сбербанк России»	044030653	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.863	\N
cmnnlv7hn005wtjog1j5as9g5	cltenantdefault0000000000	Интан 23	ул. Большая Пороховская 33	t	Интан\n+7 (921) 427-41-51\nРимма Камильевна управляющая\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Стоматология 23» ООО бум.доки	195176 г. Санкт-Петербург,	7806245224	780601001	1167847303007	Северо-Западный банк ПАО  Сбербанк	044030653	40702810955040009244	30101810500000000653	\N	adm23@intan.ru	\N	f	\N	t	2502-008        12.02.2025	f	OOO	\N	\N	2026-04-06 19:50:53.867	\N
cmnnn6et0004btj80gng68cbi	cltenantdefault0000000000	КДС	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:36.18	\N
cmnnlv7k0006atjogn52t8m37	cltenantdefault0000000000	КЛД дент	ул. Всеволода Вишневского, 13	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «КЛД-ДЕНТ» ООО бум.доки+ЭДО СДЕЛАТЬ НОВЫЙ ДОГОВОР	197022, г. Санкт-Петербург,	7813468292	781301001	1107847099249	ПАО «БАНК Санкт-Петербург»	044030790	40702810927000005638	30101810900000000790	\N	Galkinadarya45@yandex.ru	\N	f	\N	t	2410-008 от 14.10.24	t	OOO	\N	\N	2026-04-06 19:50:53.952	\N
cmnnlv9eg00gvtjog3z6d836u	cltenantdefault0000000000	КЛС Клиника Лазерной Стоматологии	г. Москва, ул. Нижегородская, д.7	t	Ульянов Юрий Александрович\nКонтактный тел. Ген. директора         +7 495 911-41-71\n\n89264364282  управляющая - неактуал номер, не работает там уже	ООО «Дентал Груп КЛС»	129085, г. Москва, пр-т Мира, дом 83, кв.7	9717134501	771701001	1237700308537	ПАО «Московский Кредитный Банк»	044525659	40702810300210000183	30101810745250000659	\N	work@kls-dent.ru	Ульянов Юрий Александрович	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.345	\N
cmnokktsj002etj501tfzyd0l	cltenantdefault0000000000	Казначейская ул., 4/16	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.116	\N
cmnokkt2p000otj50jq39wagm	cltenantdefault0000000000	Казначейская ул., 4/16", "Кисс	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.185	\N
cmnokksg30002tj504i3a8j45	cltenantdefault0000000000	Калининград	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:34.371	\N
cmnokku2h002stj50ogebsc5n	cltenantdefault0000000000	Каменноостровский пр.	д. 56 к.2", "МИП Институт стоматологии	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.474	\N
cmnnlv7iy0064tjogdwdvv513	cltenantdefault0000000000	Камея , Московский пр., 74	Ярославль\nМосковский пр-т, 74	f	info@kameyadent.ru\n\nРаботаем от юр. лица: ИП Соколов	ООО «Камея +»	150030, Ярославская обл., г.о. город Ярославль,	7604079359	760401001	1057600651063	г. КАЛУГА	042908612	40702810077030001247	30101810100000000612	\N	info@kameyadent.ru	\N	f	\N	f	нет	f	IP	\N	\N	2026-04-06 19:50:53.914	\N
cmnnlv7j90066tjogo7lm3l75	cltenantdefault0000000000	Канунн	Б.Сампсониевский пр., д.75	t	kanunnstom.ru\n+7 (921) 957-40-78\n+7 (812) 957-40-78\n\nпн-пт 10:00–20:00; \nсб 10:00–15:00\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: Kanunnstom@mail.ru	ООО «КАНУНН» ООО бум.доки	194100, г. Санкт-Петербург,	7802695173	780201001	1197847184050	\N	044030786	40702810632130007331	30101810600000000786	\N	kanunnstom@mail.ru	Генеральный директор Канунникова Светлана Вадимовна	f	\N	t	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:53.925	\N
cmnnlv7jl0068tjognbtvp66w	cltenantdefault0000000000	Кисс	Щербаков пер., д. 2/58	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «ЦПЗ КИСС» ЭДО	191002, г. Санкт-Петербург,	7840086447	784001001	1197847053931	\N	044030786	\N	\N	\N	Eremina_1974@list.ru	\N	f	\N	t	2405-007 от 22.05.24\n\nДС №1 от 09.01.25	t	OOO	\N	\N	2026-04-06 19:50:53.938	\N
cmnnlv7kk006etjog28rx1kzp	cltenantdefault0000000000	Кл. Горских не активный контрагент	ул. Капитанская, д. 4	f	клиника не активна, не поступают заказы\n\n\ngordentclinic@gmail.com\n\n+7 (911) 119-78-11	ООО «Стоматологическая клиника Горских»\nИНН	Р/с	\N	\N	\N	\N	\N	\N	\N	\N	gordentclinic@gmail.com	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.972	\N
cmnnlv7jv0069tjogf9fo472e	cltenantdefault0000000000	Классика	г. Сыктывкар\nул.  Карла  Маркса  117	f	клиника не активна, не поступают заказы	ООО «СОЦИАЛЬНЫЙ СТОМАТОЛОГИЧЕСКИЙ ЦЕНТР «КЛАССИКА»	167000  г.  Сыктывкар,  ул.  Карла  Маркса  117,  пом.  Н-9	1101149288	110101001	1141101002140	\N	044525411	40702810810040000586	\N	\N	klassika117@mail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.948	\N
cmnnlv7dc004ztjogo8ce1po1	cltenantdefault0000000000	Клиника (в реестре было ФИО, уточните название: Добрые Врачи)	г. Волхов	f	клиника не активна, не поступают заказы\n\nВ столбце «Клиника» в реестре указано ФИО (Добрые Врачи), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «»\nИНН	Р/с	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.712	\N
cmnnn6gbh006etj80it705m1u	cltenantdefault0000000000	Клиника (в реестре было ФИО, уточните название: Идеальная Пломба)	\N	t	В столбце «Клиника» в реестре указано ФИО (Идеальная Пломба), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:38.141	\N
cmnnn6igu008utj80wervpu63	cltenantdefault0000000000	Клиника (в реестре было ФИО, уточните название: Люксор Новоселье)	\N	t	В столбце «Клиника» в реестре указано ФИО (Люксор Новоселье), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:40.927	\N
cmnnlv826008ytjogwraqt7v5	cltenantdefault0000000000	Клиника (в реестре было ФИО, уточните название: Мкртчян Арсен Гегемович)	\N	f	клиника не активна, не поступают заказы\n\nВ столбце «Клиника» в реестре указано ФИО (Мкртчян Арсен Гегемович), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ИП Мкртчан А.Г.	357601, Ставропольский край, Ессентуки г, Западная	262610238241	\N	\N	К/счет 30101810907020000615	040702615	40802810560100063468	30101810907020000615	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:54.607	\N
cmnnn6ezr004ntj809ha4e0i5	cltenantdefault0000000000	Клиника (в реестре было ФИО, уточните название: Фактор Улыбки Будепштская)	\N	t	В столбце «Клиника» в реестре указано ФИО (Фактор Улыбки Будепштская), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:36.424	\N
cmnnlv92400eotjogq6hqj41s	cltenantdefault0000000000	Клиника (название не указано — см. адрес: 10-я линия Васильевского острова, 25/42)	10-я линия Васильевского острова, 25/42	t	606-77-77\n89111518609 \nmed@vitality-art.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: natis.spb@gmail.com\n\nВ столбце «Клиника» в реестре указано ФИО (Виталити Арт), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.\n\nТакже в исходной строке было название: 25/42	ООО «ВИТАЛИТИ-АРТ» ООО ЭДО	199178, г.Санкт – Петербург, 10-я линия В.О., дом 25/42,	7842176569	784201001	1197847225311	ФИЛИАЛ "САНКТ-ПЕТЕРБУРГСКИЙ" АО "АЛЬФА-БАНК"	044030786	40702810332390001228	30101810600000000786	\N	natis.spb@gmail.com	\N	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.9	\N
cmnnlv8bu00aftjog2anr653u	cltenantdefault0000000000	Клиника (название не указано — см. адрес: 190013, г. Санкт-Петербург, Серпуховская ул. д. 14, Лит)	190013, г. Санкт-Петербург, Серпуховская ул. д. 14, Лит. А, Пом. 4Н	t	т. 3163975-по этому номеру мне никто так и не ответил\n\nдозвонилась в клинику по тел: 8-812-309-06-62\nдоп.почта : foshardent@mail.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nВ столбце «Клиника» в реестре указано ФИО (Пьер Фошар), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «Пьер Фошар» ООО-бум.д НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	190013, г.Санкт-Петербург, Серпуховская ул. д. 14, Лит. А, Пом. 4Н	7838329727	783801001	1057811834805	в  Ф-л Петровский ПАО Банк “ФК Открытие”	044030795	\N	\N	\N	evg13415478@yandex.ru	\N	f	\N	t	2408-012 03.09.24	f	OOO	\N	\N	2026-04-06 19:50:54.955	\N
cmnnlv9bt00gdtjog3afwirjr	cltenantdefault0000000000	Клиника (название не указано — см. адрес: 393255, Тамбовская область, г. Рассказово, ул. Советска)	393255, Тамбовская область, г. Рассказово, ул. Советская, д. 91А, пом. 188	t	В столбце «Клиника» в реестре указано ФИО (Смайл Тур), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «Смайл-Тур» ООО ЭДО	393255, Тамбовская область, г. Рассказово, ул. Куйбышевский проезд д,7	6828006789	682801001	1106828000179	Тамбовское отделение №8594	046850649	40702810461160001389	30101810800000000649	\N	rusiska@inbox.ru	Полторацкая Ирина Павловна\n+79107538841	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.249	\N
cmnokkt4m000utj505saqcf7q	cltenantdefault0000000000	ул. Оптиков д. 51 к. 1	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.254	\N
cmnokku4d002xtj50cswyfogw	cltenantdefault0000000000	ул. Орловская д.1	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.541	\N
cmnnlv72r0037tjog1dncm3i7	cltenantdefault0000000000	Клиника (название не указано — см. адрес: Вологда ул. Челюскинцев, д. 23)	Вологда\nул. Челюскинцев, д. 23	f	клиника не активна, не поступают заказы\n\nВ столбце «Клиника» в реестре указано ФИО (Да Винчи), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «ДА Винчи»	160014, г. Вологда, ул. Самойло, д. 21, КВ.8.	3525333083	352501001	1143525017690	\N	\N	\N	\N	\N	olga-lt@mail.ru\nshemyakin0701@mail.ru\n\nсразу на обе	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.332	\N
cmnnlv7wp0084tjog419vs5c9	cltenantdefault0000000000	Клиника (название не указано — см. адрес: Загородный пр., д. 26)	Загородный пр., д. 26	t	Елена Дмитриева\n+7 981 712-46-41\n\nРаботаем от юр. лица: ИП Соколов\n\nВ столбце «Клиника» в реестре указано ФИО (Мастерская Улыбок), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «Мастерская Улыбок» ИП бум.доки	191180, г.Санкт-Петербург,	7840350349	\N	\N	УРАЛСИБ" В Г.САНКТ-ПЕТЕРБУРГ	\N	\N	\N	\N	my32.ru@mail.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:54.409	\N
cmnnlv6np000qtjogq9o0o3v9	cltenantdefault0000000000	Клиника (название не указано — см. адрес: Казачий пер., 13/ Загородный пр., д.45)	Казачий пер., 13/ Загородный пр., д.45	t	78123103425\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: allegrostom@yandex.ru\n\nВ столбце «Клиника» в реестре указано ФИО (Аллегро Большой), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «Аллегро» БУМ. ДОКИ!!!!!+ЭДО!!!!	191180, г. Санкт-Петербург,	7838345214	783801001	1067847231077	ФИЛИАЛ «САНКТ-ПЕТЕРБУРГСКИЙ»	044030786	40702810832530000576	30101810600000000786	\N	allegrostom@yandex.ru	Лицо, ответственное за заключение договора (Ф.И.О.)\nШалаева Ольга Алексеевна\nТелефон\n+7 921 396-44-23	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:52.789	\N
cmnnlv71w0030tjogf2l0i91i	cltenantdefault0000000000	Клиника (название не указано — см. адрес: Комендантский пр., д.11)	Комендантский пр., д.11	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nВ столбце «Клиника» в реестре указано ФИО (Виру Ван), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «ВируВан» ООО ЭДО	197349, город Санкт-Петербург, Комендантский пр-кт, д. 11 литера А, помещ. 47-н офис 1	7814825765	781401001	1237800088514	АО «Тинькофф Банк»	044525974	40702810010001461304	30101810145250000974	\N	viruone@viruclinic.ru	\N	f	\N	t	2408-005 20.08.24\nДоп.согл. №1 от 09.01.25	t	OOO	\N	\N	2026-04-06 19:50:53.301	\N
cmnnn6fvs005wtj80d192m3c9	cltenantdefault0000000000	Клиника (название не указано — см. адрес: Ланское ш., д. 65)	Ланское ш., д. 65	t	В столбце «Клиника» в реестре указано ФИО (Арт Класс), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	t	2410-010 от 17.10.24\nи доп.согл. тоже подписано	t	OOO	\N	\N	2026-04-06 20:27:37.577	\N
cmnnlv9ce00ggtjogdy5znxmn	cltenantdefault0000000000	Клиника (название не указано — см. адрес: Лыжный пер, дом № 4 корпус 3, помещение 17-Н Лыжный пер)	Лыжный пер, дом № 4\nкорпус 3, помещение 17-Н\nЛыжный пер., 4, корп. 3	t	В столбце «Клиника» в реестре указано ФИО (Смайл Сити), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «Смайл Сити»	197345, Санкт-Петербург г. Лыжный пер, дом № 4,	7814576519	781401001	1137847232973	ПАО "БАНК "САНКТ-ПЕТЕРБУРГ"	044030790	40702810190230000146	30101810900000000790	\N	info@smilecity.spb.ru	Данилов Юрий Леонидович\n+79111380896	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.27	\N
cmnnlv6ww0027tjoglz81jbwp	cltenantdefault0000000000	Клиника (название не указано — см. адрес: Малый пр. В.О. д. 63/14)	Малый пр. В.О. д. 63/14	t	E-mail: welefant@yandex.ru\nТелефон: 8(812)3330392\n\n\nРеквизиты прислала\nЕвгения Карунц\nekarunts@mail.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nВ столбце «Клиника» в реестре указано ФИО (Белый Слон), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «Белый Слон»	197022, Россия, г. Санкт-Петербург,	7813601762	781301001	1147847391559	ПАО «СБЕРБАНК» САНКТ-ПЕТЕРБУРГ	044030653	40702810755040004287	30101810500000000653	\N	welefant@yandex.ru	\N	f	\N	t	2501-013\t23.01.25	f	OOO	\N	\N	2026-04-06 19:50:53.12	\N
cmnnlv6tt001ptjogzklizw23	cltenantdefault0000000000	Клиника (название не указано — см. адрес: Москва, ул .Эльдара Рязанова д. 2, кв. 84)	Москва, ул .Эльдара Рязанова д. 2, кв. 84	t	Работаем от юр. лица: ИП Соколов\n\nВ столбце «Клиника» в реестре указано ФИО (Асирян Мариам), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ИП Асирян М.М. ИП ЭДО	119421 Россия  Москва,	773611850040	\N	\N	\N	044525092	40802810770010383005	30101810645250000092	\N	\N	\N	f	\N	f	\N	t	IP	\N	\N	2026-04-06 19:50:53.01	\N
cmnokkudj003btj5009u6z4sp	cltenantdefault0000000000	ул. Павловская	д. 23/16	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.871	\N
cmnnlv736003atjogdjlgg3qg	cltenantdefault0000000000	Клиника (название не указано — см. адрес: Московский пр., д. 183/185 лит. Б)	Московский пр., д. 183/185 лит. Б	t	7 (931) 002-03-17\n\nv3\n\nРаботаем от юр. лица: ИП Соколов\n\nE-mail для договора/прайса: newsyekaterinakirillova@gmail.com\n\nkubusdental@mail.ru\n\n\ndwadantista@yandex.ru\n\nВ столбце «Клиника» в реестре указано ФИО (Два Дантиста), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «Твоя Улыбка» ИП ЭДО	196070, город Санкт-Петербург, Московский пр-кт, д. 183-185 литер б, помещ. 233-н офис 1	7810752900	781001001	1197847062467	\N	044030723	40702810203000045941	30101810100000000723	\N	dwadantista@yandex.ru	Генерельный директор \nКубус Анастас Юрьевич	f	\N	t	от 20.10.2023 выслал 23.10\n\nотвезли оригинал	t	IP	\N	\N	2026-04-06 19:50:53.347	\N
cmnnlv6q70013tjogkpgcgquf	cltenantdefault0000000000	Клиника (название не указано — см. адрес: Нарвский пр., д. 18 Нарвский пр., д. 18 ", "СДС КЛИНИК,)	Нарвский пр., д. 18	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nВ столбце «Клиника» в реестре указано ФИО (Ами Вита), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «АМИ.ВИТА» ООО ЭДО	190020, Санкт-Петербург,	7839103000	783901001	1187847156232	АО «Тинькофф Банк»	044525974	40702810710000370301	30101810145250000974	\N	center-vita@mail.ru	7 (911) 920-57-67\n\nШмурун Александр Рудольфович	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:52.879	\N
cmnnlv6uf001ttjoge5977oph	cltenantdefault0000000000	Клиника (название не указано — см. адрес: Новочеркасский пр., д. 33, к. 3 Новочеркасский пр., д.)	Новочеркасский пр., д. 33, к. 3	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nВ столбце «Клиника» в реестре указано ФИО (Атрибьют Кидс), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «РЕМИ КИДС» ООО сверка ЭДО	195112, г. Санкт-Петербург,	7806562248	780601001	1197847148960	ПАО СБЕРБАНК г. Санкт-Петербург	044030653	\N	\N	\N	a.litvinov@centrstomatologii.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:53.032	\N
cmnnlv7uu007xtjogtek6edh1	cltenantdefault0000000000	Клиника (название не указано — см. адрес: Петергофское ш., д. 72)	Петергофское ш., д. 72	t	+7 988 631‑15‑10 администратор\n\nработают в ЭДО (Калуга Астрал)\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: stomluxor@gmail.com\n\nВ столбце «Клиника» в реестре указано ФИО (Люксор Петергофское), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «ЛЮКСОР» ООО ЭДО НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	198206, г. Санкт-Петербург,	7807252947	780701001	1217800181290	АО «Тинькофф Банк»	044525974	40702810510000954781	30101810145250000974	\N	stomluxor@gmail.com	Директор Танасова Анастасия Леонидовна	f	\N	t	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:54.342	\N
cmnnlv81h008vtjogit6bb8jv	cltenantdefault0000000000	Клиника (название не указано — см. адрес: Плесецкая ул., д. 6 Лыжный пер., д. 3)	Плесецкая ул., д. 6\nЛыжный пер., д. 3	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nВ столбце «Клиника» в реестре указано ФИО (Миллион Яблок), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «Роял Дентал Клиник» (ООО-бум.док)	197374, г. Санкт-Петербург,	7814595776	781401001	1137847483861	ОАО «Сбербанка России»	044030653	40702810055080003676	30101810500000000653	\N	klinika.my@yandex.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:54.582	\N
cmnnlv89v00a4tjogjnlvghpt	cltenantdefault0000000000	Клиника (название не указано — см. адрес: г. Гатчина, ул. Коли Подрядчикова, д. 22)	г. Гатчина, ул. Коли Подрядчикова, д. 22	f	Работаем от юр. лица: ИП Соколов\n\nВ столбце «Клиника» в реестре указано ФИО (Полный Порядок), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «СЗМ»	188300, Ленинградская обл., г. Гатчина, ул. Коли Подрядчикова, д. 22, помещ.1	4705065477	470501001	1144705002100	ПАО СБЕРБАНК г. САНКТПЕТЕРБУРГ	044030653	40702810655000008352	30101810500000000653	\N	szm.gtn@mail.ru	\N	f	\N	f	2401-037 от 07.03.2024	f	IP	\N	\N	2026-04-06 19:50:54.884	\N
cmnnlv9hz00hltjogp3q5huya	cltenantdefault0000000000	Клиника (название не указано — см. адрес: г. Иваново, ул. Степанова, д. 15)	г. Иваново, ул. Степанова, д. 15	t	Телефон\t8-920-677-55-12\n\nE-mail для договора/прайса: do.formula@mail.ru\n\nВ столбце «Клиника» в реестре указано ФИО (Формула Улыбки), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО Центр Стоматологии «Формула Улыбки»	г. Иваново, ул. Степанова, д. 15	3702746733	370201001	1143702030174	ТУЛЬСКОЕ ОТДЕЛЕНИЕ № 8604 ПАО СБЕРБАНК	047003608	40702810017000001968	30101810300000000608	\N	do.formula@mail.ru	Корнилова Елена Геннадьевна	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.472	\N
cmnokkui3003dtj50s97by9hc	cltenantdefault0000000000	ул. Парфёновская	д. 6, к. 2	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:37.036	\N
cmnokkte5001gtj507dvo2vxb	cltenantdefault0000000000	ул. Первомайская	д. 82/12	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.597	\N
cmnnlv6jd0003tjogvd3lkkot	cltenantdefault0000000000	Клиника (название не указано — см. адрес: г. Мурино Воронцовский б-р, д. 18)	г. Мурино\nВоронцовский б-р, д. 18	t	vlp201114@mail.ru\n+7 921 595 78 95\nЛюдмила Петровна\nисполнительный директор\n\n\nсчет на почту avismedcentr@mail.ru \n и врачу\n\n ООО-бум.доки\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: vlp201114@mail.ru\n\nВ столбце «Клиника» в реестре указано ФИО (Авис Мурино), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «Силуэт» ООО ЭДО	197701, г. Санкт-Петербург,	7814482451	781401001	1107847365911	\N	044525201	\N	\N	\N	avismedcentr@mail.ru	Захаров Алексей Анатольевич	f	\N	f	\N	t	OOO	\N	\N	2026-04-06 19:50:52.633	\N
cmnnn6fj5005gtj80ov6utseh	cltenantdefault0000000000	Клиника (название не указано — см. адрес: г. Павловск ул. Конюшенная, д. 2 ", "Пушкинская стомато)	г. Павловск	t	В столбце «Клиника» в реестре указано ФИО (Аллегро Большой), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:37.121	\N
cmnnlv6k50006tjog2w15qjg0	cltenantdefault0000000000	Клиника (название не указано — см. адрес: г. Сестрорецк ул. Всеволода Боброва, д. 39)	г. Сестрорецк\nул. Всеволода Боброва, д. 39	t	vlp201114@mail.ru\n+7 921 595 78 95\nЛюдмила Петровна\nисполнительный директор\n\n\nсчет на почту avismedcentr@mail.ru \n и врачу\n\n ООО-бум.доки\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: vlp201114@mail.ru\n\nВ столбце «Клиника» в реестре указано ФИО (Авис Сестрорецк), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «Силуэт» ООО ЭДО	197701, г. Санкт-Петербург,	7814482451	781401001	1107847365911	\N	044525201	\N	\N	\N	avismedcentr@mail.ru	Захаров Алексей Анатольевич	f	\N	f	\N	t	OOO	\N	\N	2026-04-06 19:50:52.661	\N
cmnnlv8tf00d2tjogjwjng5f9	cltenantdefault0000000000	Клиника (название не указано — см. адрес: г. Сургут пр.Пролетарский, д. 11)	г. Сургут\nпр.Пролетарский, д. 11	t	Телефон        \nтел./факс \n8 (3462) 21-61-21, \n8-922-251-23-53\n\n\n\n\n\nкоординатор по вопросам грузоперевозок \nСветлана Владимировна \n8-982-189-01-33\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: direktorvsesvoi@gmail.com, ortoped_ivanich@mail.ru\n\nВ столбце «Клиника» в реестре указано ФИО (Философия Ментора), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «Эскулап» ООО ЭДО	628406, Тюменская область,	8602159434	860201001	1098602009791	\N	044525411	40702810920280000281	30101810145250000411	\N	direktorvsesvoi@gmail.com, ortoped_ivanich@mail.ru	\N	f	\N	t	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.588	\N
cmnnlv9cp00gjtjogsc5dvt9k	cltenantdefault0000000000	Клиника (название не указано — см. адрес: г.ЧЕБОКСАРЫ ул. Пролетарская д.16 корп.2, пом.2)	г.ЧЕБОКСАРЫ\nул. Пролетарская д.16 корп.2, пом.2	t	Секрет Улыбки\n\nВ столбце «Клиника» в реестре указано ФИО (Секрет Улыбки), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «Улыбка»	428038, Чувашская Республика, г Чебоксары, Социалистическая ул, д. 2, помещ. 1	2130036763	213001001	1082130003427	Чувашское отделение №8613 - филиал ПАО "Сбербанк России"	049706609	40702810075000011078	30101810300000000609	\N	smileivanov@mail.ru	Иванов Петр Григорьевич	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.281	\N
cmnnlv8id00bdtjogpr2oxv05	cltenantdefault0000000000	Клиника (название не указано — см. адрес: наб. р. Смоленки 3/1)	наб. р. Смоленки 3/1	f	клиника не активна, не поступают заказы\n\nВ столбце «Клиника» в реестре указано ФИО (Смайл Клуб), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «СМАЙЛКИДСКОРП»	Р/с	7801693896	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:55.19	\N
cmnnlv9ep00gxtjog3chot1w5	cltenantdefault0000000000	Клиника (название не указано — см. адрес: пр-кт Маршала Блюхера, д. 7 к. 1 стр. 1)	пр-кт Маршала Блюхера, д. 7 к. 1 стр. 1	t	E-mail для договора/прайса: bndental@yandex.ru\n\nВ столбце «Клиника» в реестре указано ФИО (Белые Ночи), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО "КлиникА" ООО	195197, город Санкт-Петербург, пр-кт Маршала Блюхера, д. 7 к. 1 стр. 1, помещ. 7-н офис 1	7804682490	780401001	1217800069156	Филиал «Санкт-Петербургский» АО «Альфа-Банк»	044030786	40702810032180007826	30101810600000000786	\N	bndental@yandex.ru	Хандогин Леонид Борисович	f	\N	f	\N	t	\N	\N	\N	2026-04-06 19:50:56.354	\N
cmnnlv7tg007ptjogi7r3ejcg	cltenantdefault0000000000	ЛиксДент	Владимирский пр., д. 7	t	Работаем от юр. лица: ИП Соколов	ООО «Ликсдент» ИП-бум.д	191025, г. Санкт-Петербург, вн.тер.г. муниципальный округ Владимирский округ, Владимирский пр-кт, д. 7, лит. А, ПОМЕЩ. 8Н, КАБИНЕТ 2	7840095064	784001001	1217800013254	ПАО СБЕРБАНК	044030653	40702810655000086840	30101810500000000653	\N	liksdent@yandex.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:54.293	\N
cmnnlv8t000cztjog2r7uahce	cltenantdefault0000000000	Клиника (название не указано — см. адрес: пр. Пятилеток д. 9 к.1)	пр. Пятилеток д. 9 к.1	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nВ столбце «Клиника» в реестре указано ФИО (Фактор Улыбки Пятилеток), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «Памир» ООО ЭДО	193318, г. Санкт-Петербург,	7811782552	780201001	1187847384229	\N	044030786	\N	30101810600000000786	\N	chernyshey@factorsmile.ru	Хоннолайнен Любовь Анатольевна	f	\N	t	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.572	\N
cmnnlv8w500dltjogmtq8687z	cltenantdefault0000000000	Клиника (название не указано — см. адрес: ул. Заозерная д. 3, к.2 Смоленская ул., д.18 Смоленская)	ул. Заозерная д. 3, к.2	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nВ столбце «Клиника» в реестре указано ФИО (Чистое Дыхание), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «КЛИНИК ГРУПП» все счета ЧД на это юр.лицо\nООО сверка ЭДО	192283, г. Санкт-Петербург,	7810794153	781601001	1207800056650	"ФК ОТКРЫТИЕ"	044030795	40702810400230005250	30101810540300000795	\N	superdentistspb@gmail.com	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:55.685	\N
cmnnlv7q50076tjoguv8m155r	cltenantdefault0000000000	Клиника (название не указано — см. адрес: ул. Коллонтай, д. 17, к. 2)	ул. Коллонтай, д. 17, к. 2	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nВ столбце «Клиника» в реестре указано ФИО (Красивые Зубки), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «Красивые Зубки» ООО ЭДО НЕ ОТПР ИЗ 1С ФИЛИАЛ ДР.ПОЧТА - kollontay172@mail.ru	191002, Санкт-Петербург г,	7840470445	784001001	1127847267680	Филиал «Центральный»	044525411	40702810617350004996	30101810145250000411	\N	kollontay172@mail.ru	\N	f	\N	t	2411-008 13.11.24	t	OOO	\N	\N	2026-04-06 19:50:54.174	\N
cmnnlv8qn00cqtjogglbkwtoy	cltenantdefault0000000000	Клиника (название не указано — см. адрес: ул. Ленина д. 11/64 вход с ул. Полозова д.2 Коломяжский)	ул. Ленина д. 11/64	t	Пн-Вс: 9.00-21.00\n\n+7 (812) 426-97-69\n\npolozova@factorsmile.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: kaptur@factorsmile.ru\n\nВ столбце «Клиника» в реестре указано ФИО (Фактор Улыбки), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «Рубикон» ООО ЭДО	197136, г. Санкт-Петербург,	7813678733	781301001	1247800027970	ФИЛИАЛ «САНКТ-ПЕТЕРБУРГСКИЙ» АО «АЛЬФА-БАНК»	044030786	40702810532130013771	30101810600000000786	\N	kaptur@factorsmile.ru	Генеральный директор\nКаптур Елена Олеговна	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:55.487	\N
cmnnlv84i0099tjog3bgmiw94	cltenantdefault0000000000	Клиника (название не указано — см. адрес: ул. Манчестерская, д. 5, корп. 1 ул. Композиторов, д.12)	ул. Манчестерская, д. 5, корп. 1\nул. Композиторов, д.12	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: 1vek2020@mail.ru\n\nВ столбце «Клиника» в реестре указано ФИО (Новый Век), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО СЦ «НОВЫЙ ВЕК»	194156 г. Санкт-Петербург, ул. Манчестерская, д. 5, корп. 1, стр. 1, помещ. 180Н	7802950994	780201001	1247800027199	АО «ТИНЬКОФФ БАНК»	044525974	40702810210001587897	30101810145250000974	\N	1vek2024@mail.ru	Калинина Ульяна Олеговна\n+7 (981) 958-08-33	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:54.691	\N
cmnnlv9df00gntjoggz119q93	cltenantdefault0000000000	Клиника (название не указано — см. адрес: ул. Республиканская, д.24)	ул. Республиканская, д.24	t	E-mail для договора/прайса: Info@pitersmile.com\n\nВ столбце «Клиника» в реестре указано ФИО (Творим Совершенство), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «Семицветик»	195112, Российская Федерация, г. Санкт-Петербург, ул. Республиканская, д.24,корп1,стр1, офис 1-А, пом1-Н	7806612393	780601001	1237800085687	АО "ТИНЬКОФФ БАНК"	044525974	40702810710001458675	30101810145250000974	\N	Info@pitersmile.com	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.308	\N
cmnnlv99q00fztjogtizt9pwf	cltenantdefault0000000000	Клиника (название не указано — см. адрес: ул.Аптекарский д.18)	ул.Аптекарский д.18	t	В столбце «Клиника» в реестре указано ФИО (Ай Орто), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «ОРТО КЛУБ СПБ» ООО ЭДО	197022, Санкт-Петербург, Аптекарский пр-кт, дом 18 литера А, пом. 809-Н	7813614218	781301001	1187847173183	ФИЛИАЛ "САНКТ-ПЕТЕРБУРГСКИЙ" АО "АЛЬФА-БАНК"	044030786	40702810732410001423	30101810600000000786	\N	sdv.spb@iorthocenter.ru	Журавлева Светлана Викторовна	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.175	\N
cmnokktq1002btj502qqr72nf	cltenantdefault0000000000	Литейный пр.	д. 45/8", "Пандент	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.026	\N
cmnnlv7tz007stjogxc464xfi	cltenantdefault0000000000	Личный адрес	\N	t	Также в исходной строке было название: см. комментарии	[object Object]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:54.311	\N
cmnnlv7q10075tjogfcz15htt	cltenantdefault0000000000	Клиника (название не указано — см. адрес: ул.Большая Зеленина, д. 29а)	ул.Большая Зеленина, д. 29а	t	05-11-09@mail.ru СБИС\n\nТелефон администратора:\n7-921-900-97-09\n\nРаботаем от юр. лица: ИП Соколов\n\nВ столбце «Клиника» в реестре указано ФИО (Корпорация Улыбок), а не название организации. Карточка заведена под служебным названием: укажите реальное название клиники и перенесите человека в справочник врачей.	ООО «КОРПОРАЦИЯ УЛЫБОК» ИП бум.доки	197110, г. Санкт-Петербург,	7813615613	781301001	1187847201255	\N	044525999	40702810503500029197	30101810845250000999	\N	Smilecorpspb@gmail.com	Чистяков Федор Олегович	f	\N	t	\N	f	IP	\N	\N	2026-04-06 19:50:54.17	\N
cmnnlv7k4006btjog83i7lucf	cltenantdefault0000000000	Клиника 32	Комендантский пр., д. 25 к. 1	t	33 66 032 это клиника.  \n89219992032 мобильный клиники.\nfinance@klinika32.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Клиника 32»	197371, Россия,	7814582777	781401001	1137847323349	Северо-западный филиал ПАО РОСБАНК	044030778	\N	\N	\N	klinika32info@mail.ru	\N	f	\N	t	2411-011\t18.11.24	f	OOO	\N	\N	2026-04-06 19:50:53.956	\N
cmnnlv9h600hftjoghua7t9cu	cltenantdefault0000000000	Клиника Stom max	Пискаревский пр.т, 1	t	Екатерина, админ ТГ @katerina_velikayaa\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «СТОМЛАЙТ» ООО ЭДО	195027, г Санкт-Петербург, наб Свердловская,	7806588373	780601001	1217800100726	ФИЛИАЛ ПАО "БАНК УРАЛСИБ" В Г.	044030706	40702810822000008197	30101810800000000706	\N	StommaxSpb@yandex.ru	Вершинский Виталий Валерьевич	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.442	\N
cmnnlv7kg006dtjog6k4m79fp	cltenantdefault0000000000	Клиника Будовского	пр. Московский, д. 37/1	f	клиника не активна, не поступают заказы с ноября 2023г\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Маршал»	190005, Санкт-Петербург г,	7839410258	783901001	1097847258574	"ФК	044030795	40702810501000119123	30101810540300000795	\N	zacupki@budovsky-dent.ru	\N	f	\N	f	№ 2509-006\n18.09.2025	t	OOO	\N	\N	2026-04-06 19:50:53.968	\N
cmnnlv9hg00hhtjoggxcz4wce	cltenantdefault0000000000	Клиника Гармония	пер. Большой Казачий, д.11	t	E-mail для договора/прайса: garmoniadentalclinic@gmail.com	ООО «АГА»	191180, город Санкт-Петербург, Большой Казачий пер, д. 11 литера А, помещ. 35-н	7838123469	783801001	1247800055590	ПАО "БАНК "САНКТ-ПЕТЕРБУРГ"	044030790	\N	30101810900000000790	\N	allasmal1982.27@gmail.com	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.453	\N
cmnnlv7ko006ftjogcp6pir7z	cltenantdefault0000000000	Клиника Доброго Стоматолога	ул. Коллонтай, д. 17, корп. 2	t	info@stom.ru\n\n13.10.23 выслал прайс\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «КДС-1» ООО ЭДО СВЕРКА 2р/мес	197348, г. Санкт-Петербург,	7814316422	781401001	1057810163620	России»	044030653	40702810355070183015	30101810500000000653	\N	buh@stom.ru	\N	f	\N	t	2407-006 \n30.07.24	t	OOO	\N	\N	2026-04-06 19:50:53.977	\N
cmnnlv9ac00g3tjog19q3lhqv	cltenantdefault0000000000	Клиника Доктора Ходакова	г.Санкт-Петербург\nМичуринская, д. 14/3, литера А	t	E-mail для договора/прайса: info@clinicahodakova.ru	ООО «ВИКТОРИЯ»	197046, Г.Санкт-Петербург, вн.тер.г. Муниципальный Округ Посадский, ул. Мичуринская, д. 14/3, литера А	4703072091	781301001	1044700556438	Северо-Западный Банк ПАО Сбербанк	044030653	40702810655000119843	30101810500000000653	\N	info@clinicahodakova.ru	Боброва Алёна Валерьевна	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.196	\N
cmnnlv9jr00i0tjog7caehugi	cltenantdefault0000000000	Клиника Зубастик	Ленинский 97/3	t	\N	ООО «ССК "Зубастик 24» ООО ЭДО	198330, город Санкт-Петербург, Ленинский пр-кт, д.97 к.3, литер а, помещение 3-н	7807332906	780701001	1089847089969	Ф-л  «Северо-Западный» ПАО Банк «ФК Открытие»	044030795	40702810100050027349	30101810540300000795	\N	skanceva@mail.ru	Светлана Сергеевна Пехтерева	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.536	\N
cmnnn6ir90093tj80vgxn9gav	cltenantdefault0000000000	Клиника Седых	Тамбовская область,, Тамбовский р-он,, п. Строитель, мкр.	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	Нет договора	f	IP	\N	\N	2026-04-06 20:27:41.301	\N
cmnnlv7mo006ptjogu9u7jeib	cltenantdefault0000000000	Клиника Седых , , , мкр. Северный	Тамбовская область\nТамбовский р-он\nп. Строитель, мкр.\nСеверный, д.45. кв.95.	f	Работаем от юр. лица: ИП Соколов	ООО «Стоматологическая клиника доктора Седых»	392525, РФ, Тамбовская область, Тамбовский р-он, п. Строитель, мкр.	6820033364	682001001	1126820001670	г.Тамбов	046850649	40702810961000002689	30101810800000000649	\N	sd-clinic@yandex.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:54.049	\N
cmnnlv7ms006qtjog77057cg4	cltenantdefault0000000000	Клиника Столяровой	г. Пушкин, ул. Широкая, д.20	t	7163121@bk.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «С.К.С.»	196608, г. Санкт-Петербург, г. Пушкин, ул. Широкая, дом 20	7820038170	782001001	1037842005651	«ФК ОТКРЫТИЕ»	044030795	40702810801076500505	30101810540300000795	\N	7163121@bk.ru	Директор  \nТ.В. Столярова	f	\N	t	2405-015\t27.05.24	f	OOO	\N	\N	2026-04-06 19:50:54.053	\N
cmnnlv7nb006stjogcnfbqqwu	cltenantdefault0000000000	Клиника Стомат	ул. Маршала Казакова, д. 78, к. 1	f	клиника не активна, не поступают заказы с ноября 23г\n\n\nkazakova78k1@gmail.com	ООО «Стомат»	198332, г. Санкт-Петербург,	7807164909	780701001	1177847104115	\N	044525974	40702810310000156860	30101810145250000974	\N	kazakova78k1@gmail.com	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:54.071	\N
cmnnlv7nf006ttjogzmlzyy9w	cltenantdefault0000000000	Клиника ЮНИМЕД	Измайловский пр., д. 9/2	t	poliv2015@bk.ru, info@unimedspb.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Клиника ЮНИМЕД» ООО бум.доки	190005, г. Санкт-Петербург,	7839045301	783901001	1157847353619	Филиал ПАО Банк УралСиб	044030706	40702810022220001680	30101810800000000706	\N	poliv2015@bk.ru, info@unimedspb.ru	Мурашко Валентин Николаевич	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:54.075	\N
cmnokktnx0025tj501mj2p6sh	cltenantdefault0000000000	Ломаная ул.	д. 5", "КомФорт	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.949	\N
cmnokkuax0038tj50w4la54qx	cltenantdefault0000000000	ул. Пулковская	д.8, к.1	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.778	\N
cmnnlv7li006itjoggs8li9es	cltenantdefault0000000000	Клиника доктора Василенко / Свой стоматолог	Кондратьевский пр., д. 39	t	8 965 772-16-85 - финансовый директор Кузнецова Виктория Васильевна\n\n8 981-113-61-05 - Ирина (админы сказали что по ЭДО к ней)\n\nbuhlomo@mail.ru  \nРанее счета отправляли на эту почту. С 09.25 дали новый адрес\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Надежда» ООО ЭДО	195197, г. Санкт-Петербург,	7827000352	780401001	1027812404817	\N	044525974	\N	\N	\N	gerasimova@vasilenko.clinic	\N	f	\N	t	2405-009 от 22.05.24\n\nДС №1 от 09.01.25	f	OOO	\N	\N	2026-04-06 19:50:54.007	\N
cmnnlv7lt006ktjog36z40ujd	cltenantdefault0000000000	Клиника доктора Кончаковского	​Аптекарский пр., д. 5	t	8 (999) 220-21-12 клиника\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «БОТАНИКА» ООО ЭДО НАПР. ДОГОВОР В НОВ.РЕДАКЦИИ	197376, г. Санкт-Петербург,	7813653753	781301001	1217800081982	«Санкт-Петербург»	044030790	40702810590550003009	30101810900000000790	\N	konchakovsky_dental@mail.ru	\N	f	\N	t	2501-001 09.01.25	t	OOO	\N	\N	2026-04-06 19:50:54.017	\N
cmnnlv7mi006otjogzqq05bz5	cltenantdefault0000000000	Клиника доктора Маркосян	Ростов на Дону	f	клиника не активна, не поступают заказы\n\n\ns.d.c.dr.markosyan@mail.ru\n\nМаркосян Оганес\n+7 928 611 14 11\n\nРаботаем от юр. лица: ИП Соколов	ООО «Стоматологическая Клиника Доктора Маркосяна» ИП	344058, Ростовская обл., г.о. город Ростов-на-Дону, г. Ростов-на-Дону, ул. Крупской, Д. 82/2, ПОМЕЩ. 29	6162087158	616201001	1226100005372	\N	\N	\N	\N	\N	s.d.c.dr.markosyan@mail.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:54.042	\N
cmnnlv93g00extjogdz3b9ft9	cltenantdefault0000000000	Клиника стоматологии Медея	Сертолово, ул. Молодцова, д.7, корп.3	t	документы возим им только в бумажном виде! просьба от старшей мед.сестры\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: medeiasly@yandex.ru ; irina.klubenkova@yandex.ru	ООО «Забота» ООО бум.доки НЕТ ДОГОВОРА!	188650, Ленинградская область, Всеволожский р-н, г Сертолово, мкр. Сертолово-1, ул Молодцова, д. 7 к. 3, помещ. 2н	4703096141	470301001	1074703003638	Северо-Западный Банк ПАО Сбербанк России	044030653	40702810255410000612	30101810500000000653	\N	medeiasly@yandex.ru	\N	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:55.948	\N
cmnnlv9ed00gutjog6fnxcb9z	cltenantdefault0000000000	Клиника функциональной стоматологиии Евгении Куприяновой	г. Сыктывкар, Покровский бульвар д.3	t	78212726262	ООО «ДИНАСТИЯ СТОМ» ООО ЭДО	167904, Республика Коми, г. о. Сыктывкар,	1101178144	110101001	1241100000184	ПАО Сбербанк	048702640	\N	\N	\N	gnatologkomi@yandex.ru	Коковкина Ирина Александровна	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.341	\N
seed-clinic-klinikaklik	cltenantdefault0000000000	КлиникаКлик	Спб, Улица Тест, дом1	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:51.917	\N
cmnokkt1j000ltj50d1ryhb5j	cltenantdefault0000000000	Коломяжский пр.	д. 20", Фактор Улыбки	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.143	\N
cmnnlv7p30071tjoge93z4rtt	cltenantdefault0000000000	КомФорт	Загребский б-р, д.9	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «КомФорт» ООО-ЭДО	192284, г. Санкт-Петербург,	7816474551	781611001	1097847309614	ПАО «Сбербанк России»	044030653	40702810255230002515	30101810500000000653	\N	info@dent-komfort.ru	\N	f	\N	t	2408-009 28.08.24	t	OOO	\N	\N	2026-04-06 19:50:54.136	\N
cmnokku3t002vtj50hcf5icau	cltenantdefault0000000000	Комендантский пр.	д. 25 к. 1	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.521	\N
cmnnlv7nl006utjogmvmsb7k5	cltenantdefault0000000000	Комплекс /Сomplex clinic	Прилукская ул., д. 20	t	7 (812) 240-78-45\n\nРаботаем от юр. лица: ИП Соколов	ООО «КОМПЛЕКС КЛИНИК» ИП ЭДО	192007, г. Санкт-Петербург,	7816722324	781601001	1217800146288	\N	044030786	\N	30101810600000000786	\N	order@complex.clinic	генеральный директор Ишталов Руслан Рамазанович	f	\N	t	ИП2502-012\t25.02.2025	t	IP	\N	\N	2026-04-06 19:50:54.081	\N
cmnnlv7p80072tjog3n21mr8h	cltenantdefault0000000000	Конфиденция	Новгородская ул., д. 13	t	Платежные дни вторник и четверг\n\nРаботаем от юр. лица: ООО КЛИКЛаб	выставлять на ООО «Дентал Депо» ООО ЭДО МОРОЗОВ МИХАИЛ СЕРГЕЕВИЧ (ООО-ЭДО)\nИНН 695001671156	170028, г. Тверь, ул. Лукина, д. 6, кв. 3	7842224332	781301001	1207800142494	ФИЛИАЛ «САНКТ-ПЕТЕРБУРГСКИЙ»	044030786	40802810932000004242	30101810600000000786	\N	Tatiana.ivanova@konfidencia.ru	Генеральный директор Минашкин Сергей Валерьевич, \nдействует на основании устава	f	\N	t	\N	t	OOO	\N	\N	2026-04-06 19:50:54.14	\N
cmnnn6dcb000ltj80cq816apg	cltenantdefault0000000000	Корпорация улыбок	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:34.284	\N
cmnokkt4e000ttj50ay81drvo	cltenantdefault0000000000	Костромской пр.	д. 10", Асгард	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.246	\N
cmnokksf40001tj50ekdl2flo	cltenantdefault0000000000	Красносельское ш.	д. 54, к. 6	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:34.337	\N
cmnnlv7ql0078tjogq062pegc	cltenantdefault0000000000	Кредус / CREDUS	Кушелевская дор., д. 3, к. 2	t	инфа от врача 22.04.25- счета направлять на почту \nzakaz@credus.su\n\nзапросил сотрудничество доктор Шатилов\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: info@credus.su	ООО «Смайл Дизайн» ООО ЭДО	195220, г. Санкт-Петербург,	7805343282	780401001	1157847455985	ПАО «БАНК "САНКТ-ПЕТЕРБУРГ»	044030790	\N	\N	\N	zakaz@credus.su	\N	f	\N	t	2501-003 09.01.25	t	OOO	\N	\N	2026-04-06 19:50:54.19	\N
cmnnlv7rv007etjogep3c7x3h	cltenantdefault0000000000	Кристалл	ул. Заставская, д. 44	t	7 921 585-98-28\n7 812 214-13-78\n\nРаботаем от юр. лица: ИП Соколов	ООО «ЦИС «Кристалл» ИП бум.доки	196084, г. Санкт-Петербург,	7810691373	781001001	1177847200740	\N	044030786	\N	\N	\N	cis.kristall@gmail.com	Генеральный директор Бя Станислав Чердюнович	f	\N	t	\N	f	IP	\N	\N	2026-04-06 19:50:54.235	\N
cmnokksgm0004tj50ua0h3foq	cltenantdefault0000000000	Новочеркасский пр.	д. 33, к. 3", "Атрибьют Клиник ОП /	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:34.39	\N
cmnokkshy0005tj50bl8r3cnn	cltenantdefault0000000000	Новый Век	ул. Композиторов, д.12	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:34.438	\N
cmnnlv90e00ebtjogofjhducq	cltenantdefault0000000000	Крона Дент	ул.Стремянная, д.16	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: krasikova@berlinstoma.ru	ООО «БЕРЛИН СТОМА ЦЕНТР» ООО ЭДО	191025, Г.Санкт-Петербург, вн.тер. г. Муниципальный Округ Владимирский Округ, ул Стремянная, дом 16, литера А, помещение 3-Н, офис 101	7840100074	784001001	1227800042690	ПАО "БАНК "САНКТ-ПЕТЕРБУРГ"	044030790	40702810590700002300	30101810900000000790	\N	krasikova@berlinstoma.ru	Генеральный директор:        \nМкртичян Артём Альбертович	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.838	\N
cmnnlv7s0007ftjogvnfxlnl0	cltenantdefault0000000000	Крона Дент д.	Кудрово ул.Пражская, д. 7	t	Тел/факс +7 (812) 425-15-51\nE-mail kudrovo@berlinstoma.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «БЕРЛИН СТОМА КУДРОВО» ООО ЭДО НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	188691, Ленинградская область,	4703159553	470301001	1184704017541	«Санкт-Петербург»	044030790	40702810690330002984	\N	\N	krasikova@berlinstoma.ru	\N	f	\N	t	2411-017        25.11.24	t	OOO	\N	\N	2026-04-06 19:50:54.241	\N
cmnokku9r0037tj50bhyvkxps	cltenantdefault0000000000	Кудрово,	ул. Столичная д.4, к.4	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.736	\N
cmnnlv7sc007htjog1qfvnwqf	cltenantdefault0000000000	Куик Дентал	пр. Космонавтов, д. 61, к. 1	t	В связи с изменением с 28.12.2024г. паспортных данных Генерального директора ООО "Куик Дентал" на Энфенджян Любовь Михайловну просим внести изменения в первичные документы (договора, акты, УПД) и учесть данную информацию при составлении новых документов.\n\nС уважением, Энфенджян Л.М.\n\nот нашего бухгалтера 31.01.2025\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Куик Дентал» ООО ЭДО	196142, г. Санкт-Петербург,	7810408873	781001001	1147847138405	ПАО СБЕРБАНК, Г. САНКТ-ПЕТЕРБУРГ	044030653	40702810655000005290	30101810500000000653	\N	quickdental@yandex.ru	Энфенджян Любовь Михайловна	f	\N	t	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:54.253	\N
cmnnlv96u00fjtjogy9xupdv9	cltenantdefault0000000000	Куик Дентал	26-я линия Васильевского острова, 7	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Куик Дентал» ООО ЭДО	196142, г. Санкт-Петербург,	7810408873	781001001	1147847138405	ПАО СБЕРБАНК, Г. САНКТ-ПЕТЕРБУРГ	044030653	40702810655000005290	30101810500000000653	\N	quickdental@yandex.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.07	\N
cmnokkuie003etj50p9rd4w03	cltenantdefault0000000000	Кушелевская дор.	д.3, к. 2	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:37.047	\N
cmnnlv9il00hrtjogyn7jtsvu	cltenantdefault0000000000	ЛД клиник	Ул. Тамбовская д. 13	t	Телефон        +7-812-209-21-38, +7-921-939-21-38\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: admin@ldclinic.spb.ru	ООО «ЛД» ООО ЭДО	ул. Тамбовская д.13 лит. А пом. 6-Н	7816654434	781601001	1177847392579	ПАО АКБ "АВАНГАРД"	044525201	40702810202100032492	30101810000000000201	\N	admin@ldclinic.spb.ru	Генеральный директор\tДерябин Павел Михайлович	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.494	\N
cmnnlv7sq007jtjog59ktx8y2	cltenantdefault0000000000	Лайт Дентал Груп / Light Dental Group	ул. Кременчугская, д. 17, к. 2	t	ldg-clinic.ru\n+7 (965) 007-73-33\n+7 (812) 309-49-85\nпн-сб 09:00–21:00\nhello@ldg-clinic.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Квалифицированная стоматология» ООО ЭДО НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	191167 г. Санкт-Петербург,	7842119031	784201001	1167847397233	К/счет 30101810500000000653	044030653	40702810355000051447	30101810500000000653	\N	ksinfodent@mail.ru	\N	f	\N	t	2412-001        03.12.24	t	OOO	\N	\N	2026-04-06 19:50:54.266	\N
cmnnlv7st007ktjog6nh7w94p	cltenantdefault0000000000	Лайт Стом	г. Мурино\nВоронцовский б-р, д. 10	f	Работаем от юр. лица: ООО КЛИКЛаб	ООО «МЕРЦАНИЕ»	188669, Ленинградская обл.,	4703152269	470301001	1174704013912	\N	044525974	40702810210000218594	30101810145250000974	\N	lightstom@bk.ru	\N	f	\N	f	2405-019 от 21.05.24	t	OOO	\N	\N	2026-04-06 19:50:54.27	\N
cmnokkt14000ktj50t0waaxn3	cltenantdefault0000000000	Ландышевая ул.	д. 104	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.129	\N
cmnnlv7sy007ltjog4kos5w6i	cltenantdefault0000000000	Лахта Дентал	Ковенский пер., д.5	t	Управляющая Галина Вячеславовна\n По всем вопросам договора. или оплаты счетов можно связываться с ней-    tesakova_g@lahtaclinic.ru\n\nЯковлева Ольга Анатольевна\nСтаршая медицинская сестра ol@lahtaclinic.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Лахта Дентал» ООО сверка ЭДО	191014, Санкт-Петербург, Ковенский переулок, д.5, лит.Б, пом.9-Н	7841094049	784101001	1217800070388	\N	044525593	40702810101100032490	30101810200000000593	\N	\N	\N	t	\N	t	ДС №1 от 09.01.25 подписано\n\n2408-003\n20.08.24	t	OOO	\N	\N	2026-04-06 19:50:54.274	\N
cmnnlv7t1007mtjogvzu1xvqb	cltenantdefault0000000000	Ленина 18	г. Зеленогорск\nпр-кт Ленина, д. 18	f	Отказались от работы (пациент не готов платить) договор платить некогда\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «ЛЕНИНА 18»	г. Санкт-Петербург, г. Зеленогорск, пр-кт Ленина, д. 18, лит. А, ПОМЕЩ. 1Н, ПОМЕЩ. 30, 197720	7814831230	781401001	1237800138333	ФИЛИАЛ "ЦЕНТРАЛЬНЫЙ" БАНКА ВТБ (ПАО)	044525411	40702810726530000821	30101810145250000411	\N	e415stoma@mail.ru \n9456598@rambler.ru	\N	f	\N	f	2411-001        01.11.24	f	OOO	\N	\N	2026-04-06 19:50:54.278	\N
cmnokku06002ptj50lzeweh0s	cltenantdefault0000000000	Ленинградская область	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.391	\N
cmnnlv7tc007otjogh2lzof1i	cltenantdefault0000000000	Леош	г. Сыктывкар, Сысольское шоссе, д.1/2	f	клиника не активна, не поступают заказы с декабря 23г	ООО «Стоматология ЛЕОШ»	167004 Республика Коми, г. Сыктывкар, Сысольское шоссе, д.1/2, Н-10	1101082940	110101001	1101101011208	ПАО Сбербанк г.Сыктывкар	048702640	40702810328000098181	30101810400000000640	\N	leonic@yandex.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:54.288	\N
cmnokktq9002ctj50ut19k4ww	cltenantdefault0000000000	ул. Савушкина, д. 17	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.033	\N
cmnokkson000btj503fiyxypc	cltenantdefault0000000000	ул. Тележная	д. 32", "Марка	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:34.679	\N
cmnnlv8zy00e8tjog1k8o795y	cltenantdefault0000000000	Лор+ г. Арзамас	ул. Матросова, 13	t	8-986-747-50-03\n8(83147)7-50-08\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: lor_plus@mail.ru	ООО «ЛОР +» ООО ЭДО НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	607220, Нижегородская область, г.Арзамас, ул.Матросова, д.13, пом.П-7	5243039954	524301001	1205200040605	АО комбанк «Арзамас»	042202731	40702810000000001222	30101810522020000731	\N	lor_plus@mail.ru	Директор  Ивашечкина Екатерина Вячеславовна	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.822	\N
cmnnlv94c00f4tjogzlc6opwi	cltenantdefault0000000000	Лотус Дент	Москва, Нагатинская наб., 46	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: lotus-dent@mail.ru\ndoc.zorikto@gmail.com	ООО «АРАН-М» ООО ЭДО	115470, Россия, г. Москва, наб. Нагатинская, д.46	7725493620	772501001	1187746526681	\N	044525974	40702810210001243885	30101810145250000974	\N	lotus-dent@mail.ru	Базаржапов Зорикто Эрдынеевич\nТел. 8 (916) 465-89-72\nПочта: doc.zorikto@gmail.com	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.981	\N
cmnnlv7u3007ttjog9ti3lp2b	cltenantdefault0000000000	ЛюксДент	ул. Стародеревенская, д.33/10	f	Работаем от юр. лица: ИП Соколов	ООО «НА СТАРОДЕРЕВЕНСКОЙ»	197372, Санкт-Петербург, ул. Стародеревенская, д.33/10   пом.21-Н, лит.Б	7814303279	781401001	1047855034677	\N	044030653	\N	\N	\N	\N	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:54.315	\N
cmnokktzz002otj509php12jh	cltenantdefault0000000000	Люксор Новоселье	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.384	\N
cmnnlv7u8007utjogdz67bls5	cltenantdefault0000000000	Люксор Новоселье Ленинградская область п.	Новоселье ул. Невская, д.6	t	+7 988 631‑15‑10 администратор\n\nработают в ЭДО (Калуга Астрал)\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: stomluxor@gmail.com	ООО «ЛЮКСОР» ООО ЭДО НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	198206, г. Санкт-Петербург,	7807252947	780701001	1217800181290	АО «Тинькофф Банк»	044525974	40702810510000954781	30101810145250000974	\N	stomluxor@gmail.com	Директор Танасова Анастасия Леонидовна	f	\N	t	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:54.32	\N
cmnnlv7v9007ytjogci7f9r5j	cltenantdefault0000000000	М-Клиник	Приморский пр, д. 137	t	info-mclinic@yandex.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «М-КЛИНИК» ООО ЭДО	197374, г.Санкт-Петербург, Приморский пр, д. 137,	7814587849	781401001	1137847385169	ПАО	044030653	40702810055000073026	30101810500000000653	\N	info-mclinic@yandex.ru	\N	f	\N	t	2405-025       31.05.24	t	OOO	\N	\N	2026-04-06 19:50:54.358	\N
cmnnlv7xd0088tjogoxtix56c	cltenantdefault0000000000	МДС / MDC	Малый просп. Васильевского острова, 11	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Дентал» ООО-ЭДО	199178, город Санкт-Петербург,	7801722096	780101001	1237800034812	"ФК ОТКРЫТИЕ"	044030795	40702810201590027151	30101810540300000795	\N	Dentalstom2023@gmail.com	\N	f	\N	t	2409-022 от 20.09.24	t	OOO	\N	\N	2026-04-06 19:50:54.433	\N
cmnnlv821008xtjog3pjrzufo	cltenantdefault0000000000	МИП Институт стоматологии	Заневский пр-кт, д. 1/82\nЗаневский пр., д. 1/82	t	7 (92 1)3 12-13-95 -Гульнара Фаридовна - старший админ\n\n\n+79816862980 Евгения ЧульжановаСтаршая мед сестра\n\nРаботаем от юр. лица: ИП Соколов	ООО МИП «Институт стоматологии» ИП ЭДО	195112, город Санкт-Петербург, Заневский пр-кт, д. 1/82 литера а, помещ. 63	7806534811	780601001	1147847356249	ПАО АКБ "АВАНГАРД"	044525201	40702810002100022482	30101810000000000201	\N	mipinfo@mail.ru	\N	f	\N	t	\N	t	IP	\N	\N	2026-04-06 19:50:54.602	\N
cmnnlv7vd007ztjogr5pn5q9w	cltenantdefault0000000000	МаксДентал / MaxDental	г. Колпино.,, ул.Тазаева д.3	t	89119279393 -тел.админов клиники\n88122435050\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «МаксДентал» сверка	196655 Санкт-Петербург,	7817112321	781701001	1217800006357	АО «Тинькофф Банк»	044525974	40702810110000780245	30101810145250000974	\N	kolpinostomatolog@mail.ru	\N	t	\N	t	2411-020        27.11.24	f	OOO	\N	\N	2026-04-06 19:50:54.362	\N
cmnnlv7vi0080tjoglsxig7lp	cltenantdefault0000000000	Максидент	г. Калининград	t	info@maxident39.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «МАКСИДЕНТ» ООО-ЭДО	236029, Калининградская обл., г.о. город Калининград, г. Калининград, ул. В.Гакуна, д. 9, ОФИС 9	3906319465	390601001	1143926008929	«Санкт-Петербург» г. Калининград	042748877	40702810300000118159	30101810927480000877	\N	info@maxident39.ru	\N	f	\N	t	ДС №1 от 09.01.25 до 30.06.25\n\n\n2405-013 от 27.05.2024	t	OOO	\N	\N	2026-04-06 19:50:54.366	\N
cmnnlv7vy0081tjog3exlk52m	cltenantdefault0000000000	Марка	пр. Юрия Гагарина, д. 37	t	клиника 7 981 127 37 37\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «МАРКА» ООО ЭДО	196135, г. Санкт-Петербург,	7810508620	781001001	1089847094820	ПАО Сбербанк г. Санкт-Петербург	044030653	40702810955000086760	30101810500000000653	\N	Sk_marka37@mail.ru	\N	f	\N	t	2411-013 19.11.24	t	OOO	\N	\N	2026-04-06 19:50:54.382	\N
cmnnlv7wa0082tjogly9aq70z	cltenantdefault0000000000	Мастер-дент	Приморский пр., д.3	t	masterdentspb@gmail.com\n8-812-407-00-16\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: masterdentspb@gmail.com, zuzin_oleg@mail.ru	ООО «Мастер-Дент» ООО ЭДО	197183, Санкт-Петербург,	7817019040	781401001	1027807576125	Филиал «Санкт-Петербургский»	044030786	40702810332450000541	30101810500000000786	\N	masterdentspb@gmail.com, zuzin_oleg@mail.ru, ​​a2725182@gmail.com -сюда счета	Генеральный директор\nМалиновская Наталья Евгеньевна	f	\N	t	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:54.395	\N
cmnnn6g3j0066tj800vzsfbjh	cltenantdefault0000000000	Мастер-дент	Приморский пр., д.3	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:37.855	\N
cmnnn6doe001itj80pmj2x8zb	cltenantdefault0000000000	Мастерская улыбок	\N	t	Также в исходной строке было название: ZM Clinic	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:34.719	\N
cmnokkslh0008tj50nn7i9mwr	cltenantdefault0000000000	Мастерская улыбок, ZM Clinic	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:34.566	\N
cmnokktld001ytj50lmrv6ttu	cltenantdefault0000000000	ул. Уральская	д. 2/14	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.857	\N
cmnokktep001itj50vqpqmhh8	cltenantdefault0000000000	ул. Чайковского	д. 5/10	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.617	\N
cmnokkt6m0010tj50v1fgmcrm	cltenantdefault0000000000	ул.Адмирала Коновалова 2-4	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.326	\N
cmnnlv7wt0085tjoghl4b4gku	cltenantdefault0000000000	Мастодонт	Общественный пер., д. 5	f	7 (921) 955-08-22\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Оникс» ООО ЭДО	192029, г. Санкт-Петербург,	7811801036	781101001	1247800083629	АО «Тбанк»	044525974	40702810310001843525	30101810145250000974	\N	9550822@mail.ru	Ерусланова Мария Сергеевна	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:54.414	\N
cmnnlv9bf00gbtjogboe866u2	cltenantdefault0000000000	Матис ул.Стремянная 3	Лыжный пер., 4, корп. 3	t	E-mail для договора/прайса: matisdent@gmail.com	ООО «Матис» Бум.Доки	191025, г. Санкт-Петербург, ул. Стремянная, д.3, лит. А, пом.6Н	7840468164	784001001	1127847178183	СЕВЕРО-ЗАПАДНЫЙ БАНК ПАО	044030653	40702810255000068776	30233810655000101000	\N	matisdent@gmail.com	Хамзаева Анжелика Зигмундовна	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.236	\N
cmnnlv7wy0086tjog4ihsx023	cltenantdefault0000000000	Маэстро	Костромской пр., д.10\nКостромской пр., д. 10", Асгард, ул. Оптиков д. 51 к. 1	t	Контакты: +7 812 616‑04-08 \ninfo@maestro-clinic.ru \n\nhttps://maestro-clinic.ru  \n\nпн-сб 9:00–21:00\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «СК Профессора Генриха Хацкевича» ООО ЭДО	Российская Федерация, 194917, Санкт-Петербург г, пр-кт. Костромской, д.10, лит.А, пом.28Н	7802585935	780201001	1167847282118	АО «Альфа-Банк» г. Санкт-Петербург офис «Выборгский» филиала «Санкт-Петербургский»	044030786	40702810232260001429	30101810200000000786	\N	6160408@mail.ru	\N	f	\N	t	2408-002 от 13.08.2024 г.	t	OOO	\N	\N	2026-04-06 19:50:54.419	\N
cmnnlv7xr008atjogbsxhspke	cltenantdefault0000000000	Мегаполис Дент	Московский пр., д.155	f	Работаем от юр. лица: ИП Соколов	ООО «СП Мегаполис Дент»	196128, Санкт-Петербург,	7838379968	781001001	1077847303445	\N	044030786	40702810532400002700	30101810600000000786	\N	megapolisdent02@mail.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:54.448	\N
cmnnlv97z00fptjogff6ssm2i	cltenantdefault0000000000	МедГарант	Петровский просп., 5	t	Также в исходной строке было название: 5 НЕТ ДОГОВОРА!	ООО «МедГарант Петровский» НЕТ ДОГОВОРА!	197198, г. Санкт-Петербург, проспект Петровский, дом 5, строение 1, помещение 28-Н	7813684046	781301001	1247800112845	в Северо-Западном банке ПАО Сбербанк	044030653	40702810755000146729	30101810500000000653	\N	\N	Корольков Валерий Анатольевич	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.112	\N
cmnnlv7yb008dtjog4560z6qf	cltenantdefault0000000000	МедГарант Девяткино	г. Мурино, бульвар Менделеева, д. 9, к. 1	t	бумажный счет с работой едет!\n\nРаботаем от юр. лица: ИП Соколов\n\nE-mail для договора/прайса: kav@medgarant-spb.ru	ООО «МедГарант Девяткино» ИП ЭДО	188678, Ленинградская обл.,	4703145409	470301001	1164704058188	ПАО СБЕРБАНК	044030653	40702810755000044355	30101810500000000653	\N	kav@medgarant-spb.ru	\N	f	\N	t	23/10-037-1 от 16.11.2023\n\nДоп. соглашение от 30.05.24 Прайс v 3.6	t	IP	\N	\N	2026-04-06 19:50:54.467	\N
cmnnlv7yl008etjog06s4rikq	cltenantdefault0000000000	МедГарант Московский	ул. Киевская, д. 3	t	бумажный счет с работой едет!\n\ninfo@medgarant-spb.ru \n8 (812) 501-10-14\n\nРаботаем от юр. лица: ИП Соколов\n\nE-mail для договора/прайса: kav@medgarant-spb.ru	ООО «МедГарант Московский» ИП счет бум. УПД по ЭДО	196084, Россия, г. Санкт-Петербург,	7810931441	781001001	1217800163712	ПАО СБЕРБАНК	044030653	40702810455000098562	30101810500000000653	\N	kav@medgarant-spb.ru	\N	f	\N	t	23/10-037-1 от 16.11.2023\n\nДоп. соглашение от 30.05.24 Прайс v 3.6	t	IP	\N	\N	2026-04-06 19:50:54.477	\N
cmnnlv7yq008ftjogtnh275qp	cltenantdefault0000000000	МедГарант Невский	ул. Бадаева, д. 6, к. 1	t	бумажный счет с работой едет!\n\nadmin@medgarant-spb.ru\n\n8 (812) 501-10-14\n\nРаботаем от юр. лица: ИП Соколов\n\nE-mail для договора/прайса: kav@medgarant-spb.ru	ООО «МедГарант Невский» ИП счет бум. УПД по ЭДО	193318, г. Санкт-Петербург,	7811526407	781101001	\N	ПАО СБЕРБАНК,	044030653	40702810655000055114	30101810500000000653	\N	kav@medgarant-spb.ru	\N	f	\N	t	23/10-037-1 от 16.11.2023\n\nДоп. соглашение от 30.05.24 Прайс v 3.6	t	IP	\N	\N	2026-04-06 19:50:54.482	\N
cmnnlv7yu008gtjogic7lqmra	cltenantdefault0000000000	МедГарант Приморский	ул. Туристская, д. 10	t	бумажный счет с работой едет!\n\nРаботаем от юр. лица: ИП Соколов\n\nE-mail для договора/прайса: smv@medgarant-spb.ru	ООО «МедГарант Приморский» ИП счет бум. УПД по ЭДО	197374, г. Санкт-Петербург,	7814772898	781401001	1207800024233	ПАО «Сбербанк» г. Санкт-Петербург	044030653	40702810355000059164	30101810500000000653	\N	smv@medgarant-spb.ru	Корольков  Валерий  Анатольевич	f	\N	t	2406-001 от 29.07.24	t	IP	\N	\N	2026-04-06 19:50:54.487	\N
cmnnlv7xx008btjoggqmvawg6	cltenantdefault0000000000	Медалл	Левашовский пр., д. 24	t	7 (905) 282 05 15\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Медалл Стоматология» ООО сверка ЭДО	197110, г. Санкт-Петербург,	7813612683	781301001	1187847146200	ПАО СБЕРБАНК	044030653	40702810255000015839	30101810500000000653	\N	nvkozlova@medall.clinic	\N	t	\N	t	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:54.453	\N
cmnnlv9i300hmtjogd8aon05r	cltenantdefault0000000000	Медент	ул. Чехова 1/12	t	\N	ООО «МЕДЕНТ»	РФ, 191104, Санкт-Петербург, ул. Чехова, д. 1/12, Лит. А, пом. 6Н	7841405696	784101001	1097847086776	ТОЧКА ПАО БАНКА "ФК ОТКРЫТИЕ"	044525104	40702810803500009642	30101810745374525104	\N	500@medent.pro	Макаренко Сергей Андреевич	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.476	\N
cmnnlv7z7008itjogehayxylh	cltenantdefault0000000000	Меди	Каменноостровский пр., 42Б	t	8-812-324-00-07, 8-812-777-00-00\n\nРаботаем от юр. лица: ИП Соколов\n\nТакже в исходной строке было название: 42Б	ЗАО «МЕДИ» ИП бум.доки на Невский	197022, Российская Федерация,	7815006487	784101001	1027809206017	\N	044030704	40702810868000007572	30101810200000000704	\N	vasilyeva@medi.spb.ru\nи дублировать на semenova@medi.spb.ru с 16 по 30.04.25	\N	f	\N	t	\N	f	IP	\N	\N	2026-04-06 19:50:54.5	\N
cmnokktm10020tj50zom095an	cltenantdefault0000000000	ул.Кораблестроителей 33к2	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.882	\N
cmnokktnb0024tj505kjebsh0	cltenantdefault0000000000	ул.Наличная	д.28/16	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.927	\N
cmnz8rm0k000atjgsxhsfe1dg	cltenantdefault0000000000	ТЕСТ	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-14 23:17:25.172	\N
cmnnlv7zc008jtjogr22cwd8i	cltenantdefault0000000000	Меди	Комендантский 17/1	t	8-812-324-00-07, 8-812-777-00-00\n\nРаботаем от юр. лица: ИП Соколов	ЗАО «МЕДИ» ИП бум.доки на Невский	197022, Российская Федерация,	7815006487	784101001	1027809206017	\N	044030704	40702810868000007572	30101810200000000704	\N	vasilyeva@medi.spb.ru\nи дублировать на semenova@medi.spb.ru с 16 по 30.04.25	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:54.504	\N
cmnnlv7zg008ktjoghjen4lml	cltenantdefault0000000000	Меди	Невский пр., д. 82	t	Работаем от юр. лица: ИП Соколов	ЗАО «МЕДИ» ИП бум.доки на Невский	197022, Российская Федерация,	7815006487	784101001	1027809206017	\N	044030704	40702810868000007572	30101810200000000704	\N	vasilyeva@medi.spb.ru\nи дублировать на semenova@medi.spb.ru с 16 по 30.04.25	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:54.509	\N
cmnnn6dp3001ktj80vsjr8ul4	cltenantdefault0000000000	Меди	\N	t	Также в исходной строке было название: Куик Дентал	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:34.743	\N
cmnokkslt0009tj5016aunx99	cltenantdefault0000000000	Меди, Куик Дентал	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:34.578	\N
cmnnlv9jv00i1tjog8g879mdl	cltenantdefault0000000000	Медильер	Большая Разночинная ул., 30	t	Также в исходной строке было название: 30	ООО «Медильер»	197110, Санкт-Петербург, ул. Большая Разночинная, д.30, литера К,	7813392702	781301001	1077847621521	ОАО Банк «САНКТ-ПЕТЕРБУРГ»	044030790	40702810227000006308	30101810900000000790	\N	E.konopelko@mail.ru	Генеральный директор- Хохлов Кирилл Александрович\nE-mail: gendir@medilier.ru	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.539	\N
cmnnn6h0y0074tj80ufs9flmp	cltenantdefault0000000000	Мединеф	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	t	2406-020\t19.06.24	f	OOO	\N	\N	2026-04-06 20:27:39.058	\N
cmnnlv7zp008ltjog67ehpexr	cltenantdefault0000000000	Мединеф , д. 15, к. 1 и есть филиал в	ул. Боткинская, д. 15, к. 1, лит. А\nг. Кириши НЕОБХОДИМО ЗАКЛЮЧИТЬ ДОГОВОР	t	тел.: +7 (812) 600-20-23\n+7 (812) 600 20 20\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Клиника "Мединеф"» ООО бум.доки НЕОБХОДИМО ЗАКЛЮЧИТЬ ДОГОВОР	194044, Санкт-Петербург,	7802375550	780201001	1069847550090	Филиал «Санкт-Петербургский»  ОАО «Альфа-Банк»	044030786	40702810332130001682	30101810600000000786	\N	medinefstom@yandex.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:54.518	\N
cmnnlv92f00eqtjog7mdiy7lm	cltenantdefault0000000000	Медицинский центр	ул.Тельмана 41	t	на эдо, на по почту, еще и физический отправлять надо\n\n11.02.26 - переходим полностью на ЭДО, инфо на бухгалт.почте\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: shimanovskaya@implantant.ru	ООО «СолоДент-плюс» ООО ЭДО	193315  Санкт-Петербург, ул. Тельмана, д.41, кор.1,пом.22-Н, лит. А	7811394856	781101001	1089847001705	СЕВЕРО-ЗАПАДНЫЙ БАНК ПАО "СБЕРБАНК РОССИИ"	044030653	40702810555130000508	30101810500000000653	\N	shimanovskaya@implantant.ru	\N	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.911	\N
cmnnlv91c00eitjog7rvucvb8	cltenantdefault0000000000	Медицинский центр Добрых Стоматологов	Менделеевская ул, д. 6	t	8(812)242-17-71,242-18-81\nmcds@stom.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «МЦДС» ООО ЭДО	194044, город Санкт-Петербург, Менделеевская ул, д. 6 литера П, помещ. 1-н	7804711423	780401001	1247800101053	СЕВЕРО-ЗАПАДНЫЙ БАНК ПАО СБЕРБАНК	044030653	40702810355000142369	30101810500000000653	\N	mcds@stom.ru	\N	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.872	\N
cmnnlv802008ntjogpgqgv0zu	cltenantdefault0000000000	Медотель Плюс	г. Всеволожск\nул. Центральная, д. 6	t	medotelplus@mail.ru\n\n8-81370-43-588\n8-921-777-70-33\n\nСтарые реквизиты\nООО Медотель Плюс\nИНН 4703115884\nКПП 470301001\nОГРН 1104703001193\nЮр. Адрес:  188643, Ленинградская обл., Р-Н Всеволожский, Г.Всеволожск, Ул.Центральная (Южный), Д. 6, ПОМЕЩ. 5-Н\nР/с 4070 2810 6004 7091 8733\nФилиал "Центральный" Банка ВТБ (ПАО) в г.Москва\nК/счет 3010 1810 1452 5000 0411\nБИК 044525411\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Медотель Плюс» ООО бум.доки ДОГОВОР НЕДЕЙСТВИТЕЛЕН	188643, Ленинградская обл., Всеволожский р-н, г. Всеволожск, ул. Центральная д6. Пом 5-Н	4703115884	470301001	1104703001193	ПАО Сбербанк г. Санкт-Петербург	044030653	40702810655410040722	30101810500000000653	\N	medotelplus@mail.ru	\N	f	\N	f	2406-021 от 26.06.2024 до 31.12.24	f	OOO	\N	\N	2026-04-06 19:50:54.531	\N
cmnnlv80c008otjognik02ttj	cltenantdefault0000000000	Мезон	ул. Куйбышева, д. 24	t	ООО «МЕЗОН» - большими буквами\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «МЕЗОН» ООО сверка ЭДО	197046, г. Санкт-Петербург, ул. Куйбышева, д. 24, лит. А, ПОМЕЩ. 2Н	7813644332	781301001	1207800055671	\N	044525411	40702810728180001126	30101810145250000411	\N	zaomezon@inbox.ru	\N	t	\N	t	ДС №1 от 09.01.25 до 30.06.25\n\n\n2406-003  01.06.24	t	OOO	\N	\N	2026-04-06 19:50:54.541	\N
cmnnlv80x008rtjog25vaphv9	cltenantdefault0000000000	Мелидент	ул. Брянцева, д. 13 к.1	t	Работаем от юр. лица: ИП Соколов	ООО «Мелидент» ИП бум.доки	195297, г. Санкт-Петербург,	7804653348	780401001	1197847152953	К/счет 30101810500000000653	044030653	40702810555000014323	30101810500000000653	\N	sdu.clinic@mail.ru	\N	f	\N	t	Договор 2401-044 подписан\nдоп.согл№1 к договору 2401-0444 подписано\n\nДоговор 25/01-001 подписан	f	IP	\N	\N	2026-04-06 19:50:54.562	\N
cmnnlv812008stjogo87qaw6x	cltenantdefault0000000000	Метелица Дент	пр. Обуховской обороны, д.271	t	info@metelitsa-dent.ru\n\nРаботаем от юр. лица: ИП Соколов	ООО «МЕТЕЛИЦА-ДЕНТ» (ИП-ЭДО)	192012, САНКТ-ПЕТЕРБУРГ, ПР. ОБУХОВСКОЙ ОБОРОНЫ, Д. 271, ЛИТЕР Ж, ПОМЕЩ. 7-Н, ПОМЕЩ. 133	7811564603	781101001	1137847430335	\N	\N	\N	\N	\N	info@metelitsa-dent.ru	\N	f	\N	f	2401-035 от 11.03.24	t	IP	\N	\N	2026-04-06 19:50:54.566	\N
cmnnlv816008ttjogxgdy8eej	cltenantdefault0000000000	Миадент	пр. Маршала Жукова, д. 54, к. 6	t	админы\n8-931-003-20-00\n\nРаботаем от юр. лица: ИП Соколов\n\nE-mail для договора/прайса: miadentika@yandex.ru	ООО «Миадент» ИП ЭДО	198261, г. Санкт-Петербург,	7805755751	780501001	1197847179793	\N	\N	\N	\N	\N	miadentspb@gmail.com\n\nmiadentika@yandex.ru	Марьяна Геннадьевна Смирнова\n7 911 935 2173\n@sm_maryana	f	\N	t	ИП2502-002\t20.02.25	f	IP	\N	\N	2026-04-06 19:50:54.57	\N
cmnz8rnz9000etjgsibca7uge	cltenantdefault0000000000	ТЕСТ	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-14 23:17:27.717	\N
cmnnlv81c008utjogyseig3cy	cltenantdefault0000000000	Милавита	г. Оренбург,	f	клиника не активна, не поступают заказы\n\n8 (3532) 505-808 \n89123450055	ООО «МИЛАВИТА»	460058 Оренбургская обл, г Оренбург, ул. Уральская, д. 2/14, помещ. 11	5609078475	561001001	1105658023195	Приволжский филиал ПАО «ПРОМСВЯЗЬБАНК» г. Нижний Новгород	042202803	40702810403000152066	30101810700000000803	\N	milavita2015@mail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:54.576	\N
cmnokkujg003ftj50qpg14rw3	cltenantdefault0000000000	Миллион Яблок	Лыжный пер., д. 3	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:37.085	\N
cmnokktfx001ltj50tacrhvoh	cltenantdefault0000000000	Мичуринская ул.	д. 11/18	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.662	\N
cmnokksir0006tj50gk1a8xh4	cltenantdefault0000000000	Москва,	ул. 26 Бакинских комиссаров, д.14	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:34.468	\N
cmnokkt43000stj50taimhecq	cltenantdefault0000000000	Москва.	Грохольский пер. д. 30, к. 1", Частное лицо	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.236	\N
cmnokktal001atj50aay2q1h0	cltenantdefault0000000000	Московский пр.	д. 183/185 лит. Б	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.469	\N
cmnnlv9dy00grtjogtuedvif5	cltenantdefault0000000000	Мстом ул.Типанова 23 , стр 1	ул.Типанова 23 стр 1	t	7(931)299-46-49; 7(812)679-46-49\n\nE-mail для договора/прайса: m-stom@internet.ru	ООО «Мстом»	196135, город Санкт-Петербург,  внутригородская территория (внутригородское муниципальное образование) города федерального значения муниципальный округ Гагаринское, улица Типанова, дом 23 строение 1, помещение 28-Н	7810981114	781001001	1237800075688	АО "ТБАНК"	044525974	40702810310001524213	30101810145250000974	\N	\N	Мечник Евгений Витальевич	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.327	\N
cmnnlv9az00g8tjog06a438fn	cltenantdefault0000000000	Н-Клиник/N-Clinic	ул. Караванная д.7, лит. А	t	7 (981) 893-29-45 -Жукова А.	ООО «СТОМАТОЛОГИЧЕСКАЯ КЛИНИКА "ВЗЛЁТ» ООО ЭДО	191001, г.Санкт-Петербург,	7841093920	784101001	1217800067792	ООО "Банк Точка"	044525104	40702810420000132489	30101810745374525104	\N	Av_zhukova@mail.ru	Жукова Анна Валерьевна	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.22	\N
cmnokktn40023tj50ubvs1696	cltenantdefault0000000000	Нарвский пр.	д. 18 ", "СДС КЛИНИК	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.921	\N
cmnnlv82b008ztjogxfqjcnlj	cltenantdefault0000000000	Народная стоматология	Будапештская ул., д. 87 к. 3	t	Работаем от юр. лица: ИП Соколов	ООО «ДТК» ИП-ЭДО	Адрес 192283, г. Санкт-Петербург, ул.	7816629460	781601001	1177847004114	ВТБ ПАО г.	044525411	40702810427060000069	30101810145250000411	\N	narodstom@gmail.com	\N	f	\N	f	23.08.23 1-23\n2311-045 от 08.12.23	f	IP	\N	\N	2026-04-06 19:50:54.612	\N
cmnnlv82q0091tjogqr1y80qb	cltenantdefault0000000000	Наша стоматология	Латышских стрелков 1	t	Валентина 8921-188-80-82 (ст.админ?)\n\nРаботаем от юр. лица: ИП Соколов	ООО «Наша Стоматология» ИП бум.доки НЕТ ДОГОВОРА!!! ИП-б.д	193231, г. Санкт-Петербург, ул. Латышских Стрелков, д. 1, литер А, пом. 18Н.	7811443790	781101001	1097847242404	Ф-Л «СЕВЕРНАЯ СТОЛИЦА» АО «РАЙФФАЙЗЕНБАНК» г. САНКТ-ПЕТЕРБУРГ	044030723	40702810403000491188	30101810100000000723	\N	3dent@list.ru	Генеральный директор  \nСтефанкова  Елена Евгеньевна	f	\N	t	\N	f	IP	\N	\N	2026-04-06 19:50:54.627	\N
cmnnlv83c0093tjogsuufp1js	cltenantdefault0000000000	Невровклиник	наб. Обводного канала дом 108, литера А, помещение 61-Н	f	8 921 995 15 50 \n\nТелефон:8 921 995 15 50 \nemail:nevrovclinic@mail.ru\n\nРаботаем от юр. лица: ИП Соколов	ООО «НЕВРОВКЛИНИК»	196084,г.Санкт-Петербург,	7839082110	783901001	1177847118569	ПАО Сбербанк	044030653	40702810755040007682	30101810500000000653	\N	nevrovclinic@mail.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:54.648	\N
cmnokksrc000etj50iahxangr	cltenantdefault0000000000	Невский пр.	д. 173, литер А, пом 7-Н	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:34.776	\N
cmnnlv83h0094tjogbrfuj7yg	cltenantdefault0000000000	Нежная стоматология	Гражданский пр., д.45 к. 1	t	Работаем от юр. лица: ИП Соколов	ООО «Нежная стоматология» ИП бум.доки	195257, г. Санкт-Петербург, муниципальный	7811514708	780401001	1127847096079	ПАО "СБЕРБАНК РОССИИ" г.Санкт-Петербург	044030653	40702810555130005215	30101810500000000653	\N	Magic-stoma@mail.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:54.654	\N
cmnnlv83n0095tjognmbo7cpv	cltenantdefault0000000000	Нисо	ул. Профессора Попова, д. 27	t	8 (981) 768-54-25\nhttps://niso-dental.ru/\n\nсчета  дублировать управляющей на личный Ватсап\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «СТОМАТОЛОГИЧЕСКАЯ КЛИНИКА «НИСО» ООО-бум НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	197022, РОССИЯ, Г.САНКТ-ПЕТЕРБУРГ,	7813674640	781301001	1237800098480	АО «ТБанк»	044525974	40702810910001527539	30101810145250000974	\N	info@niso-dental.ru	\N	f	\N	t	2412-007 20.12.24	f	OOO	\N	\N	2026-04-06 19:50:54.659	\N
cmnokkteh001htj505hc3142j	cltenantdefault0000000000	Новгородская ул.	д. 13", "Конфиденция	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.61	\N
cmnokkthg001ptj50iee16tjn	cltenantdefault0000000000	Новгородская ул., д. 13	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.717	\N
cmnnlv8440097tjogmdet1ng6	cltenantdefault0000000000	Новиков Смайл/ Novikov smile clinic	г. Калининград\nул. Тельмана, д. 5	t	Бухгалтер Татьяна +7 921 715 21 38\n\nсчета Дублировать в телеграмм врача!\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: Nnvrabota@mail.ru	ООО «НОВИКОВСМАЙЛ» ООО-ЭДО НЕТ ДОГОВОРА!!!	236038, Калининградская обл.,	3906413676	390601001	1223900005977	КАЛИНИНГРАДСКОЕ ОТДЕЛЕНИЕ №8626 ПАО СБЕРБАНК	042748634	40702810420000008311	30101810100000000634	\N	vrachimba@gmail.com\nNnvrabota@mail.ru	\N	f	\N	f	2408-010 28.08.24	t	OOO	\N	\N	2026-04-06 19:50:54.676	\N
cmnnlv9f600h0tjogjkd1pni9	cltenantdefault0000000000	НовоДент	Московская область, г Одинцово, Кутузовская ул, д. 1	t	Контактный номер УПРАВЛЯЮЩАЯ АНАСТАСИЯ\n +7 929 985 59 93	ООО «НОВОДЕНТ-М» ООО ЭДО	143001, Московская область, г Одинцово, Кутузовская ул, д. 1, помещ. 1	5032357210	503201001	1235000041374	ООО "Банк Точка"	044525104	40702810520000004145	30101810745374525104	\N	zakupki@stomatologia.moscow	Новосад Любовь Ивановна	f	\N	f	\N	t	\N	\N	\N	2026-04-06 19:50:56.37	\N
cmnnlv84o009atjogezybauvn	cltenantdefault0000000000	Новый Век (ДС)	ул. Композиторов, д.12	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО ДС «Новый ВЕК»ООО-бум.д	194355, г. Санкт-Петербург, ул. Композиторов , д.12, лит. Б, пом.	7802613413	780201001	1177847075548	\N	044525411	40702810426260000019	30101810145250000411	\N	1vek2013@mail.ru	\N	f	\N	t	ДС №1 к договору 2406-001 подписано\n\n2406-001 от 01.06.2024	f	OOO	\N	\N	2026-04-06 19:50:54.696	\N
cmnnlv93k00eytjogqj98h5ev	cltenantdefault0000000000	Новый Век (взрослое отд) НЕТ ДОГОВОРА!	ул. Композиторов, д.12	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО МЕДИЦИНСКИЙ ЦЕНТР «ВЕРА» ООО бум.доки\nНЕТ ДОГОВОРА!	194355, г. Санкт-Петербург, ул. Композиторов , д.12, лит. Б, пом. 91Н	7802687366	780201001	1197847066890	\N	044525411	40702810926260000315	30101810145250000411	\N	1vek2013@mail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:55.952	\N
cmnnlv84t009btjoge98uadl6	cltenantdefault0000000000	Ньюклиник	Липовая аллея, д. 15	f	клиника не активна, не поступают заказы с января 24г\n\nveryvika12345@gmail.com\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «НЬЮКЛИНИК»	197183, Санкт-Петербург, Липовая аллея, д. 15, лит. А, пом. 5-Н	7814759632	781401001	1197847124958	\N	044525999	\N	\N	\N	newclinicspb@mail.ru	\N	f	\N	f	\N	f	OOO	\N	\N	2026-04-06 19:50:54.701	\N
cmnnlv853009dtjogi1izj7z6	cltenantdefault0000000000	ОКДент	ул. Кирочная, д. 31	t	8812 245 25 03\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «ОКДент» ООО бум.доки НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	191123 Санкт- Петербург, ул. Кирочная, дом 31, корпус 2, литера А, оф 34 Н	7842177097	784201001	1197847234617	ПАО Сбербанк	044030653	40702810855000099721	30101810500000000653	\N	Okdent.spb@gmail.com	\N	f	\N	t	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:54.711	\N
cmnnlv91n00eltjogf8g6c0yi	cltenantdefault0000000000	Общество защиты зубов	пр.Каменноостровкий, 56	t	8-812-671-01-31\n8-931-357-33-10\n\nЭДО тензор СБИС\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «ОРТОДОНТИСТ» ООО ЭДО	197022, г.Санкт-Петербург, вн.тер.г. Муниципальный Округ Чкаловское, пр. Каменноостровский, д.56, к.2, литера А, помещ. 1Н, офис 2	7813649002	781301001	1207800155144	Сантк-Петербурский филиал ПАО «ПРОМСВЯЗЬБАНК»	044030920	40702810806000069141	30101810000000000920	\N	xesha.shev@gmail.com	\N	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.884	\N
cmnnlv84x009ctjognvb9rvo4	cltenantdefault0000000000	Одент	Гжатская ул., д. 22 к.1	t	\N	Наличные	Р/с	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:54.706	\N
cmnnlv857009etjog1kfvbjt5	cltenantdefault0000000000	Ольга , д. 12 (сделать новый договор!)	пер. Каховского, 12 (этаж 2)	t	MAIL@OLGA-CLINIC.RU\nДиректор Королёв Андрей Андреевич\n+7 905 214-85-63\n\narina_sokolova@olga-clinic.ru\n\nЗаместитель директора Соколова Арина Александровна\n+7 931 339-70-60\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Стоматологическая клиника "ОЛЬГА"» ООО-ЭДО НЕОБХОДИМ НОВЫЙ ДОГОВОР!!!	199155, г. Санкт-Петербург,	7801706217	780101001	1217800173447	ФИЛИАЛ «САНКТ-ПЕТЕРБУРГСКИЙ» АО «АЛЬФА-БАНК»	044030786	40702810732410015202	30101810600000000786	\N	Arina_sokolova@olga-clinic.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:54.716	\N
cmnnlv85b009ftjogg6alqjj5	cltenantdefault0000000000	Омегадентал	ул. Дибуновская, д. 26	f	Работаем от юр. лица: ИП Соколов	ООО «Омегадентал»	197183, г. Санкт-Петербург,	7814645427	781401001	1167847150481	\N	044030704	40702810880040000407	30101810200000000704	\N	\N	\N	f	\N	f	Нет	f	IP	\N	\N	2026-04-06 19:50:54.72	\N
cmnnlv85f009gtjogk5l4fmbr	cltenantdefault0000000000	Орбис ул.Мира 37 (сделать новый договор!)	\N	t	9144814@mail.ru (почта из реквизитов)\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «ОРБИС» ООО-ЭДО НЕОБХОДИМ НОВЫЙ ДОГОВОР	197046, г.Санкт-Петербург, ул. Мира, д.37, стр.1.	7813675316	781301001	1237800112241	ФИЛИАЛ "САНКТ-ПЕТЕРБУРГСКИЙ" АО "АЛЬФА-БАНК"	044030786	40702810132230006499	30101810600000000786	\N	Orbismed@mail.ru	\N	f	\N	t	2410-005 от 08.10.24	t	OOO	\N	\N	2026-04-06 19:50:54.724	\N
cmnnlv85t009itjogo23g1gkm	cltenantdefault0000000000	Оридент	наб. Макарова, д. 60	t	oridentspb@gmail.com\n+7 911 955-45-55\n\n ИП-эдо Тензор СБИС\n\n13.10.23 Прайс\n\nРаботаем от юр. лица: ИП Соколов	ООО «ОРИДЕНТ» ИП ЭДО	199004, г. Санкт-Петербург,	7801655940	780101001	1187847366321	ПАО СБЕРБАНК	044030653	40702810955000001046	30101810500000000653	\N	oridentspb@gmail.com	Генеральный директор Оришин Роман Владимирович	f	\N	t	\N	t	IP	\N	\N	2026-04-06 19:50:54.737	\N
cmnokku8j0036tj50ba3d4xk5	cltenantdefault0000000000	Орловский пер.	д. 1/4	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.692	\N
cmnnlv85x009jtjog4xixbq1x	cltenantdefault0000000000	Орто Центр	г. Пермь, ул. Газеты Звезда, 45	t	(342) 241-28-41\n\n+7 (922) 370-25-56 - администраторы, есть в тг\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО СК «Орто-Центр» ООО ЭДО НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	614039, г. Пермь, ул. Газеты Звезда, 45	5904269090	590401001	1125904007998	\N	042202824	40702810729190006387	30101810200000000824	\N	drorto59@yandex.ru	\N	f	\N	t	2411-009 14.11.24	t	OOO	\N	\N	2026-04-06 19:50:54.742	\N
cmnnlv9h200hetjogsh7sbivk	cltenantdefault0000000000	Орто.Бар / ORTHO.BAR	Мичуринская ул, д. 9/11	t	E-mail: info@ortho.bar\nТел.: +7 (999) 227 22 97\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «ЦЕНТР-СТОМ» ООО	197046, г. Санкт-Петербург, Мичуринская ул, д. 9/11, лит. А, пом. 1Н, офис 1	7813652799	781301001	1217800060114	ПАО «Банк «Санкт-Петербург»	044030790	40702810790100000702	30101810900000000790	\N	info@ortho.bar	Нуртдинов Ильяр Рафаэлевич	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.439	\N
cmnnlv9gh00hatjogmuk31vf5	cltenantdefault0000000000	Ортогранд	ул. Савушкина, 104	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «ОРТОГРАНД»	197374, Россия, г. Санкт-Петербург, ул. Савушкина, д. 104, стр. 1, помещ. 10-Н, офис 1	7814821552	781401001	1237800041632	СЕВЕРО-ЗАПАДНЫЙ БАНК ПАО СБЕРБАНК	044030653	40702810055000474023	30101810500000000653	\N	ortogrand.clinic@yandex.com	Саунина Анастасия Андреевна	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.417	\N
cmnnlv86a009ltjog8n2h1tan	cltenantdefault0000000000	Ортодонтическая студия Леонида Горбунова	пр. Тореза, д. 95	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Ортодонтическая Студия» ООО сверка ЭДО	194214, г. Санкт-Петербург,	7802880465	780201001	1147847436440	\N	044525974	40702810810001649481	30101810145250000974	\N	alenazenkovich@yandex.ru	\N	t	\N	t	2405-002 от 28.05.24\n\n03.06.24 ЭДО\n\nДС №1 от 09.01.25	t	OOO	\N	\N	2026-04-06 19:50:54.754	\N
cmnnlv86e009mtjogremf226l	cltenantdefault0000000000	Орхидея	пр. Космонавтов д.61, кор. 1	t	368-93-11, 8 (911) 842-24-42\norhidea-stom@yandex.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Стоматологический Центр «Орхидея» ООО-бум.док	196142. г. Санкт Петербург, пр. Космонавтов д.61, кор. 1, пом. 49 Н	7838411178	781001001	1089847270556	«Санкт-Петербург»	044030920	40702810506000008253	30101810000000000920	\N	orhidea-stom@yandex.ru	\N	f	\N	t	ДС №2 от 01.07.25 автопролонгация\n\n\nДС №1 от 09.01.25 до 30.06.25\n\n2406-031 от 15.07.24	f	OOO	\N	\N	2026-04-06 19:50:54.759	\N
cmnnlv9al00g5tjogjr7tjtha	cltenantdefault0000000000	Очарование	ул.Кузнецовская д.26 литер А	t	\N	ООО «ОЧАРОВАНИЕ»	г.Санк-Петербург.,ул.Кузнецовская д.26 литер А,пом.4-Н	7810851115	781001001	1117847550985	СЕВЕРО ЗАПАДНЫЙ БАНК ПОА СБЕРБАНК	044030653	40702810355000137565	30101810500000000653	\N	info@charm-dental.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.205	\N
cmnnlv86i009ntjogfc671g72	cltenantdefault0000000000	Палкин	ул. Бармалеева д.2	t	Работаем от юр. лица: ИП Соколов	ООО «Стоматологический Центр Палкинъ» ИП бум.доки	197183, Санкт-Петербург г, Приморский пр-кт, дом № 15, литера А, помещение 12Н	7814455539	781401001	1099847032581	Тоeка»	044030786	40702810032450000634	30101810600000000786	\N	etdirect@mail.ru	Палкина Елена Александровна +7(921)948-42-46	f	\N	f	2311-043-1 от 23.11.2023 отправлены курьером	f	IP	\N	\N	2026-04-06 19:50:54.763	\N
cmnnlv86x009otjog1antxy7u	cltenantdefault0000000000	Панда Скандинавский пр-д 8 к 2	\N	t	Работаем от юр. лица: ИП Соколов	ООО «ЭФ Пульс» ИП бум.доки	188678, Ленинградская обл., Всеволожский м.р-н, Муринское г.п., г. Мурино, Скандинавский пр-д, д. 8, к. 2, ПОМЕЩ. 57-Н	7801313336	470301001	1167847292557	\N	044030786	40702810332320001201	30101810600000000786	\N	panda_clinic@mail.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:54.778	\N
cmnnlv871009ptjogl6s9qu6g	cltenantdefault0000000000	Пандент	ул. Восстания, д. 47	t	8-9216366765 \nАнна Литвинова\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Пандент Плюс» ООО-ЭДО	196066, г. Санкт-Петербург,	7810061491	781001001	5067847014406	ДО «Арсенальный» Филиала «Санкт-Петербургский» АО «АЛЬФА-БАНК» К/счет 30101810600000000786 БИК 044030786 в лице Генерального директора Кротовой Ольги Федоровны Кротова О.Ф.	044030786	40702810932130000588	30101810600000000786	\N	pandent@mail.ru	в лице Генерального директора  Кротовой Ольги Федоровны	f	\N	t	ДС №1 от 09.01.25 до 30.06.25\n\n\n2409-025 от 24.09.24	t	OOO	\N	\N	2026-04-06 19:50:54.781	\N
cmnnlv87j009rtjog3skcukim	cltenantdefault0000000000	Пандент КЛИНИКА РЕОРГАНИЗОВАННА	ул. Савушкина, д. 17	f	тел.: +7 (812) 600-20-23\n+7 (812) 600 20 20\ne-mail: pandent@mail.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Пандент-Люкс» КЛИНИКА РЕОРГАНИЗОВАНА	197183, Санкт-Петербург,	7814419361	781401001	1089847376080	Филиал «Санкт-Петербургский» АО «АЛЬФА-БАНК»	044030786	40702810332130000586	30101810600000000786	\N	pandent@mail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:54.799	\N
cmnnlv99d00fxtjogmwxjvlct	cltenantdefault0000000000	Пандент Победы 14	Ул. Победы 14	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: pandent@mail.ru	ООО «Пандент-Премьер» ООО ЭДО	196066, Санкт-Петербург, ул. Типанова, дом 4, лит. А, пом. 31-Н	7810469146	781001001	1167847281821	Филиал «Санкт-Петербургский» АО «АЛЬФА-БАНК»	044030786	40702810432130003551	30101810600000000786	\N	pandent@mail.ru	Кротова Ольга Федоровна	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.162	\N
cmnnlv881009ttjogin7pk97d	cltenantdefault0000000000	Парацельс	пр. Просвещения, д. 27	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Парацельс» ООО -бум.доки ДОГОВОР НЕДЕЙСТВИТЕЛЕН	194356, г. Санкт-Петербург,	7814100575	780201001	1027802486150	ПАО Сбербанк	044030653	40702810955240157420	30101810500000000653	\N	9477178@mail.ru	\N	f	\N	t	ДС от 09.01.25 к договору 2406-018 подписан\n2406-018 от 20.06.2024	f	OOO	\N	\N	2026-04-06 19:50:54.817	\N
cmnnlv88c009vtjogme2omif6	cltenantdefault0000000000	Первая инновационная стоматология	г. Сланцы\nПочтовый пер., д. 2/8	t	7 (921) 954-05-77	ООО «Линнас»	188560, Ленинградская область,	4707053734	470701001	1234700031554	К/счет	\N	\N	\N	\N	Договор и работа на стопе, ждут пациента	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:54.829	\N
cmnnlv891009ytjoggs8733om	cltenantdefault0000000000	Первая семейная	Гражданский пр., д. 36	t	8 (953) 151-41-26  - звонили с этого телефона\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «ПЕРВАЯ СЕМЕЙНАЯ КЛИНИКА НА ГРАЖДАНСКОМ» ООО ЭДО НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	195220, Г.Санкт-Петербург,	7804694087	780401001	1227800080056	\N	044030723	40702810103000090355	30101810100000000723	\N	grazdupr@oneclinic.ru	\N	f	\N	t	2412-009\t26.12.24	f	OOO	\N	\N	2026-04-06 19:50:54.854	\N
cmnnlv895009ztjogewrp356t	cltenantdefault0000000000	Плоомбо	ул. Парфёновская, д. 6, к. 2	t	ploombo.expert@yandex.ru\n+7 (812) 333-57-57\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «РЕДДЕНТАЛЬНОСТЬ» ООО бум.доки	196084, Россия, Санкт-Петербург,	7838125032	783801001	1247800080714	\N	044030723	40702810603000104660	30101810100000000723	\N	i.sapozhnikas@mail.ru	Генеральный директор \nЧикунов Олег Викторович\n\nдиректор клиники\nСапожникас Ирина Дмитриевна\nформа обратной связи на сайте	f	\N	t	2501-009        20.01.25	f	OOO	\N	\N	2026-04-06 19:50:54.858	\N
cmnnlv8ny00cbtjogi4gkruvv	cltenantdefault0000000000	Тари	Фурштатская ул., д. 31	f	с 01.08.25 перевели с ИП на ООО\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «ТАРИ» ООО !!! Бум.Доки	191123, г. Санкт-Петербург,	7825097821	784201001	1037843000634	\N	044525411	40702810033060008345	30101810145250000411	\N	tari-spb@tari-spb.ru	\N	f	\N	f	\N	f	OOO	\N	\N	2026-04-06 19:50:55.39	\N
cmnnlv89i00a1tjogvrksdoxs	cltenantdefault0000000000	Поколение	ул. Зои Космодемьянской д.2	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: Щанкин Алексей Иванович\n8(921)953-24-19 Stom9532419@yandex.ru ДУБЛИРОВАТЬ НА ВАЦАП	ООО «Поколение» ООО ЭДО сверка	198095, Россия, г.Санкт-Петербург,	7805815753	\N	1247800053621	АО «ТБанк»	044525974	40702810310001619034	30101810145250000974	\N	Stom9532419@yandex.ru	Щанкин Алексей Иванович\n8(921)953-24-19	f	\N	t	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:54.87	\N
cmnnlv89m00a2tjogda3q2rsi	cltenantdefault0000000000	Поликлиника №22	Басков пер., д. 38	t	Работаем от юр. лица: ООО КЛИКЛаб	СПб ГАУЗ «Поликлиника Городская Стоматологическая № 22» ООО бум.доки НЕТ ДОГОВОРА!!!	191014, С-Петербург, Басков пер, д. 38 лит. А	7825666429	784201001	1037843065897	\N	044525411	40603810740260000001	30101810145250000411	\N	pstom22@mail.ru	\N	f	\N	f	\N	t	OOO	\N	\N	2026-04-06 19:50:54.875	\N
cmnnlv89q00a3tjog2dov1mkr	cltenantdefault0000000000	Полимедикор	наб. Чёрной речки, д. 4	t	ЭДО -Тензор СБИС\npolimedikor@mail.ru-общая почта\n\nРаботаем от юр. лица: ИП Соколов	ООО «КДЦ «ПОЛИМЕДИКОР» ИП бум.доки	197183, г. Санкт-Петербург,	7814027935	781401001	1037832020753	ПАО «Сбербанк России» Санкт-Петербург	044030653	40702810855200119362	30101810500000000653	\N	alibaev@polimedikor.ru	Генеральный директор \nЖуманкулов Мажен Саметович	f	\N	t	ИП2503-014        31.03.2025	f	IP	\N	\N	2026-04-06 19:50:54.878	\N
cmnnlv8a100a5tjogbvkmn341	cltenantdefault0000000000	Приватная Стоматология Доктора Светлова Московский проспект	Московский пр., 145 лит А	t	Управляющая Светлова Александра Сергеевна +79500458845\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nТакже в исходной строке было название: 145 лит А	ООО «ПРИВАТНАЯ СТОМАТОЛОГИЯ ДОКТОРА СВЕТЛОВА» ООО-ЭДО	196105, г. Санкт-Петербург, Московский пр-кт, д. 145а, лит. А, ПОМЕЩ. 23-Н, ОФИС №2.	7810996826	781001001	1247800029256	ООО «Банк Точка»	044525104	40702810020000094590	30101810745374525104	\N	info@privatstom.ru\nsvetlova_polina@mail.ru	\N	f	\N	t	2408-007 26.08.24	t	OOO	\N	\N	2026-04-06 19:50:54.889	\N
cmnnlv92q00estjognkjhx24p	cltenantdefault0000000000	Прима Стом	ул.Адм.Трибуца, д.7	t	8-964-330-70-70\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: prima_stom2@mail.ru	ООО «ПРИМА - ДЕНТ» ООО бум.доки	гСанкт-Петербург, ул .Адмирала Трибуца, д. 7. лит. А, помещение 43-Н	7807219202	780701001	1187847381149	Филиал «Центрального Банка ВТБ	044525411	40702810527060000147	30101810145250000411	\N	prima_stom2@mail.ru	Белоусова Юлия Анатольевна\n8-911-993-30-09\n(ответств.за оплату)	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:55.922	\N
cmnnlv8ai00a8tjog0vd7l975	cltenantdefault0000000000	Прима-Стом	ул. Звездная, д. 11, к.1	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «МЕДИ-СТОМ»	196233, г. Санкт-Петербург, ул. Звездная, д. 11, корпус 1, Лит. А, помещение 24 Н	7810603916	781001001	1167847312291	\N	044525411	40702810227060007343	30101810145250000411	\N	prima_stom@mail.ru	\N	f	\N	f	\N	f	OOO	\N	\N	2026-04-06 19:50:54.907	\N
cmnnlv8ae00a7tjogw68711eh	cltenantdefault0000000000	Прима-дент	г. Ломоносов\nул. Красноармейская., д. 20	t	mc.prima-dent@yandex.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: buh@gammaunit.ru\nmc.prima-dent@yandex.ru	ООО «Медицинский центр «Прима-дент» напр.договор в нов.редакции	198412 Санкт-Петербург,	7819030265	781901001	1047829001483	\N	044525411	40702810128700000275	30101810145250000411	\N	buh@gammaunit.ru	Мельникова Татьяна Геннадьевна	f	\N	t	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:54.902	\N
cmnnlv8am00a9tjog6a9m6swq	cltenantdefault0000000000	Протекомед /PROTECOMED	ул. Парфёновская, д. 14, корп. 1	t	7 812 602 96 63 администраторы\n\n\n\nот Маргариты WhApp 17.03 : Почта для счетов и прочих документов  st.admin@protecomed.ru Также прошу дублировать (в копии) на мою andreeva@protecomed.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «ПРОТЕКОМЕД» напр.договор в нов.редакции	196084, г. Санкт-Петербург,	7838101793	783801001	1227800012330	\N	044030786	40702810432000012698	30101810600000000786	\N	st.admin@protecomed.ru, andreeva@protecomed.ru	Генеральный директор   Гвасалия Марк Романович	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:54.91	\N
cmnnlv8b700actjogv72x75h0	cltenantdefault0000000000	ПрофДент	Гродненский пер., д.3	t	Работаем от юр. лица: ИП Соколов	ООО «Стоматология Голден-Дент» ИП бум.доки	191014, г. Санкт-Петербург,	7814298815	784101001	1157847431004	\N	044525974	\N	30101810145250000974	\N	marinel-33@mail.ru	Генеральный директор  Полянкин Сергей Анатольевич	f	\N	t	Старый\n\nНовый договор с 01.11.2023 г.	f	IP	\N	\N	2026-04-06 19:50:54.931	\N
cmnokkujs003gtj50xwii5wub	cltenantdefault0000000000	Пулковское ш.	д. 20 к. 3	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:37.096	\N
cmnnlv8bi00adtjogiix09ehx	cltenantdefault0000000000	Пушкинская стоматология	г.Пушкин, ул. Магазейная, д.47	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Пушкинская Стоматология» ООО БУМ.Д.\nНАПР.ДОГОВОР В НОВОЙ РЕДАКЦИИ	196601, г. Санкт-Петербург, г. Пушкин,	7820059685	782001001	1187847011220	\N	044525411	40702810927060000093	30101810145250000411	\N	arinok@mail.ru	\N	f	\N	t	ДС №1 от 09.01.25 к дог. подписан\n\n2405-014 от 14.05.24	f	OOO	\N	\N	2026-04-06 19:50:54.942	\N
cmnnlv8d800antjoguaui3jx0	cltenantdefault0000000000	РЗ клиник/RZCLiNiC Стоматология	Бабаева ул. Бухарестская д. 118 к. 2 (cделать новый договор!)	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «СКС» ООО ЭДО СДЕЛАТЬ НОВЫЙ ДОГОВОР	192288, Санкт-петербург Город, ул. Бухарестская, д.118, к.2.лит. а, пом. 13н	7816507655	781601001	1117847075587	ФИЛИАЛ "САНКТ-ПЕТЕРБУРГСКИЙ" АО "АЛЬФА-БАНК"	044030786	40702810732370001770	30101810600000000786	\N	office@rzclinic.com	\N	f	\N	t	2410-009 от 15.10.24	t	OOO	\N	\N	2026-04-06 19:50:55.005	\N
cmnnlv8do00aqtjogfqkiz095	cltenantdefault0000000000	РИО Дент	Богатырский пр. 36, к.1	t	rio-dent@mail.ru\n\nТел.: 307-88-88, 8-911-909-08-88\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «РиоДент» ООО ЭДО	197372 Санкт-Петербург,	7814546088	781401001	1127847447331	Филиал «Центральный»	044525411	40702810435260005775	30101810145250000411	\N	rio-dent@mail.ru	Генеральный директор\nЕлистратова Ирина Анатольевна	f	\N	t	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.02	\N
cmnnlv8e400attjog8qjb8boi	cltenantdefault0000000000	РЦСИ	390044 г. Рязань\nНародный бульвар д.15, пом. Н65	f	Помощник генерального директора         Архиреева Лариса Борисовна\n\nТелефон  (4912) 46-46-36; 46-46-37, +7 (915) 627-25-25\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «РЦСИ» НЕТ ДОГОВОРА!!!	390044 г. Рязань,	6229060970	622901001	1086229000582	ПРИО-Внешторгбанк (ПАО) г. Рязань	046126708	40702810300010003679	30101810500000000708	\N	buh@rcsi.ru	\N	f	\N	f	2409-018\t13.09.24	f	OOO	\N	\N	2026-04-06 19:50:55.036	\N
cmnokku3d002ttj50tnqk13um	cltenantdefault0000000000	Разьезжая ул. д. 35	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.505	\N
cmnnlv8c800ahtjogey95sox0	cltenantdefault0000000000	Райден	Ленинский пр, д.116	t	677-67-10 \n\n\nalev_med@raden.ru - почта для договора\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: alev_med@raden.ru	ООО «АЛЕВ» ООО ЭДО	194017, Санкт-Петербург, пр. Энгельса, д.58 лит. А, пом.50-Н	7802417850	780201001	1079847150790	ВТБ в Санкт-Петербурге , г. Санкт-Петербург,	044030704	40702810415000003592	30101810200000000704	\N	e.sirotkina@raden.ru	\N	f	\N	t	ДС №1 от 09.01.25 до 30.06.25\n\n\n2409-029 от 30.09.2024	t	OOO	\N	\N	2026-04-06 19:50:54.969	\N
cmnnlv8cl00aitjogwjavr2vf	cltenantdefault0000000000	Ред Дентал	Ломаная ул., д. 5	f	Закрылись, стали Плоомбо\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «РЕД ДЕНТАЛ» ООО БУМ.Д. ДОГОВОР НЕДЕЙСТВИТЕЛЕН!	196006, г. Санкт-Петербург,	7810387408	781001001	1157847350682	\N	044030786	40702810132180002116	30101810600000000786	\N	info@reddental.ru	\N	f	\N	f	2406-007 от 06.06.24	t	OOO	\N	\N	2026-04-06 19:50:54.982	\N
cmnnlv9ft00h4tjogm2lhtkxi	cltenantdefault0000000000	Реконструкция	Московский пр, д186	t	89112155458 Мацко Кирилл Александрович-ответственный за оплату счетов и договора\n\nE-mail для договора/прайса: 9882112@resmile.ru	ООО «Центр профессиональной стоматологии «Реконструкция» ООО ЭДО	196105, Санкт-Петербург,	7810383097	781001001	1157847328440	СЕВЕРО-ЗАПАДНЫЙ БАНК ПАО СБЕРБАНК	044030653	40702810655000013664	30101810500000000653	\N	9882112@resmile.ru	89112155458 Мацко Кирилл Александрович	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.393	\N
cmnnlv8cp00ajtjogrmis699g	cltenantdefault0000000000	Ренидент	г. Колпино, ул. Анисимова, д. 5, к. 7, лит. А.	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Ренидент» ООО ЭДО	196655, г. Санкт-Петербург,	7817316822	781701001	1097847167990	ПАО СБЕРБАНК	044030653	40702810355000037733	30101810500000000653	\N	kolpino@renident.ru\n\nvbychenok@renident.ru	Управляющая организация ООО «Дентал Менеджмент Компани» на основании договора передачи полномочий единоличного исполнительного органа № ЕИО-0401 от 25.01.2018 г.\nГенеральный директор ООО «Дентал Менеджмент Компани» Логинов Н.В.	f	\N	t	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:54.986	\N
cmnnlv8ct00aktjogx2py10od	cltenantdefault0000000000	Ренидент Героев	пр. Героев, д. 34	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Ренидент-Героев» ООО ЭДО НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	198206, г. Санкт-Петербург,	7807245435	780701001	1207800175351	ПАО Сбербанк	044030653	40702810255000085982	30101810500000000653	\N	geroev@renident.ru	\N	f	\N	t	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:54.989	\N
cmnnlv8cx00altjoggqq1srkw	cltenantdefault0000000000	Рестом	пр. Медиков, д. 10, к. 2	f	клиника не активна, не поступают заказы с сентября 23г\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Ортодонтия» ООО ЭДО	191187, г.Санкт-Петербург, вн.тер.г. муниципальный округ Литейный округ, ул Шпалерная, д. 3, литера А, помещ. 7-Н	7840102353	784001001	1227800132042	\N	\N	\N	30101810600000000786	\N	1restom1@gmail.com	\N	f	\N	f	\N	f	OOO	\N	\N	2026-04-06 19:50:54.994	\N
cmnnlv9dn00gptjogrrlfm9o6	cltenantdefault0000000000	Рестом , дом 10 ООО «Ортодонтия» УТОЧНИТЬ НА КАКОЕ ЮР ЛИЦО РАБОТА	проспект Медиков, дом 10, корпус 2, литера А	t	Зарбеев Дамир Рустэмович \nДиректор клиники +7 9216518181\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: 1restom1@gmail.com	ООО «Ортодонтия» ООО ЭДО	191187, г.Санкт-Петербург, вн.тер.г. муниципальный округ Литейный округ, ул Шпалерная, д. 3, литера А, помещ. 7-Н	7840102353	784001001	1227800132042	Филиал "Санкт-Петербургский" АО "Альфа-Банк"	044030786	40702810032130012528	30101810600000000786	\N	счета в ватсап	Низамова Даната Рустамовна	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:56.315	\N
cmnnlv9dq00gqtjogdy3h7qjc	cltenantdefault0000000000	Рестом , дом 10 ООО «РЕСТОМ ОРТОДОНТИЧЕСКИЙ ЦЕНТР» УТОЧНИТЬ НА КАКОЕ ЮР ЛИЦО РАБОТА	проспект Медиков, дом 10, корпус 2, литера А	t	Зарбеев Дамир Рустэмович  \nДиректор клиники +7 921 651-81-81\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: 1restom1@gmail.com	ООО «РЕСТОМ ОРТОДОНТИЧЕСКИЙ ЦЕНТР» ООО ЭДО	191187, г. Санкт-Петербург, ул. Шпалерная, д. 3, литера А, помещ. 7-Н, офис 1	7841096423	784101001	1217800166836	СЕВЕРО-ЗАПАДНЫЙ БАНК ПАО СБЕРБАНК	044030653	40702810055000072881	30101810500000000653	\N	счета в ватсап	Зарбеев Дамир Рустэмович  \n +7 921 651-81-81	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:56.319	\N
cmnnlv8dk00aptjogb96vpo3j	cltenantdefault0000000000	Риа Дент	пр. Тореза, д. 118	t	Работаем от юр. лица: ИП Соколов	ООО «Риадент» ИП бум.доки	194214, г. Санкт-Петербург,	7813636035	780201001	1197847135353	\N	044525974	40702810710000541994	\N	\N	riadent-spb@mail.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:55.016	\N
cmnokktbl001ctj5044i4vkt4	cltenantdefault0000000000	Ропшинскаяул.	д.19/40	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.506	\N
cmnnlv8dz00astjogxs81oqif	cltenantdefault0000000000	Румдент	г. Выборг, Московский пр., д. 9, пом. 3-Н.\nБ.Сампсониевский пр. НЕОБХОДИМ НОВЫЙ ДОГОВОР	f	Работаем от юр. лица: ООО КЛИКЛаб	ООО «РумДент» ООО ДОГОВОР НЕДЕЙСТВИТЕЛЕН	188800, Ленинградская область, г. Выборг,	4704103585	470401001	1184704005727	\N	044525411	40702810500470015118	30101810145250000411	\N	rumdent@mail.ru	\N	f	\N	t	2406-009 от 07.06.24	t	OOO	\N	\N	2026-04-06 19:50:55.032	\N
cmnnn6if0008stj80nkpr6lhd	cltenantdefault0000000000	Румдент	Б.Сампсониевский пр.	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:40.86	\N
cmnnlv8f800aztjoga5rmhrd1	cltenantdefault0000000000	СБорДент	г. Сосновый Бор,, Липовский пр-д, д. 25	t	часть документов подписана в ЭДО, часть в бум.виде. Решить как дальше будем.-13.11 отправляя письмо со счетом задала вопрос, жду ответ\n\nРаботаем от юр. лица: ИП Соколов	ООО «КЭС «Сбордент» ИП-ЭДО переплата 15500	188541, Ленинградская Область,	4714023931	472601001	1094714001029	ПАО «СБЕРБАНК»	\N	\N	\N	\N	sbordent@mail.ru	Генеральный директор Скрыпник Алексей Михайлович	f	\N	t	\N	t	IP	\N	\N	2026-04-06 19:50:55.077	\N
cmnnlv8fh00b1tjog247ig20e	cltenantdefault0000000000	СДС КЛИНИК	ул.Наличная, д.28/16	t	Тел.:(812)382-00-99\n\nЭДО Тензор СБИС\n\nРаботаем от юр. лица: ИП Соколов	ООО «СДС КЛИНИК» ИП-бум.док.	.: 199226, г.Санкт-Петербург,	7801672624	780101001	1197847201419	ТОЧКА»	044525104	40702810703500032926	30101810745374525104	\N	info@sdsclinic.spb.ru	Генеральный директор Сучков Денис Сергеевич	f	\N	t	\N	f	IP	\N	\N	2026-04-06 19:50:55.085	\N
cmnnlv9e900gttjogpu2dqwex	cltenantdefault0000000000	СК Стандарт	Ветеранов 109к3	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: azaryan-dentist@yandex.ru	ООО «Стоматологическая клиника « СТАНДАРТ»	Адрес 198261, СПб, пр. Ветеранов 109, кор. 3 , Лит. А пом 7Н	7805482127	780501001	1087847039477	Сбербанк	044030653	40702810655240000628	30101810500000000653	\N	azaryan-dentist@yandex.ru	Азарян Альберт Рафаэлович	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.338	\N
cmnnlv9jo00hztjog5k2jzp4w	cltenantdefault0000000000	СТОМАТМЕД	г. Иваново, ул. Станционная, дом 13	t	8(902)317-15-87, 8(902)317-15-77	ООО «СТОМАТМЕД»	153002, Ивановская область,      г. Иваново, ул. Станционная, дом 13, офис 1013	3702266582	370201001	1223700001392	АО «ТИНЬКОФФ БАНК»	044525974	40702810910001037278	30101810145250000974	\N	Info@Primedent37.ru	Виноградов Василий Валентинович\n\nКонтактный телефон        8(902)317-15-87\n\nortoped.ivanovo@rambler.ru	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.532	\N
cmnnlv8et00awtjogrhmfj32i	cltenantdefault0000000000	Сайдент , д.3, к. 8 НЕОБХОДИМО ЗАКЛЮЧИТЬ ДОГОВОР	Кушелевская дор., д. 3, к. 8	f	Работаем от юр. лица: ООО КЛИКЛаб	ООО «САЙДЕНТ» ДОГОВОР НЕДЕЙСТВИТЕЛЕН	195220, г. Санкт-Петербург,	7804607013	780401001	1177847313555	\N	044030723	40702810303000058142	30101810100000000723	\N	say-dent@mail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:55.061	\N
cmnnlv8ey00axtjognmc49ew5	cltenantdefault0000000000	Самовывоз	\N	t	\N	Наличные	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:55.066	\N
cmnnlv8f300aytjogyccxswh6	cltenantdefault0000000000	СанДент	г. Сочи, ул. Гайдара, д. 5/1	f	контактный номер телефона: 8-918-203-55-05\n\n\nврач на связь не выходил, работа закрыта\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «САН-ДЕНТ»	354207, г. Сочи, ул. Гайдара, д. 5/1	2318047244	231801001	1132366016562	\N	046015207	40702810726170003670	30101810500000000207	\N	alvinochka.95@mail.ru	\N	f	\N	f	2405-008 от 22.05.24	t	OOO	\N	\N	2026-04-06 19:50:55.071	\N
cmnokku47002wtj5058uufib6	cltenantdefault0000000000	Свердловская наб.	д. 62", Эсте	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.535	\N
cmnokktj3001rtj503qk85me9	cltenantdefault0000000000	Светлановский пр.	д. 44", "Белая Медведица	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.776	\N
cmnnlv8fc00b0tjogd8a2p8dk	cltenantdefault0000000000	Светофор	ул. Брянцева д. 13, к. 1", "Гионикс / Gionix	f	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Светофор»	195297, Санкт-Петербург,	7804519060	780401001	1137847422052	ПАО «Сбербанк России»	044030653	40702810555040099311	30101810500000000653	\N	sv@svetofor-stoma.ru	\N	f	\N	f	2405-018\t27.05.24	f	OOO	\N	\N	2026-04-06 19:50:55.081	\N
cmnokku28002rtj50s37419tc	cltenantdefault0000000000	Северный	д.45. кв.95.	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.464	\N
cmnnlv8fm00b2tjogj2ikefys	cltenantdefault0000000000	Семейная клиника Толмачевых	ул. Обручевых, д. 5	f	Работаем от юр. лица: ИП Соколов	ООО «Семейная клиника Толмачевых»	194064, г. Санкт-Петербург,	7804658530	780401001	1197847196678	\N	044030786	40702810932210002833	30101810600000000786	\N	family.clinic@mail.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:55.09	\N
cmnnlv8fr00b3tjog08bka6hu	cltenantdefault0000000000	Семейная стоматология	Комендантский пр., д. 34	t	Отправлять счет сначала на почту\n\nРаботаем от юр. лица: ИП Соколов\n\nE-mail для договора/прайса: glazkova_natalia@inbox.ru	ООО «Семейная стоматология» ООО ЭДО	197373, Санкт-Петербург,	7814347364	781401001	5067847110084	\N	044030786	40702810232470000935	30101810600000000786	\N	glazkova_natalia@inbox.ru\nОтправлять счет сначала на почту, потом в Диадок	Генеральный директор \nИгнатов Михаил Михайлович	f	\N	t	\N	t	IP	\N	\N	2026-04-06 19:50:55.095	\N
cmnnlv90x00eftjogfrglru1k	cltenantdefault0000000000	Симметрика	Московский пр-т, д.183-185	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «АМРИТА» ООО ЭДО	196066, г.Санкт-Петербург, Московский пр-т,  д.183-185. литера А, пом.783-Н	7838024852	781001001	1047833021334	СЕВЕРО-ЗАПАДНЫЙ БАНК ПАО СБЕРБАНК г.Санкт-Петербург	044030653	40702810655000103202	30101810500000000653	\N	stom@symclinic.ru	в лице Генеральног директор Лебедевой Галины Валерьевны, действующей на основании Устава	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.857	\N
cmnnlv8ve00dgtjogg2baht7d	cltenantdefault0000000000	Цитера / Citera clinic	Ярославский пр., д. 63	f	Работаем от юр. лица: ИП Соколов	ООО «Студия ПРО»	194214, г. Санкт-Петербург, Ярославский пр-кт, д. 63, стр. 1, ПОМЕЩ. 7-Н	7802690383	780201001	1197847111604	\N	\N	\N	\N	\N	citera-clinic@yandex.ru	\N	f	\N	f	Есть 2023	f	IP	\N	\N	2026-04-06 19:50:55.658	\N
cmnnlv8g700b4tjoggiumfz8f	cltenantdefault0000000000	Симплекс НЕОБХОДИМ НОВЫЙ ДОГОВОР!	Полтавский проезд, д. 2	t	+7 921 790 0426 \nМенеджер-делопроизводитель\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Цифровая стоматология» ООО-бум.д НЕОБХОДИМ НОВЫЙ ДОГОВОР!	191036 г. Санкт-Петербург,	7842153410	784201001	1187847145727	\N	044030786	40702810832000005218	30101810600000000786	\N	st.piskunov@yandex.ru	Генеральный директор	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:55.112	\N
cmnokkuhw003ctj50ala9bat4	cltenantdefault0000000000	Сиреневый бул., 18, к.1", "Плоомбо	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:37.028	\N
cmnnlv8z900e4tjogxgn2rqux	cltenantdefault0000000000	Скандинавия	Московский пр. 193 к.2	t	rakitina-ea@avaclinic.ru\n\n Ракитина Евгения Александровна ст мед.сестра отд.стоматологии\n\n\nrumyantceva-ea@avaclinic.ru\n\nотправлять документы и счет на имя старшей медицинской сестры Румянцева Елена Альбертовна\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «АВА-ПЕТЕР» ООО БУМ ДОКИ!	191014, Санкт-Петербург,	7825052242	784101001	1027809228072	СЕВЕРО-ЗАПАДНЫЙ БАНК ПАО СБЕРБАНК	044030653	40702810355000034082	30101810500000000653	\N	rakitina-ea@avaclinic.ru	Генеральный директор \nХоперский Андрей Анатольевич, \nдействующий на основании Устава	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:55.797	\N
cmnnlv9gd00h9tjogt3q4ypc1	cltenantdefault0000000000	Скандинавия	Литейный 55	t	\N	ООО «АВА-ПЕТЕР» ООО БУМ ДОКИ!	191014, Санкт-Петербург,	7825052242	784101001	1027809228072	СЕВЕРО-ЗАПАДНЫЙ БАНК ПАО СБЕРБАНК	044030653	40702810355000034082	30101810500000000653	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.414	\N
cmnnlv8gn00b6tjogsotitetj	cltenantdefault0000000000	Смайл /Smile Центр Стоматологии	г. Иваново, ул. Лежневская, д. 46	t	ivstomsmile@gmail.com\n\nРаботаем от юр. лица: ИП Соколов\n\nE-mail для договора/прайса: adm.ivstomsmile@gmail.com	ООО «ФЭС» ИП сверка ЭДО	153008, Ивановская область, город Иваново, Лежневская ул., д. 46, помещ. 2001	3702648951	370201001	1113702014348	БИК:042406608	042406608	40702810917000004722	\N	\N	adm.ivstomsmile@gmail.com	Игнатов Михаил Михайлович	t	\N	t	ИП2502-001\t20.02.25	t	IP	\N	\N	2026-04-06 19:50:55.127	\N
cmnnlv8ij00betjogvq6tgxmm	cltenantdefault0000000000	Смайл/ Smile	Загородный пр., д.10	t	7 (910) 281-26-23\nежедневно, 09:00–21:00\n\n+7 (910) 281-26-23 WhatsApp\nконтактное лицо по договору — \nадминистратор Александра (звонил 12.11.24)\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «ЭСТЕТИЧЕСКАЯ СТОМАТОЛОГИЯ» ООО бум.доки	191002 г.Санкт-Петербург,	7840109493	784001001	1237800122262	ПАО  СБЕРБАНК	044030653	40702810555000107023	30101510500000000653	\N	smile-center23@yandex.ru	\N	f	\N	t	2411-002\t01.11.24	f	OOO	\N	\N	2026-04-06 19:50:55.196	\N
cmnnlv90p00edtjogb3n3cw7q	cltenantdefault0000000000	Смайлс	Фурштатская ул., 47/11	t	работают в ЭДО\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nТакже в исходной строке было название: 47/11	ООО «СМАЙЛС» ООО ЭДО	191028, Россия, Санкт - Петербург,	7842181907	784201001	1207800074800	Филиал «Санкт - Петербургский» АО «Альфа - Банк»	044030786	40702810232000008721	30101810600000000786	\N	smilesclinic47@yandex.ru	\N	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.849	\N
cmnokku5v002ztj50b6d4a4xw	cltenantdefault0000000000	Смоленская ул.	д.18", "Чистое Дыхание	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.595	\N
cmnnlv96f00fgtjogdfdxby22	cltenantdefault0000000000	Современная стоматология "ZUB"	просп. Энгельса, 150, корп. 1	t	+7(812) 49-49-100\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Парадиз+» ООО ЭДО	194358, Россия, Санкт-Петербург	7802787530	780201001	1127847241169	"Санкт-Петербургский" АО	044030786	40702810132130003398	30101810600000000786	\N	4949100@gmail.com	Смирнова Полина Александровна	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:56.055	\N
cmnnlv8ip00bftjogrh0v7co3	cltenantdefault0000000000	Солоклиник	г. Москва, 2-й Самотёчный пер., д. 1	t	дубрировать счета можно ещё на WhatsApp\n+7 985 928-88-87\n\nНовый прайс с 01.11.23\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «СОЛОКЛИНИК» ООО ЭДО	127473, г. Москва, 2-й Самотёчный пер., д. 1	7707419744	770701001	1187746809535	\N	044525411	\N	30101810145250000411	\N	info@soloclinic.ru	\N	f	\N	t	2406-006 от 05.06.24\n\nПодписан ЭДО 19.06.24	t	OOO	\N	\N	2026-04-06 19:50:55.201	\N
cmnnlv8iu00bgtjog9p7ex1tj	cltenantdefault0000000000	Соул Дентал	ул. Республиканская, д. 24	f	Новый прайс 20.10.2023 накладки по новой цене\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «СОУЛ-ДЕНТАЛ» ООО бум.док. НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	195112, г. Санкт-Петербург, ул. Республиканская, д. 24, к. 1, стр. 1, ПОМЕЩ. 24Н.	7806548451	780601001	1187847249215	«АЛЕКСАНДРОВСКИЙ»	044030755	40702810600700212733	30101810000000000755	\N	souldental.spb@gmail.com	\N	f	\N	t	2406-008 от 07.06.24 с пролонгацией	f	OOO	\N	\N	2026-04-06 19:50:55.207	\N
cmnnlv8j000bhtjogx8b34idg	cltenantdefault0000000000	Спейсдент	18-я линия В.О., д. 45	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: spacedentspb@gmail.com	ООО «СПЕЙСДЕНТ» ООО бум.доки	199178, г. Санкт-Петербург,	7801669460	780101001	1197847158695	ПАО СБЕРБАНК	044030653	40702810955000095476	30101810500000000653	\N	spacedentspb@gmail.com	Генеральный директор \nБерезин Андрей Викторович	f	\N	t	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:55.212	\N
cmnnlv8j400bitjogkcbqu0t5	cltenantdefault0000000000	Спешл Ван / Special One	Морской пр., д. 29	t	hello@special-one.ru\n\nspecial-one.ru\n+7 (812) 222-23-45\nАдминистратор клиники\nежедневно, 09:00–21:00\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Ройал Диджитал Дентал Резорт» ООО ЭДО НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	197110, г. Санкт – Петербург,	7813639678	781301001	1197847204147	ФИЛИАЛ "САНКТ-ПЕТЕРБУРГСКИЙ" АО "АЛЬФА-БАНК"	044030786	40702810932410002264	30101810600000000786	\N	hello@special-one.ru	\N	f	\N	t	2411-018\t26.11.24	t	OOO	\N	\N	2026-04-06 19:50:55.216	\N
cmnnlv8vq00ditjogwyecxjzs	cltenantdefault0000000000	Частное лицо	\N	t	Работаем от юр. лица: Перевод	Наличные	Р/с	\N	\N	\N	\N	\N	\N	\N	\N	Врачу	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:55.671	\N
cmnnlv8j900bjtjog9bt53bem	cltenantdefault0000000000	Стом про лаб / Stom Pro Lab	Аптекарский пр., д. 18	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: Yukkident-apteka@yandex.ru	ООО «ЮККИДЕНТ» ООО сверка ЭДО	197022, г. Санкт-Петербург,	7810920231	781301001	1217800085711	\N	044525974	40702810610000913842	30101810145250000974	\N	Yukkident-apteka@yandex.ru	Генеральный директор Кучинская Ирина Ивановна	t	\N	t	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.222	\N
cmnnlv8je00bktjogbj8kuizz	cltenantdefault0000000000	Стом. центр д. Розанова	Наличная ул. д. 49	t	8 931 967-50-67 администратор\n\nРаботаем от юр. лица: ИП Соколов\n\nE-mail для договора/прайса: Idealzub@mail.ru	ООО «РозДент» ИП бум.доки	199155, Санкт-Петербург,	7801252330	780101001	1037800126451	«Санкт-Петербург»	044030790	40702810848000001876	30101810900000000790	\N	Idealzub@mail.ru	Генеральный директор \nРозанов Николай Николаевич	f	\N	f	2401-046 от 25.04.2024	f	IP	\N	\N	2026-04-06 19:50:55.227	\N
cmnnlv91g00ejtjogxje22uc2	cltenantdefault0000000000	Стом.клиника Горских	ул. Капитанская, д. 4	t	gorskyclinic@gmail.com\n\ngorskybank@gmail.com\n\n8-911-119-78-11\n\n\nЭДО Тензор СБИС\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: gorskyclinic@gmail.com\n\ngorskybank@gmail.com	ООО «Стоматологическая клиника Горских» ООО ЭДО+бум.доки НАПРАВИТЬ ДОГОВОР В НОВ.РЕД	199397, г.Санкт-Петербург, ул.Капитанская, д.4, лит.А, пом. 137Н	7801419614	780101001	5067847444440	Филиал «Санкт-Петербургский» АО «Альфа-Банк»	044030786	40702810732230004794	30101810600000000786	\N	gorskybank@gmail.com	\N	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.876	\N
cmnnlv8jj00bltjogbgq7d0g2	cltenantdefault0000000000	Стома Люкс	Поликарпова аллея, д. 6, к. 2	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Стома-Люкс» ООО ЭДО НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	197341, г. Санкт-Петербург,	7814037940	781401001	1027807587631	\N	044525411	40702810817350003894	30101810145250000411	\N	caterina@ro.ru	\N	f	\N	t	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.231	\N
cmnnlv8k800bntjogve0l2k7p	cltenantdefault0000000000	Стома-центр	Большая Советская ул., 32, Кингисепп	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Стома-Центр» ООО ЭДО	188490, Ленинградская область,	4707020665	470701001	\N	СПб РФ АО «Россельхозбанк»	044030910	40702810835180000063	30101810900000000910	\N	stomacenter17@mail.ru	Джаназян Арамаис Ашотович	f	\N	t	2501-006 13.01.25	f	OOO	\N	\N	2026-04-06 19:50:55.257	\N
cmnnlv8kk00bptjogwvoo75j6	cltenantdefault0000000000	Стоматико	ул. Б. Пороховская д. 26	t	Работаем от юр. лица: ИП Соколов	ООО «МОСТ» ИП бум.доки	195176, г.Санкт-Петербург,	7805109067	780601001	1027802740624	ОАО «СБЕРБАНК РОССИИ»	044030653	\N	\N	\N	stomatiko@yandex.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:55.269	\N
cmnnlv8ko00bqtjogp07le14f	cltenantdefault0000000000	Стоматологическая клиника 812	пр. Энгельса, д. 132 к.1	t	Генеральный директор: \n\nСмирнова Татьяна Адамовна\n8(921) 400 04 20\nТел.:  (812) 701-03- 83\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Стоматологическая клиника 812» ООО-бум.док+ЭДО	194356, г. Санкт-Петербург,	7811514049	780201001	1127847083000	ПАО Банк "АЛЕКСАНДРОВСКИЙ" г. Санкт-Петербург	044030755	40702810100700009420	30101810000000000755	\N	smirnovatatiana07@gmail.com	\N	f	\N	t	2409-021 \n20.09.24\n\nи доп.соглашение №1 от 06.12.24	t	OOO	\N	\N	2026-04-06 19:50:55.272	\N
cmnnlv9j700hwtjoggewaa065	cltenantdefault0000000000	Стоматологическая клиника PDC (ПДК)	Полтавский проезд, д. 2.	t	\N	ООО «ПДК» ООО	191036, Санкт-Петербург г, Полтавский проезд, дом 2,	7842112646	784201001	1167847292414	СЕВЕРО-ЗАПАДНЫЙ БАНК ПАО СБЕРБАНК	044030653	40702810255000028020	30101810500000000653	\N	info@pdc-clinic.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.516	\N
cmnnn6e5p002mtj80ocpvn5hu	cltenantdefault0000000000	Стоматология MDC	4-я линия В.О.,д. 57	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:35.342	\N
cmnnlv96i00fhtjog0xrm5szr	cltenantdefault0000000000	Стоматология «Центр инновационных технологий»	ул. Чекистов, д. 18А	t	(812) 6480089; 4071060.\nE-mail: info@doctora.net\nЭДО Контур Диадок\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: info@doctora.net	ООО «Центр инновационных технологий» ЭДО	198205, город Санкт-Петербург, ул. Чекистов, д. 18 литер а, часть помещения 5-н комната 2-9	7807345359	780701001	1097847250270	АО«Петербургский социальный коммерческий банк»	044030852	40702810100000027311	30101810000000000852	\N	info@doctora.net	Ген.дирекьор Кардаков Данила Алексеевич	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:56.059	\N
cmnnlv91j00ektjog7ywbh9rx	cltenantdefault0000000000	Стоматология Плюс	г.Иваново, ул.Воронина 2А	t	ЭДО Тензор СБИС\nтел.клиники 8-493-299-99-81\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: admin@dentistry-plus.ru\n\nТакже в исходной строке было название: ул.Воронина 2А	ООО «Стоматология плюс» ООО ЭДО	153035, Ивановская обл., г.о. Иваново, г. Иваново, ул. Воронина, д.2А	3702540926	370201001	1073702041995	ФИЛИАЛ №3652 БАНКА ВТБ (ПАО)	042007855	40702810517000015784	30101810545250000855	\N	admin@dentistry-plus.ru	Григорян Алексей Анатольевич\n8-910-689-85-55	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.879	\N
cmnnlv9gy00hdtjog17rmp5ab	cltenantdefault0000000000	Стоматология Сергея Левина	Фермское ш., 10	t	78126036036\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nТакже в исходной строке было название: 10	ООО «Стоматология Доктора Сергея Левина» ООО ЭДО	197341, г.Санкт-Петербург, шоссе Фермское, д.10, лит.А, пом.24-Н	7814761335	781401001	1197847149037	в  ФИЛИАЛЕ «СЕВЕРНАЯ СТОЛИЦА» АО «РАЙФФАЙЗЕНБАНК» г.Санкт-Петербург	044030723	40702810803000050996	30101810100000000723	\N	levindent@yandex.ru	Левин Сергей Алексеевич	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.435	\N
cmnnlv93o00eztjogm0e5hbgf	cltenantdefault0000000000	Стоматология Титан	Калининград, ул.Мирная, д.1, к.2, пом.7	t	89997922333 / 89097981001\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: 39.dent@gmail.com	ООО «Империал» ООО ЭДО НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	236001, Калининградская область, г. Калининград, ул Мирная д.1, к.2, помещение 7	3906412930	390601001	1223900004800	К/с 30101810100000000634	042748634	40702810920000008141	30101810100000000634	\N	39.dent@gmail.com	Губанов Дмитрий Андреевич	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.956	\N
cmnnlv8kz00bstjog869wrqza	cltenantdefault0000000000	Стоматология а2	ул. Куйбышева, д. 33/8	t	Работаем от юр. лица: ИП Соколов	ООО «АВРОРА» ИП-бум.доки НЕТ ДОГОВОРА!	197046, г. Санкт-Петербург,	7813635426	781301001	1197847123407	\N	044030653	40702810955000048588	\N	\N	a2.clinic2019@gmail.com	Генерельный директор \nА.О. Гаджиев	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:55.284	\N
cmnnlv98z00fvtjoguyp7pcrz	cltenantdefault0000000000	Стоматология для бережливых	г. Шлиссельбург, ул. Жука, д. 3, лит. А, часть помещения №6 и часть помещения № 8	t	8-921-907-47-54\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: info@berech-stom.ru	ООО «АрмДент »	187320 Лен.обл., Кировский р-н, г. Шлиссельбург, ул. Жука, д. 3, лит. А, часть помещения №6 и часть помещения № 8	4706039180	470601001	1174704013880	АО «Альфа-Банк» в г. Санкт-Петербург	044030786	40702810132250001885	30101810600000000786	\N	armenzubnik@mail.ru	Восканян Армен Юрикович \n8-921-907-47-54	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.148	\N
cmnnlv93400evtjoge7h2pskr	cltenantdefault0000000000	Стоматология док. Бакарова	г.Грозный, пр.Кадырова, 207	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: apple.mehdi@icloud.com	ООО «Стоматологическая клиника доктора Бакарова» ООО ЭДО НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	366344, Чеченская Республика, Веденский р-н, с Махкеты, ул С.А.Бисултанова, двлд. 94	2003003324	200301001	1232000008833	Ставропольское отделение №5230 ПАО СБЕРБАНК	040702615	40702810960360003719	30101810907020000615	\N	apple.mehdi@icloud.com	Бакаров Рахман Асламбекович	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.937	\N
cmnnlv8l800bttjog3osa77i7	cltenantdefault0000000000	Стоматология доктора Пушкина	ул. Захарьевская 7	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «ГАЛА-СТАР» ООО-ЭДО НАПР.ДОГОВОР В НОВОЙ РЕДАКЦИИ	191123, г. Санкт-Петербург, ул. Захарьевская, д. 7, лит. А, пом. 9н, комн.1	4703155774	784101001	1184704006266	ООО "Банк Точка"	044525104	40702810120000046927	30101810745374525104	\N	doctor.pushkin@mail.ru	\N	f	\N	t	2410-007 от 14.10.24	t	OOO	\N	\N	2026-04-06 19:50:55.292	\N
cmnnlv92u00ettjogt3xnryxg	cltenantdefault0000000000	Стоматология доктора Чернявского	Галерная ул., 40	t	8-981-705-01-89 Арина\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: stom.ch.spb@gmail.com\n\nТакже в исходной строке было название: 40	ООО «Стоматологический центр доктора Чернявского» ООО бум.доки	344022, Ростовская область, город Ростов-на-Дону, Пушкинская ул., д. 225/41/224, ком. 11а	6168002520	616301001	1046168019567	ФИЛИАЛ «РОСТОВСКИЙ» АО «АЛЬФА-БАНК»	046015207	40702810026000007721	30101810500000000207	\N	stom.ch.spb@gmail.com	Пьянова Ольга Юрьевна	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:55.926	\N
cmnnlv90a00eatjog78egj83z	cltenantdefault0000000000	Стоматология на Пушкарской	Большая Пушкарская ул., д.58	t	8-812-385-37-07\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: stoma.bp58@mail.ru	ООО «Стоматология на Пушкарской» ООО бум.доки	197101, г. Санкт-Петербург, ул. Большая Пушкарская, д.58, литер.А	7813454243	781301001	1097847279045	Северо-Западный банк Сбербанка РФ	044030653	40702810855200001470	30101810500000000653	\N	stoma.bp58@mail.ru	Генеральный директор Мордухович Евгения Александровна	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:55.835	\N
cmnnlv8lc00butjogqir4masa	cltenantdefault0000000000	Стоматология на Пушкарской Большая	Большая Пушкарская ул., д. 58\nПушкарская ул., д.58 Ч/л	t	Работаем от юр. лица: Перевод	Доставка в клинику заказ на частное лицо ООО «»\nИНН	Р/с	\N	\N	\N	К/счет	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:55.297	\N
cmnnlv8lg00bvtjogizrs5bdu	cltenantdefault0000000000	Стоматология на Стародеревенской	ул. Стародеревенская, д. 33/10	f	клиника не активна, не поступают заказы\n\nтелефон: (812) 565-06-02\ne-mail: clinika1@mail.ru\nwww.clinika1.ru\n\nЛюксДент\nул. Стародеревенская, д.33/10	ООО «Стоматология на Стародеревенской»	197372, г. Санкт-Петербург,	7814303279	781401001	1047855034677	\N	044030653	\N	\N	\N	Clinika1@mail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:55.3	\N
cmnnlv9g500h7tjog8453q72q	cltenantdefault0000000000	Стомдент	Всеволожск, Малиновского 6	t	Также в исходной строке было название: Малиновского 6	ООО «»\nИНН	Р/с	\N	\N	\N	К/с	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.406	\N
cmnnlv8lk00bwtjogtjq0h9qe	cltenantdefault0000000000	Стомкрафт	пр. Художников, д. 12	t	Работаем от юр. лица: ИП Соколов	ООО «Артстом» ИП бум.доки	194354, Санкт-Петербург г,	7802588534	780201001	1167847310740	Ф-Л СЕВЕРО-ЗАПАДНЫЙ	044030795	40702810403200001249	30101810540300000795	\N	info@stomcraft.ru	\N	f	\N	f	ИП2502-006 от 21.02.25	f	IP	\N	\N	2026-04-06 19:50:55.304	\N
cmnnlv8lo00bxtjog9e7n9jph	cltenantdefault0000000000	Стомлаб /Stomlab Казахстан	г. Алматы\nул. Луганского, д. 1	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: s.zemfira@mail.ru	[object Object]	050051 Казахстан,  Г.АЛМАТЫ,	\N	\N	\N	АО «ForteBank» в г. Алматы	\N	\N	\N	\N	s.zemfira@mail.ru	Сулейманова Земфира Бахтияровна\n87071244403\n@szemfira5	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:55.308	\N
cmnnlv8ls00bytjogovco8msw	cltenantdefault0000000000	Стомтек	г. Курск\nул. К.Маркса, д.49, оф.10	t	7 (4712) 78-53-03\nАдминистратор клиники\n7 (4712) 23-82-23\nАдминистратор клиники\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «СТОМТЕК» ООО ЭДО	305029, г. Курск,	4632234635	401001632	1174632016679	России	043807606	40702810933000003761	30101810300000000606	\N	lana.voronina.81@mail.ru	\N	f	\N	t	2411-004 от 07.11.24	t	OOO	\N	\N	2026-04-06 19:50:55.312	\N
cmnnlv8lw00bztjoguob2vek2	cltenantdefault0000000000	Стомус	Санкт-Петербург, проспект Луначарского, д.49	t	Телефон (ОСНОВНОЙ) ЗТЛ iLab\t+7-921-910-32-42 Администраторы ЗТЛ\n\n\nЛицо, ответственное за оплату счетов (Ф.И.О.)        Старший администратор Миловидова Оксана Николаевна\nТелефон        +7-921-415-30-51\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: o.milovidova.ilab@stomus.ru	ООО «СЦ «Стомус» ООО ЭДО	194291, г. Санкт-Петербург, пр-кт Луначарского, д. 49	7802373610	780201001	1069847503461	«Александровский»	044030755	40702810900300006942	30101810000000000755	\N	iLab@stomus.ru	Черновол Елизавета Михайловна	f	\N	t	2405-020 \n13.05.24	t	OOO	\N	\N	2026-04-06 19:50:55.316	\N
cmnnlv8m700c1tjogebojmmw7	cltenantdefault0000000000	Сторидент	Дмитровский пер., д. 10	t	v3\n\nРаботаем от юр. лица: ИП Соколов	ООО «Новый зуб» ИП ЭДО	191025, г. Санкт-Петербург,	7840089656	784001001	1197847197130	\N	044525092	40702810870010179303	30101810645250000092	\N	StoryDentspb@yandex.ru	Беспашнина Мария Николаевна	f	\N	t	2023/10-030 от 26.10.23\n\nкурьером 01.11.23	t	IP	\N	\N	2026-04-06 19:50:55.327	\N
cmnnlv8mu00c5tjoghxcazjl2	cltenantdefault0000000000	Сторк Дент	ул. Комиссара Смирнова, 5/2\nул. Комиссара Смирнова, д. 5/2	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «СД» ООО ЭДО	195009 г. Cанкт-Петербург,	7804625580	780401001	1187847230141	\N	044030786	40702810232440001618	30101810600000000786	\N	cd.storkdent@gmail.com	\N	f	\N	t	2406-030 от 15.07.2024	t	OOO	\N	\N	2026-04-06 19:50:55.35	\N
cmnnlv8mi00c3tjog8lduvp3o	cltenantdefault0000000000	Сторк Дент Переехали на Смирнова 5/2	ул. Гжатская, д.22 к.3 - старый адрес\nКомиссара Смирнова д.5/2 литера А	t	c 06.11.2024  — новый юридический адрес\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: sd@storkdent.ru	ООО «СД» ООО ЭДО	195009, г. Санкт-Петербург, вн.тер.г. муниципальный округ Финляндский округ, ул. Комиссара Смирнова д.5/2 литера А, офис 1, помещ.12-Н	7804625580	780401001	1187847230141	\N	044030786	40702810232440001618	30101810600000000786	\N	sd@storkdent.ru	Савченко Лариса Николаевна	f	\N	t	2406-030 от 15.07.2024	t	OOO	\N	\N	2026-04-06 19:50:55.339	\N
cmnnlv8n300c6tjogdd9nmz8o	cltenantdefault0000000000	Студия 32	Казначейская ул., 4/16 (этаж 1)	t	care@studio32spb.ru \nstomstudia32@yandex.ru\n7 (812) 315-63-17, \n7 (996) 760-48-48\n\n\nОплачивают 1  раз в неделю по четвергам.\nВыставлять до 15:00 ч четверг\n\n13.10.2023\n1.01 выслал\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nТакже в исходной строке было название: 4/16	ООО «СТУДИЯ 32» ООО ЭДО	198095, город Санкт-Петербург, улица Балтийская,	7805720981	780501001	1187847015212	Точка»	\N	\N	\N	\N	irushka312@mail.ru	\N	f	\N	t	2406-017 от 20.06.2024\n\n2406-017 ДС №1  09.01.25 до  30.06.25	t	OOO	\N	\N	2026-04-06 19:50:55.359	\N
cmnnn6fbf0059tj801igftuj2	cltenantdefault0000000000	Студия 32	Казначейская ул., 4/16	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:36.843	\N
cmnnlv93s00f0tjoggsxwvxjb	cltenantdefault0000000000	Студия Стоматологического Искусства ул.Резная, 6	УЛ. РЕЗНАЯ, Д. 6	t	8(950) 224-11-88\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: Studiostom@yandex.ru\nrma-stom@yandex.ru	ООО «СТУДИЯ СТОМАТОЛОГИЧЕСКОГО ИСКУССТВА» ООО бум.доки	197110, город Санкт-Петербург, Резная ул, д. 6 литера А, помещ. 4-н	7813669873	781301001	1237800006080	ПАО СБЕРБАНК	044030653	40702810855000142995	30101810500000000653	\N	Studiostom@yandex.ru\nrma-stom@yandex.ru	\N	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:55.96	\N
cmnnlv9ip00hstjogc8usbt0j	cltenantdefault0000000000	Студия улыбок	ул.Малая Разночинная 10	t	\N	ООО «СТУДИЯ УЛЫБОК»	197110, город Санкт-Петербург, Малая Разночинная ул, д. 10 стр. 1, помещ. 17-н офис 2	7813657620	781301001	1217800157970	ООО "Банк Точка"	044525104	40702810001500106774	30101810745374525104	\N	nadim.latifov@mail.ru	Шайдаев Идаят Азимович	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.497	\N
cmnnlv8nb00c7tjogu7wjjeys	cltenantdefault0000000000	Счастливые зубы	пр. Ветеранов, д. 122	t	daryashemyakina@inbox.ru - Боровец\nzubi572@mail.ru - работы Касимовой\nПо вопросам оплат и документов можно \nзвонить ст.админу Дарине +7-921-399-11-90\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: 5729181@mail.ru	ООО «Счастливые Зубы» ООО ЭДО	198205, г. Санкт-Петербург,	7807311582	780701001	1067847206734	\N	044030786	40702810132000019027	30101810600000000786	\N	5729181@mail.ru	\N	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.368	\N
cmnnlv8nu00catjoghk1ytt0n	cltenantdefault0000000000	Счастливые зубы ОП	Ленинский пр., д. 64, к. 1	t	По вопросам оплат и документов можно звонить ст.админу Дарине +7-921-399-11-90\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: 5729181@mail.ru	ООО «Счастливые Зубы» ОП ООО ЭДО	198205, г. Санкт-Петербург,	7807311582	780701001	1067847206734	\N	044030786	40702810132000019027	30101810600000000786	\N	5729181@mail.ru	\N	f	\N	f	[object Object]	t	OOO	\N	\N	2026-04-06 19:50:55.387	\N
cmnnlv98m00fttjogkju5ygoz	cltenantdefault0000000000	Сэд клиник	Звенигородская 24	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: kkarahanova752@gmail.com\nsed@dokspb.ru	ООО «ЗУБНАЯ ФЕЯ»	191119, г. Санкт-Петербург, вн. тер. г. муниципальный округ Владимирский Округ, ул. Звенигородская, д. 24, литера А, помещ. 5-Н	7839069253	784001001	1167847309662	СЕВЕРО-ЗАПАДНЫЙ БАНК ПАО СБЕРБАНК	044030653	40702810855000069971	30101810500000000653	\N	sed@dokspb.ru	\N	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.135	\N
cmnnlv9g900h8tjog0lgq0mt2	cltenantdefault0000000000	Терия	Тележная 32	t	E-mail для договора/прайса: teriaclinic@mail.ru	ООО «МВМ КЛИНИК»	191167, Санкт-Петербург, Муниципальный округ Лиговка-Ямская, Санкт-Петербург, ул. Тележная, д. 32, строение 1, офис, помещ. 21Н, офис 1.	7842218723	784201001	\N	Филиал «Центральный» Банка ВТБ (ПАО).	044525411	40702810126210001630	30101810145250000411	\N	teriaclinic@mail.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.41	\N
cmnnlv8o300cctjogm4rl4s9p	cltenantdefault0000000000	Томсон Клиника	пр. Ударников, д.41, к.1	f	tomsonstom@mail.ru\n\nРаботаем от юр. лица: ИП Соколов	ООО "Томсон" ИП бум.доки	195030, г. Санкт-Петербург, пр-кт Ударников, Д.41, К.1, КВ.329	7806142613	780601001	1037816043990	СЕВЕРО-ЗАПАДНЫЙ БАНК ПАО СБЕРБАНК	044030653	40702810955130172832	30101810500000000653	\N	tomsonstar@mail.ru	\N	f	\N	f	\N	t	IP	\N	\N	2026-04-06 19:50:55.395	\N
cmnnlv8p200chtjogor7fn2m8	cltenantdefault0000000000	Тотал Стом	ул. Орджоникидзе, д. 52	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «ТОТАЛ- С» ООО бум.доки!	196233, г. Санкт-Петербург, ул. Орджоникидзе, д. 52, лит. А, пом. 88Н, оф. 1	7810798239	\N	1207800084194	САНКТ- ПЕТЕРБУРГ»	044030790	\N	30101810900000000790	\N	totalstom@gmail.com	\N	f	\N	t	2408-004 20.08.24	f	OOO	\N	\N	2026-04-06 19:50:55.43	\N
cmnnlv9jk00hytjog6962sels	cltenantdefault0000000000	Тризет	г. Тверь, ул. 1-я Трусова, д.1	t	8 (900) 015-85-78	ООО «Стоматологическая Клиника «ТРИЗЕТ»	170002, г. Тверь, ул. 1-я Трусова, д.1, пом. IV	6950039776	695001001	1156952018630	Тверское отделение №8607 ПАО Сбербанк	042809679	40702810763000006000	30101810700000000679	\N	trizet.tver@mail.ru	Неустроев Александр Олегович	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.528	\N
cmnnlv8pg00cjtjogsrqdfq6m	cltenantdefault0000000000	Улыбайся Стоматология Доктора Казумова	Дальневосточный пр. д. 12 к.2	f	клиника не активна, не поступают заказы  декабря 23г	ООО «Счастливые Люди»	197345, г. Санкт-Петербург,	7814804878	781401001	1227800024220	ПАО СБЕРБАНК	044030653	\N	\N	\N	Магомадов Ильяс в тг	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:55.444	\N
cmnnn6d7i0009tj806sh5moaq	cltenantdefault0000000000	Улыбайтесь чаще	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:34.11	\N
cmnnlv8pv00cltjognmi7oyd3	cltenantdefault0000000000	Улыбайтесь чаще Калининград	\N	t	Работаем от юр. лица: ИП Соколов	ООО «Улыбайтесь Чаще» ИП ЭДО	236023, г. Калининград,	3906391790	390601001	1203900006375	\N	\N	\N	\N	\N	Gd@smilemore.ru\nЭДО	\N	f	\N	f	\N	t	IP	\N	\N	2026-04-06 19:50:55.459	\N
cmnnlv8pz00cmtjogsy059uyr	cltenantdefault0000000000	Уни Дент	Б. Сампсониевский пр., д. 47	t	info@yni-dent.ru\n\nv3\n\nРаботаем от юр. лица: ИП Соколов\n\nE-mail для договора/прайса: info@yni-dent.ru, st.assistent.vib@yni-dent.ru	ООО «Уни Дент Плюс» ИП ЭДО	194044, г.Санкт-Петербург, пр.Б.Самсониевский,	7814455874	780201001	1099847038092	"ФК	044030795	40702810003180001332	30101810540300000795	\N	shtelmah@yni-dent.ru	Управляющий — индивидуальный предприниматель Абрамчук Константин Владимирович\n\n\nгл.врач, хирург \nИнна Владимировна\n+7 953 169 46 83	f	\N	t	нет	t	IP	\N	\N	2026-04-06 19:50:55.463	\N
cmnnlv9dj00gotjogg78zka0m	cltenantdefault0000000000	Уринг Клиник	г. Томск, ул. Гоголя, д.15	t	Директор по коммуникациям        Уринг Евгения Александровна  8-905-992-66-71\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: info@uringclinic.ru	ООО «ТОМУР»	634029, Т.О., г. Томск, ул. Гоголя, д.15	7017461242	701701001	1197031058696	ПАО «Томскпромстройбанк» г.Томск	046902728	40702810706710002255	30101810500000000728	\N	info@uringclinic.ru	Уринг Алексей Александрович\n 8-905-992-66-70	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:56.311	\N
cmnnlv91800ehtjoghgw9h202	cltenantdefault0000000000	ФГБУ "КДЦ с поликлиникой"	Морской пр., 3	t	Тел. 305-2484, факс 305-2459\nвсе документы в бум.виде!\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: natalia.kulygina35@yandex.ru	ФГБУ «Консультативно-диагностический центр с поликлиникой» ООО бум.доки	197110, г.Санкт-Петербург, Морской пр., д.3	7813413889	781301001	1089847186076	\N	044030001	40501810300002000001	\N	\N	natalia.kulygina35@yandex.ru	в лице Главного врача Иванова Георгия Алексеевича, действующего на основании Устава	f	\N	f	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:55.868	\N
cmnnlv8t400d0tjogzzkfr4k1	cltenantdefault0000000000	ФГБУ Клиника высоких технологий им. Пирогова	\N	t	Куюмчьян Сергей Юрьевич - зав стоматологией \n+7 962 684 8409\n\n\nМихаил Корякин  — контактное лицо по оплате\n+7 908 145 1126\n@Mihail_Kot (https://t.me/Mihail_Kot)\n\nРаботаем от юр. лица: ИП Соколов	[object Object]	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:55.576	\N
cmnnlv8tj00d3tjogofj722z9	cltenantdefault0000000000	ФК клиник	пр. Римского-Корсакова, д.8/18	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: firstclassy@yandex.ru	ООО «ФЕРСТ КЛАСС КЛИНИК» ООО ЭДО	190068, г. Санкт-Петербург,	7838119208	783801001	1247800000601	АО «ТИНЬКОФФ БАНК»	044525974	40702810810001547091	30101810145250000974	\N	firstclassy@yandex.ru	\N	f	\N	t	2411-019\t27.11.24	t	OOO	\N	\N	2026-04-06 19:50:55.591	\N
cmnnlv8ty00d6tjogl7x72tr0	cltenantdefault0000000000	ФРЭНДЛИ ДЕНТАЛ	Малая Митрофаньевская, Д. 5, К. 1	f	89111008222 (админский номер)\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: sfriendlydental@gmail.com	ООО «ФРЭНДЛИ ДЕНТАЛ СТУДИО» ЭДО НЕТ ДОГОВОРА!	196084, РОССИЯ, г. Санкт-Петербург, МУНИЦИПАЛЬНЫЙ ОКРУГ ИЗМАЙЛОВСКОЕ, Улица Малая Митрофаньевская, Д. 5, К. 1 СТР. 1, квартира/офис ПОМЕЩ. 27Н	7838106350	783801001	1227800089076	ФИЛИАЛ "САНКТ-ПЕТЕРБУРГСКИЙ" АО "АЛЬФА-БАНК" в СЕВЕРО-ЗАПАДНОЕ ГУ БАНКА РОССИИ	044030786	40702810732370002672	30101810600000000786	\N	sfriendlydental@gmail.com	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:55.607	\N
cmnnlv8qa00cotjogqu05c051	cltenantdefault0000000000	Фабердент	Московский пр., д. 127, лит. З	f	Работаем от юр. лица: ИП Соколов\n\nE-mail для договора/прайса: skanceva@mail.ru	ООО «Фабердент»	196006, г. Санкт-Петербург, Московский пр-кт, д. 127, лит. З, ПОМЕЩ. 6-Н	7810875927	781001001	1127847364370	\N	044030790	40702810790160000179	30101810900000000790	\N	skanceva@mail.ru	\N	f	\N	f	сделать	f	IP	\N	\N	2026-04-06 19:50:55.474	\N
cmnokkt3m000rtj509vlqm3pb	cltenantdefault0000000000	Фактор Улыбки	Коломяжский пр., д. 20	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.218	\N
cmnokksz3000itj503b7tb9n2	cltenantdefault0000000000	Фактор Улыбки Будепштская	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.056	\N
cmnnlv8sm00cxtjogep3jke29	cltenantdefault0000000000	Фактор Улыбки на Варшавской	\N	f	\N	[object Object]	\N	\N	\N	\N	\N	\N	\N	\N	\N	zhdanova@factorsmile.ru	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:55.559	\N
cmnnlv8sr00cytjogwf6eb8ia	cltenantdefault0000000000	Фактор Улыбки на Сиреневом	Сиреневый бул., 18, к.1	t	89811200017 управляющая\n\nранее управляющая -Мельниченко Ирина\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: fomina@factorsmile.ru	ООО «Прайм» ООО ЭДО	194352, г. Санкт-Петербург,	7802682826	780201001	1187847384229	\N	044030786	40702810432130012267	30101810600000000786	\N	fomina@factorsmile.ru	\N	f	\N	t	ДС №1 от 09.01.25 до 30.06.25\n\n\n2409-017        13.09.24	t	OOO	\N	\N	2026-04-06 19:50:55.563	\N
cmnnn6kl200axtj8094tsxmj8	cltenantdefault0000000000	Фактор Улыбки на Сиреневом	Сиреневый бул., 18, к.1	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:43.67	\N
cmnnn6ed20033tj807lqtw1i0	cltenantdefault0000000000	Фактор улыбки на Коломяжском	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:35.607	\N
cmnnn6des000rtj807yj8mizm	cltenantdefault0000000000	Фактор улыбки?	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:34.373	\N
cmnnlv8tu00d5tjogn7ijig81	cltenantdefault0000000000	Фортис Денте	Фермское шоссе,  д. 32	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: dentefortis@gmail.com	ООО «ФОРТИС ДЕНТЕ» ООО ЭДО	197341, г Санкт-Петербург, ш Фермское, д 32 литера а, помещ 29Н	7814719799	781401001	1187847030810	ТОЧКА ПАО БАНКА «ФК ОТКРЫТИЕ»	044525999	40702810703500008060	30101810845250000999	\N	dentefortis@gmail.com	\N	f	\N	f	Договор 2406-032 от 16.04.25\n\n\nДС №1 от 08.04.25	t	OOO	\N	\N	2026-04-06 19:50:55.602	\N
cmnnlv9hw00hktjogxwc1l03m	cltenantdefault0000000000	Фёрст Дентал Клиник ФДС First Dental	ул Благодатная, д 50 стр 1	t	79118190202\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «ФДС»	196105, г Санкт-Петербург, Московский р-н, ул Благодатная, д 50 стр 1, помещ 121Н,	7810375762	781001001	1257800004648	ФИЛИАЛ "САНКТ-ПЕТЕРБУРГСКИЙ" АО "АЛЬФА-БАНК	044030786	40702810432410016815	30101810600000000786	\N	firstdentalclinic@mail.ru	Дзебоев Борис Станиславович	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.468	\N
cmnnlv8u200d7tjogliutipup	cltenantdefault0000000000	Хемеда	Шуваловский пр-кт, д. 72, к. 1, лит. А, ПОМЕЩ. 5-Н	f	info@hemeda.ru\n\nРаботаем от юр. лица: ИП Соколов\n\nE-mail для договора/прайса: info@hemeda.ru	ООО «ХЕМЕДА» ИП-бум.доки	197082, г. Санкт-Петербург, Шуваловский пр-кт, д. 72, к. 1, лит. А, ПОМЕЩ. 5-Н	7814259012	781401001	1157847240231	\N	044525411	40702810728264220218	30101810145250000411	\N	info@hemeda.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:55.611	\N
cmnnlv8ub00d9tjogibynt0xm	cltenantdefault0000000000	Холодовъ	ул. Варшавская, д. 19, к. 2	t	пн-сб с 10 до 19\nвс - выходной\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «ХОЛОДОВЪ» ООО бум.доки	196128, г. Санкт-Петербург,	7810504993	781001001	1089847048940	\N	044030786	40702810732400001475	30101810600000000786	\N	4674699x@gmail.com	\N	f	\N	t	2411-005 от 07.11.24	f	OOO	\N	\N	2026-04-06 19:50:55.62	\N
cmnnlv8u600d8tjogmgdua2vp	cltenantdefault0000000000	Холодовъ ЛО, п.Кузьмоловский, , д. 2Г	п. Кузьмоловский\nул. Рядового Леонида Иванова, 2Г	t	пн-сб с 10 до 19\nвс - выходной\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «ХОЛОДОВЪ» ООО бум.доки	196128, г. Санкт-Петербург,	7810504993	781001001	1089847048940	\N	044030786	40702810732400001475	30101810600000000786	\N	4674699x@gmail.com	\N	f	\N	t	2411-005 от 07.11.24	f	OOO	\N	\N	2026-04-06 19:50:55.615	\N
cmnnlv8z100e2tjogs5c2v9up	cltenantdefault0000000000	Хорошая стоматология	Учебный пер., д. 2	t	Работаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: stom@goodstom.ru	ООО «Хорошая стоматология» ООО бум.доки НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	194354 г. Санкт-Петербург,	7802325334	780201001	1057810809869	СЕВЕРО-ЗАПАДНЫЙ БАНК	044030653	40702810155000001383	30101810500000000653	\N	stom@goodstom.ru	Генеральный директор Торопцев Владислав Юрьевич	f	\N	t	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:55.789	\N
cmnnlv8uf00datjogpdea808r	cltenantdefault0000000000	Хьюстон / Houston	ул. Кременчугская, д.9, к. 2	t	счета стараться отправлять на три почты, потому что они их теряют\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Кременчугская 9» ООО ЭДО+бум.доки!	191167, г. Санкт-Петербург,	7839068281	784201001	1167847289048	ПАО СБЕРБАНК	044030653	40702810855000038067	\N	\N	auryupina@hstn.ru\n tfisun@hstn.ru\n info@hstn.ru	\N	f	\N	t	2411-003	t	OOO	\N	\N	2026-04-06 19:50:55.624	\N
cmnnn6ff1005ctj807dtevkiy	cltenantdefault0000000000	Центр цифровой стоматологии	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:36.973	\N
cmnnlv8uk00dbtjoglbbe4uyc	cltenantdefault0000000000	Центр цифровой стоматологии Москва.	Москва. Грохольский переулок 30к 1\nГрохольский пер. д. 30, к. 1	f	(495) 621-17-61\n\nРаботаем от юр. лица: ИП Соколов\n\nE-mail для договора/прайса: stompo@mail.ru	ООО «СТОМПО»	129090, г. Москва, Грохольский пер.,   дом 30, корпус 1, эт. 1, пом. 1, комн. 1-6	7712030777	770801001	1027739541939	АО "ТИНЬКОФФ БАНК" г. МОСКВА	044525974	40702810110000433204	30101810145250000974	\N	stompo@mail.ru	\N	f	\N	f	\N	f	IP	\N	\N	2026-04-06 19:50:55.629	\N
cmnnlv8uw00ddtjogtnf3t2sk	cltenantdefault0000000000	Циркон	ул. Большая Московская, д. 8/2	t	9818124747@mail.ru\n+7 (812) 606-70-86\n+7 (981) 812-47-47\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Циркон» ООО бум.доки НАПР.ДОГОВОР В НОВ.РЕДАКЦИИ	191002, г. Санкт-Петербург,	7840108732	784001001	1237800110129	ПАО СБЕРБАНК	044030653	40702810355000088164	30101810500000000653	\N	circon-clinic@mail.ru	\N	f	\N	t	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:55.641	\N
cmnnlv9i700hntjog1kcx2hlq	cltenantdefault0000000000	Челлюкс	пр. Маршала Блюхера, д. 7 к. 2	t	Клиника +7(921) 966-55-22\n\n\nЛицо, ответственное за оплату счетов (Ф.И.О.)        Грачев Дмитрий Олегович\nТелефон        +7(962)686- 12-86\n\nE-mail для договора/прайса: info@chellux.ru	ООО «Челлюкс» ООО ЭДО	195197, Санкт-Петербург, пр. Маршала Блюхера, д. 7 к. 2, стр. 1, пом. 36-Н	7804638565	780401001	1197847047661	МОСКОВСКИЙ ФИЛИАЛ АО КБ "МОДУЛЬБАНК"	044525092	40702810170010136994	30101810645250000092	\N	barti@bk.ru \ninfo@chellux.ru	Грачев Дмитрий Олегович	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.479	\N
cmnnlv8vu00djtjogf5j3a82a	cltenantdefault0000000000	Честный доктор	ул. Комсомола, д.23-25	t	8 (812)220-90-39\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «НЕВА» ООО бум.доки НАПР.ДОГОВОР.В НОВ.РЕДАКЦИИ	196084, Россия, Санкт-Петербург,	7804675207	780401001	1207800114268	\N	044525411	40702810328690002798	30101810145250000411	\N	erkin343@mail.ru	Бадаев Рустам Касымович, главный врач\n\n\nХоджаев Эркин Шавкатович \nГен директор \n8 (952) 376-61-46	f	\N	t	[object Object]	f	OOO	\N	\N	2026-04-06 19:50:55.675	\N
cmnokktw1002ltj50w44jtn09	cltenantdefault0000000000	Чистое Дыхание	Смоленская ул., д.18	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.241	\N
cmnnn6e1g002atj807jzcl2pe	cltenantdefault0000000000	Чистое дыхание	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:35.189	\N
cmnnn6f3b004utj80kciagwup	cltenantdefault0000000000	Чистое дыхание Будапештская	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-06 20:27:36.551	\N
cmnokktgo001otj501bpmka3q	cltenantdefault0000000000	Чкаловский пр.	д. 50", "Атрибьют Клиник /	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.688	\N
cmnokktdm001ftj503vbahsyq	cltenantdefault0000000000	Шуваловский пр., д. 72	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.578	\N
cmnokkt2x000ptj509ixtj8qa	cltenantdefault0000000000	Щербаков пер.	д. 2/58	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.193	\N
cmnnlv9d000gltjogomu67l57	cltenantdefault0000000000	Эвидентал	пр. Маршала Блюхера, д. 9 к.1	t	\N	ООО «Клиника Эвидентал» ООО ЭДО	Россия, 195197, Санкт-Петербург,	7804625421	780401001	1187847226973	АО «ТИНЬКОФФБАНК»	044525974	\N	\N	\N	info@evidental.ru	Симонова Елена Григорьевна\n8 (911) 975-04-02	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:56.292	\N
cmnokktlu001ztj50dz07nqjq	cltenantdefault0000000000	Эксклюзив ММЦ	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.874	\N
cmnnlv8wg00dmtjogfy4ixwty	cltenantdefault0000000000	Элайн Клиник	Морская наб., д. 25	f	9067777@aline-clinic.ru\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Элайн Клиник»	Россия, 199155, г. Санкт-Петербург, набережная Морская, д. 25 корп. 1, литера А, пом. 2-Н.	7801670970	780101001	1197847178198	\N	044030653	40702810955000051973	30101810500000000653	\N	9067777@aline-clinic.ru	\N	f	\N	f	\N	f	OOO	\N	\N	2026-04-06 19:50:55.697	\N
cmnnlv8wk00dntjoghtycyw20	cltenantdefault0000000000	Энталь	ул. Блохина, д. 20/7	t	7 921 302 6655 тг\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «ЧИЗ ДЕНТАЛ КЛИНИК» ООО ЭДО ЭДО	197198, г. Санкт-Петербург,	7813669369	781301001	1227800166153	Точка»	044525104	40702810401500171176	30101810745374525104	\N	direct@cdentalclinic.ru	Поляков Антон Леонидович	f	\N	t	2502-006\t10.02.2025	t	OOO	\N	\N	2026-04-06 19:50:55.701	\N
cmnnlv8ww00dptjog7bstbq0k	cltenantdefault0000000000	Эскулап	ул.Большая Пушкарская д.17, Дентикюр, ул. Шпалерная д. 54	t	тел.клиники 88125651705\n\nсчета дублировать Мазуириной в тг\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Эскулап» ООО ЭДО	197198, Санкт-Петербург, ул.Большая Пушкарская д.17, пом.1-Н, лит. А	7813142830	781301001	1027806878505	«САНКТ-ПЕТЕРБУРГ»	044030790	40702810590200001704	30101810900000000790	\N	info@aesculap.clinic	\N	f	\N	t	ДС №1 от 09.01.25 подписан\n\n2406-015        01.06.24	t	OOO	\N	\N	2026-04-06 19:50:55.713	\N
cmnnlv8x400dqtjog5ph0d1b1	cltenantdefault0000000000	Эсте	ул. Орловская д.1\nСвердловская наб., д. 62", Эсте, ул. Орловская д.1	t	8(812) 570-50-05, \n8(921)936-30-36	ООО «ЭСТЕ» ООО ЭДО	/Факт адрес: 191124, Санкт-Петербург, ул. Орловская д.1 лит.А, п 7-Н	7842170207	784201001	1197847073720	"ФК ОТКРЫТИЕ" г. Санкт-Петербург	044030795	40702810202320000101	30101810540300000795	\N	office@este-ortho.ru	\N	f	\N	t	2408-006 01.08.24\n\n2408-006 ДС №1	f	OOO	\N	\N	2026-04-06 19:50:55.72	\N
cmnnlv90t00eetjogls1mxtd6	cltenantdefault0000000000	Эстетика выходной в среду и субботу	ул. Челюскина, 6	t	8-981-858-05-05  админы\n\nВыходной в клинике среда и субботам\n\nпринимают доки в бумажном виде!\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «КРАТОС» ООО ЭДО напр.договор в нов.редакции	199225, город Санкт-Петербург, ул Челюскина, д. 6 стр. 1, помещ. 63Н	7801720290	780101001	1237800005915	СЕВЕРО-ЗАПАДНЫЙ БАНК ПАО СБЕРБАНК	044030653	40702810355000049462	30101810500000000653	\N	stomatologia.estethica@yandex.ru	в лице Генерального директора	f	\N	f	\N	f	\N	\N	\N	2026-04-06 19:50:55.853	\N
cmnnlv8xk00dstjog3g1u1lym	cltenantdefault0000000000	Эстетическая стоматология/ Ваш стоматолог	Московский пр., д.73 к. 5	t	911 174 43 46 \nОльга Владимировна\n\n+7 (812) 407-24-14\nМосковский пр. 73, к. 5\n\nРаботаем от юр. лица: ООО КЛИКЛаб\n\nE-mail для договора/прайса: olga@vashstomatolog.com	ООО «МФ Эстетическая стоматология» ООО ЭДО НАПР.ДОГОВОР В НОВ. РЕДАКЦИИ	196084, г. Санкт-Петербург,	7839083956	783901001	1177847150095	\N	044525411	40702810132360000148	30101810145250000411	\N	olga@vashstomatolog.com	генеральный директор и главный врач\nТрегубова Галина Ивановна	f	\N	t	2502-010        20.02.25	t	OOO	\N	\N	2026-04-06 19:50:55.736	\N
cmnnlv8y300dvtjogpzgc8zjk	cltenantdefault0000000000	Юлдент	Красносельское ш., д. 54, к. 6	f	Работаем от юр. лица: ООО КЛИКЛаб	ООО «Юлдент+»	188508, Ленинградская обл., Ломоносовский м.р-н,	4725010934	472501001	1214700005090	«Санкт-Петербург»	044030790	40702810990320004359	30101810900000000790	\N	kartyshkina00@mail.ru	\N	f	\N	f	\N	f	OOO	\N	\N	2026-04-06 19:50:55.755	\N
cmnnlv8y700dwtjogkr5wc6c8	cltenantdefault0000000000	Юниверс Смайл / Universe Smile	ул. Авиационная, д. 9	t	7 964 380-66-48\nСветлана\n\nЯковенко Михаил\nmack14@yandex.ru\nс этой почты пишет бухгалтер Татьяна\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Юниверс Смайл» ООО ЭДО	196066, г. Санкт-Петербург,	7810368290	781001001	1157847239098	\N	044030786	40702810632180008429	30101810600000000786	\N	cjkysirj_70@mail.ru	\N	f	\N	f	\N	t	OOO	\N	\N	2026-04-06 19:50:55.759	\N
cmnnlv8yp00dztjogjbgbuihx	cltenantdefault0000000000	Юнион / UnionGK Dental Clinic	ул. Комиссара Смирнова, д.15	t	7 995 997 9399 \n\n10-21\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Артстом» ООО сверка ЭДО	194044, г. Санкт-Петербург, муниципальный округ Сампсониевское вн.тер.г., ул. Комиссара Смирнова, д. 15, лит. В, ЭТАЖ 1, ПОМЕЩ. 1-Н.	7802883378	780201001	1207800122232	АО «Тинькофф Банк»	044525974	40702810810000707926	30101810145250000974	\N	Union.GK@yandex.ru	\N	t	\N	t	ДС №2 от 01.07.25 автопролонгация\n\nДС №1 от 09.01.25\n\n2405-001 от 01.06.24	t	OOO	\N	\N	2026-04-06 19:50:55.778	\N
cmnnlv8yt00e0tjogyy07asno	cltenantdefault0000000000	Якоб-Арт	г. Мурино,, ул. Шувалова, д. 11	t	+7 (812) 313-20-57,\n+7 (812) 317-75-23\n\nРаботаем от юр. лица: ООО КЛИКЛаб	ООО «Якоб-Арт» ООО-бум	188662, Ленинградская обл, Всеволожский	4703155936	470301001	1184704006717	ФИЛИАЛ "САНКТ-ПЕТЕРБУРГСКИЙ"	044030786	40702810532330003484	30101810600000000786	\N	jakob-art@yandex.ru	в лице Генерального директора  \nЯкобчука Даниила Александровича	f	\N	t	Доп.согл.№1 от 09.01.25 подписано\n\n\n2407-004 от 22.07.24	f	OOO	\N	\N	2026-04-06 19:50:55.781	\N
cmnnlv8yx00e1tjoghym4m4ni	cltenantdefault0000000000	Якоб-Дентик	г. Мурино, б-р Петровский, д. 5	t	Работаем от юр. лица: ООО КЛИКЛаб	ООО «ЯКОБ-ДЕНТИК» ООО-бум	188677, Ленинградская область,	4706054615	470601001	1224700021864	ФИЛИАЛ "САНКТ-ПЕТЕРБУРГСКИЙ"	044030786	40702810732230006077	30101810600000000786	\N	jacob-dentik@yandex.ru	Генеральный директор\nИ.Р. Якобчук	f	\N	t	Доп.согл.№1 от 09.01.25 подписано\n\n2407-003 от 22.07.24	f	OOO	\N	\N	2026-04-06 19:50:55.785	\N
cmnokktka001wtj50lymeqzxl	cltenantdefault0000000000	б-р Менделеева	д. 9, к. 1	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.819	\N
cmnokktvm002jtj50wxggv1lm	cltenantdefault0000000000	г. Калининград,	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.227	\N
cmnokkuda003atj50qzr3dmjv	cltenantdefault0000000000	г. Колпино,	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.863	\N
cmnokktk4001vtj50cn1y37g8	cltenantdefault0000000000	г. Мурино,	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.813	\N
cmnokkt720012tj505tqtz5tc	cltenantdefault0000000000	г. Ростов-на-Дону,	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.343	\N
cmnokkty8002ntj50liybft9a	cltenantdefault0000000000	г. Сочи	ул. Гайдара, д. 5/1	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.321	\N
cmnokkt860015tj5004w2hbqr	cltenantdefault0000000000	г.Москва	ул. Зоологическая, д.22	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.383	\N
cmnokkt61000ztj50xnu7v2zn	cltenantdefault0000000000	г.Пушкин	ул. Магазейная, д.47	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.306	\N
cmnokktpr002atj50oaj61bz1	cltenantdefault0000000000	д. Новое Девяткино,	ул. Арсенальная, д. 7	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.015	\N
cmnokktdf001etj50qmdw3o7k	cltenantdefault0000000000	наб. Черной речки	д. 51", "Хемеда	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.571	\N
cmnokku0d002qtj505px94sfj	cltenantdefault0000000000	п. Новоселье	ул. Невская, д.6	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.397	\N
cmnokktmo0021tj50j88fxkm6	cltenantdefault0000000000	п. Шушары,	Первомайская ул., д. 26	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.905	\N
cmnokktwe002mtj500v61s7rt	cltenantdefault0000000000	пр. Комсомольский	д. 28а	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.254	\N
cmnokkt8t0016tj50rgp52u5n	cltenantdefault0000000000	пр. Маршала Жукова	д. 54, к. 6	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.405	\N
cmnokktvs002ktj50x92k4j8i	cltenantdefault0000000000	пр. Московский	д. 155-159	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.232	\N
cmnokktp40028tj50q20aj5ks	cltenantdefault0000000000	пр. Народного Ополчения	д. 10", "Клиника Доброго Стоматолога	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.992	\N
cmnokktop0027tj50myyo21ml	cltenantdefault0000000000	пр. Народного Ополчения, д. 10	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.977	\N
cmnokku6z0031tj5071flm7bo	cltenantdefault0000000000	пр. Просвещения	д. 33 к. 2	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.635	\N
cmnokkttd002ftj50xlhf8t7e	cltenantdefault0000000000	пр. Старо-Петергофский	д. 42", "Зубной центр	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.145	\N
cmnokku3m002utj50vxd0c87t	cltenantdefault0000000000	пр. Энгельса	д. 132 к.1	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.515	\N
cmnokksov000ctj506f9rsxgq	cltenantdefault0000000000	пр. Юрия Гагарина, д. 37	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:34.687	\N
cmnokktbf001btj50w62f8p9u	cltenantdefault0000000000	ул. Авиационная	д. 9", "Импладент	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.499	\N
cmnokktjy001utj50lzilhsna	cltenantdefault0000000000	ул. Бадаева	д. 6, к. 1", "МедГарант Девяткино	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.806	\N
cmnokktv3002htj50l30dc4oz	cltenantdefault0000000000	ул. Блохина	д. 20/7	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.207	\N
cmnokkseq0000tj50ficay7su	cltenantdefault0000000000	ул. Большая Московская	д. 8/2	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:34.322	\N
cmnokktr7002dtj50n3dkym88	cltenantdefault0000000000	ул. Будапештская	д. 83/39", "Фактор Улыбки	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.067	\N
cmnokkttj002gtj50hxjy5la3	cltenantdefault0000000000	ул. Будапештская, д. 2	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.151	\N
cmnokktvg002itj50c97xu1xw	cltenantdefault0000000000	ул. В.Гакуна	д. 9", "Диомед	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.22	\N
cmnokku56002ytj50znc4z4sm	cltenantdefault0000000000	ул. Восстания, д. 47	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.57	\N
cmnokku7j0032tj500kbhkyjg	cltenantdefault0000000000	ул. Гаккелевская	д. 22 к.1	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.655	\N
cmnokku610030tj50t8pp63hi	cltenantdefault0000000000	ул. Заозерная д. 3, к.2	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.602	\N
cmnokktjq001ttj5077i27syi	cltenantdefault0000000000	ул. Киевская	д. 3", "МедГарант Невский	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.799	\N
cmnokktpc0029tj50lki20h8p	cltenantdefault0000000000	ул. Коллонтай	д. 31, к. 2а	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36	\N
cmnokku8d0035tj50cna6hd1u	cltenantdefault0000000000	ул. Комиссара Смирнова	д. 5/2	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:36.685	\N
cmnokktis001qtj50sj6gwera	cltenantdefault0000000000	ул. Крузенштерна	д. 10, к. 1	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	\N	\N	\N	2026-04-07 12:02:35.765	\N
\.


--
-- Data for Name: ClinicPriceOverride; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ClinicPriceOverride" ("clinicId", "priceListItemId", "priceRub", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ClinicReconciliationSnapshot; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ClinicReconciliationSnapshot" (id, "clinicId", slot, "periodFromStr", "periodToStr", "periodLabelRu", "legalEntityLabel", "xlsxBytes", "createdAt", "dismissedAt") FROM stdin;
\.


--
-- Data for Name: ConstructionType; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ConstructionType" (id, name, code, "isArchWork") FROM stdin;
seed-type-crown	Коронка (полная анатомия)	CROWN_FULL	f
seed-type-splint	Сплинт	SPLINT	t
seed-type-overlay	Накладка	OVERLAY	f
seed-type-veneer	Винир	VENEER	f
\.


--
-- Data for Name: ContractorRevision; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ContractorRevision" (id, "createdAt", "actorLabel", "actorUserId", kind, "clinicId", "doctorId", summary, details) FROM stdin;
cmnrnmnm10001tj7wz3d8fxcr	2026-04-09 15:51:18.793	Иванов И.И.	\N	UPDATE	cmnnlv6l7000btjogxzxfdw1w	\N	К клинике привязан врач «Кобзева Светлана Алексеевна»	\N
cmnrvmi700001tj08372d15ac	2026-04-09 19:35:08.7	Иванов И.И.	\N	UPDATE	cmnnlv8x400dqtjog5ph0d1b1	\N	Клиника «Эсте»: название, адрес, активность, заметки	{"mode": "update", "changes": [{"after": "8(812) 570-50-05, \\n8(921)936-30-36", "label": "заметки", "before": "8(812) 570-50-05, \\n8(921)936-30-36\\n\\nРаботаем от юр. лица: ООО КЛИКЛаб"}], "version": 1, "headline": "Клиника «Эсте»"}
cmnrwkuuz0003tj08bag96iu0	2026-04-09 20:01:51.419	Иванов И.И.	\N	UPDATE	\N	cmnnoygs80094tjxwn4t8mm8h	Врач привязан к клинике «Юнион / UnionGK Dental Clinic»	\N
cmnrwl34x0005tj08lhf4v0gy	2026-04-09 20:02:02.146	Иванов И.И.	\N	UPDATE	\N	cmnnoygs80094tjxwn4t8mm8h	Врач привязан к клинике «Вайт Вейв / White Wave»	\N
cmnrwl8530007tj08j1vzo6dg	2026-04-09 20:02:08.631	Иванов И.И.	\N	UPDATE	\N	cmnnoygs80094tjxwn4t8mm8h	Врач привязан к клинике «Мезон»	\N
cmnrwomd00009tj08z7d0zpvw	2026-04-09 20:04:47.028	Иванов И.И.	\N	UPDATE	\N	cmnnoyfz3006ntjxwbhjpo2ha	Врач привязан к клинике «Atribeaute Clinique»	\N
cmnrwoqwf000btj08s6uuencp	2026-04-09 20:04:52.911	Иванов И.И.	\N	UPDATE	\N	cmnnoyfz3006ntjxwbhjpo2ha	Врач привязан к клинике «Атрибьют Клиник»	\N
cmnrwr4c6000dtj08c28iitf4	2026-04-09 20:06:43.638	Иванов И.И.	\N	UPDATE	\N	cmnnoyegi0001tjxwlnb75v4h	Врач привязан к клинике «32 Практика»	\N
cmnrwrdsc000ftj08hhxrd3tu	2026-04-09 20:06:55.885	Иванов И.И.	\N	UPDATE	cmnnlv6im0000tjogesc6vytl	\N	Отвязан врач «Абдулабеков Гасан Абакарович» от клиники (связь в старых нарядах сохраняется)	\N
cmnrwrmce000htj08tihzdnjz	2026-04-09 20:07:06.975	Иванов И.И.	\N	UPDATE	\N	cmnnoyegi0001tjxwlnb75v4h	Врач привязан к клинике «32 Практика»	\N
cmnrws34p000jtj08yi3tcuqt	2026-04-09 20:07:28.729	Иванов И.И.	\N	UPDATE	cmnnlv6im0000tjogesc6vytl	\N	Отвязан врач «Абдулабеков Гасан Абакарович» от клиники (связь в старых нарядах сохраняется)	\N
cmnz8rm1a000dtjgs8wna4lxv	2026-04-14 23:17:25.198	Иванов И.И.	\N	CREATE	cmnz8rm0k000atjgsxhsfe1dg	\N	Созданы клиника «ТЕСТ» и врач «ТЕСТОВ»	\N
cmnz8rnzp000htjgsbotoeoev	2026-04-14 23:17:27.733	Иванов И.И.	\N	CREATE	cmnz8rnz9000etjgsibca7uge	\N	Созданы клиника «ТЕСТ» и врач «ТЕСТОВ»	\N
cmo1ole7f0001tj3cfb3e5skh	2026-04-16 16:16:01.323	Иванов И.И.	\N	UPDATE	cmnnlv6t8001mtjogkr06heje	\N	Клиника «Асгард»: периодичность сверки, сверка, договор, номер договора, ЭДО, юрлицо (ИП/ООО)	{"mode": "update", "changes": [{"after": "1 раз в месяц", "label": "периодичность сверки", "before": null}], "version": 1, "headline": "Клиника «Асгард»"}
cmo1omek00003tj3cwll4kpfz	2026-04-16 16:16:48.433	Иванов И.И.	\N	UPDATE	cmnnlv6t8001mtjogkr06heje	\N	Клиника «Асгард»: название, адрес, юр. наименование, юр. адрес, ИНН, КПП, ОГРН, банк, БИК, р/с, к/с, телефон, e-mail, руководитель	{"mode": "update", "changes": [{"after": "ООО «Асгард Мед»", "label": "юр. наименование", "before": "ООО «Асгард Мед» ООО сверка ЭДО"}], "version": 1, "headline": "Клиника «Асгард»"}
cmo4qbkmq0001tjpg58jg2me1	2026-04-18 19:27:40.85	Иванов И.И.	\N	UPDATE	cmnokksp6000dtj50od7c0e07	\N	Клиника «31 поликлиника»: периодичность сверки, сверка, договор, номер договора, ЭДО, юрлицо (ИП/ООО)	{"mode": "update", "changes": [{"after": "1 раз в месяц", "label": "периодичность сверки", "before": null}, {"after": "да", "label": "сверка", "before": "нет"}], "version": 1, "headline": "Клиника «31 поликлиника»"}
\.


--
-- Data for Name: CostingClientProfile; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CostingClientProfile" (id, "versionId", "clinicId", name, "listDiscountPercent", note, "createdAt", "updatedAt") FROM stdin;
cmoj7lxl1006etjxwzhjpl4rr	cmoj7lx710000tjxwa4mwax9z	\N	Прайс без скидки	0	Создайте копию под клинику и укажите % скидки от номинала.	2026-04-28 22:40:24.134	2026-04-28 22:40:24.134
\.


--
-- Data for Name: CostingColumn; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CostingColumn" (id, "versionId", key, label, kind, formula, "sortOrder", hint) FROM stdin;
cmoj7lx7f0001tjxwm9w6qdee	cmoj7lx710000tjxwa4mwax9z	profile_discount_pct	Скидка от номинала прайса, %	INPUT	\N	5	В калькуляторе подставляется из профиля клиента (0 = без скидки).
cmoj7lx7f0002tjxwb5hwbizn	cmoj7lx710000tjxwa4mwax9z	client_price	Цена клиенту (с НДС, браком и развитием)	INPUT	\N	10	То, что видит клиент; обычно = priceRub из прайса.
cmoj7lx7f0003tjxw0gz5kktm	cmoj7lx710000tjxwa4mwax9z	stoimost_baza	Стоимость без надбавок (база)	INPUT	\N	20	Цена без НДС/брака/развития — пока ввод вручную; позже можно заменить на формулу.
cmoj7lx7f0004tjxwae9rlowu	cmoj7lx710000tjxwa4mwax9z	analogi_shtifty	Аналоги / штифты / фрезы	INPUT	\N	30	\N
cmoj7lx7f0005tjxws4n2umv1	cmoj7lx710000tjxwa4mwax9z	postobrabotka	Постобработка, материалы, спирт, глазурь и т.д.	INPUT	\N	40	\N
cmoj7lx7f0006tjxw1131rrz7	cmoj7lx710000tjxwa4mwax9z	print_frez_drugoe	Принт / фрез другое	INPUT	\N	50	\N
cmoj7lx7f0007tjxwrq63nk4t	cmoj7lx710000tjxwa4mwax9z	gips_fot	Гипс / иной ФОТ	INPUT	\N	60	\N
cmoj7lx7f0008tjxwry1gg0ct	cmoj7lx710000tjxwa4mwax9z	print_frez_koronki	Принт / фрез коронки	INPUT	\N	70	\N
cmoj7lx7f0009tjxwro9iuvf2	cmoj7lx710000tjxwa4mwax9z	print_model	Принт модель	INPUT	\N	80	\N
cmoj7lx7f000atjxw2rpdm0yi	cmoj7lx710000tjxwa4mwax9z	vosk_shtift	Воск / штифт	INPUT	\N	90	\N
cmoj7lx7f000btjxwydfba4ri	cmoj7lx710000tjxwa4mwax9z	scan	Скан	INPUT	\N	100	\N
cmoj7lx7f000ctjxwepld7qks	cmoj7lx710000tjxwa4mwax9z	cad_fot_hirurgiya	CAD ФОТ хирургия	INPUT	\N	110	\N
cmoj7lx7f000dtjxwvezr4y3u	cmoj7lx710000tjxwa4mwax9z	cad_fot	CAD ФОТ	INPUT	\N	120	\N
cmoj7lx7f000etjxw2kr3rgrx	cmoj7lx710000tjxwa4mwax9z	prostetika	Протетика (основание, аналог)	INPUT	\N	130	\N
cmoj7lx7f000ftjxwvqnt91uy	cmoj7lx710000tjxwa4mwax9z	cam_fot	CAM ФОТ	INPUT	\N	140	\N
cmoj7lx7f000gtjxwkm8adlt2	cmoj7lx710000tjxwa4mwax9z	obrabotka	Обработка	INPUT	\N	150	\N
cmoj7lx7f000htjxwj79vi3gp	cmoj7lx710000tjxwa4mwax9z	manual_zt	Мануальный ЗТ	INPUT	\N	160	\N
cmoj7lx7f000itjxwa3bps1qv	cmoj7lx710000tjxwa4mwax9z	zapchasti	Запчасти	INPUT	\N	170	\N
cmoj7lx7f000jtjxw1ggio6io	cmoj7lx710000tjxwa4mwax9z	materialy_emal	Материалы (цемент, масса, краски)	INPUT	\N	180	\N
cmoj7lx7f000ktjxw1jjxsng9	cmoj7lx710000tjxwa4mwax9z	upakovka	Упаковка	INPUT	\N	190	\N
cmoj7lx7f000ltjxwftpg8hua	cmoj7lx710000tjxwa4mwax9z	sum_zatrat	Сумма затрат (оценка)	COMPUTED	sum(analogi_shtifty, postobrabotka, print_frez_drugoe, gips_fot, print_frez_koronki, print_model, vosk_shtift, scan, cad_fot_hirurgiya, cad_fot, prostetika, cam_fot, obrabotka, manual_zt, zapchasti, materialy_emal, upakovka)	200	Пока сумма статей — подгоните формулу под ваш «Итого ФОТ».
cmoj7lx7f000mtjxwxitya264	cmoj7lx710000tjxwa4mwax9z	marzha_rub	Маржа к цене клиенту, ₽	COMPUTED	client_price - sum_zatrat	210	client_price − сумма затрат.
cmoj7lx7f000ntjxww1mkwuka	cmoj7lx710000tjxwa4mwax9z	marzha_pct	Маржа, % от цены клиенту	COMPUTED	marzha_rub / max(client_price, 1) * 100	220	\N
cmoj7lx7f000otjxwppr86cnj	cmoj7lx710000tjxwa4mwax9z	nacenki_rub	Надбавки (НДС+брак+развитие), ₽ оценка	COMPUTED	client_price - stoimost_baza	230	Разница между ценой клиенту и базой без надбавок.
cmoj7lx7f000ptjxwkgfz17tr	cmoj7lx710000tjxwa4mwax9z	effective_client_price	Цена с учётом скидки профиля, ₽	COMPUTED	client_price * (1 - profile_discount_pct / 100)	240	client_price × (1 − скидка%).
cmoj7lx7f000qtjxwdqmreb0w	cmoj7lx710000tjxwa4mwax9z	marzha_posle_skidki	Маржа после скидки профиля, ₽	COMPUTED	effective_client_price - sum_zatrat	250	effective_client_price − sum_zatrat
\.


--
-- Data for Name: CostingFixedCostItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CostingFixedCostItem" (id, "versionId", label, "amountRub", "sortOrder", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: CostingLine; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CostingLine" (id, "versionId", "priceListItemId", "inputsJson", note, "createdAt", "updatedAt") FROM stdin;
cmoj7lx7m000stjxwnkjlbk9u	cmoj7lx710000tjxwa4mwax9z	cmnrmuddk0001tjawrafmj84s	{"scan": 0, "cad_fot": 1500, "cam_fot": 300, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 550, "zapchasti": 0, "prostetika": 0, "print_model": 600, "vosk_shtift": 0, "client_price": 16000, "postobrabotka": 100, "stoimost_baza": 14500, "materialy_emal": 300, "analogi_shtifty": 100, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 1000, "print_frez_koronki": 0, "profile_discount_pct": 0}	Сплинт Простой/мышечный депрограмматор (Койса)	2026-04-28 22:40:23.65	2026-04-28 22:41:08.492
cmoj7lx7q000utjxw9p4fftzb	cmoj7lx710000tjxwa4mwax9z	cmoj65kw00003tjvg9lhhionc	{"scan": 0, "cad_fot": 3000, "cam_fot": 300, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 550, "zapchasti": 0, "prostetika": 0, "print_model": 600, "vosk_shtift": 0, "client_price": 19000, "postobrabotka": 100, "stoimost_baza": 17000, "materialy_emal": 300, "analogi_shtifty": 100, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 1000, "print_frez_koronki": 0, "profile_discount_pct": 0}	Сплинт сложный	2026-04-28 22:40:23.654	2026-04-28 22:41:08.496
cmoj7lx7u000wtjxwttdqqx9o	cmoj7lx710000tjxwa4mwax9z	cmoj65kw40005tjvglizpfne1	{"scan": 0, "cad_fot": 2000, "cam_fot": 300, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 800, "zapchasti": 0, "prostetika": 0, "print_model": 600, "vosk_shtift": 0, "client_price": 33000, "postobrabotka": 100, "stoimost_baza": 30000, "materialy_emal": 300, "analogi_shtifty": 100, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 2000, "print_frez_koronki": 0, "profile_discount_pct": 0}	Аппарат для лечения храпа	2026-04-28 22:40:23.659	2026-04-28 22:41:08.499
cmoj7lx7z000ytjxwvh2k2r69	cmoj7lx710000tjxwa4mwax9z	cmnrmuddy0004tjawlm5pn02s	{"scan": 0, "cad_fot": 4900, "cam_fot": 600, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 1250, "zapchasti": 0, "prostetika": 0, "print_model": 600, "vosk_shtift": 0, "client_price": 19000, "postobrabotka": 100, "stoimost_baza": 17000, "materialy_emal": 300, "analogi_shtifty": 100, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 1200, "profile_discount_pct": 0}	Ортодонтические накладки композитные Сложные.  Пакетное предложение	2026-04-28 22:40:23.663	2026-04-28 22:41:08.503
cmoj7lx830010tjxwoyjz370e	cmoj7lx710000tjxwa4mwax9z	cmoj65kwc0009tjvgbpt9isgh	{"scan": 0, "cad_fot": 850, "cam_fot": 100, "gips_fot": 0, "upakovka": 0, "manual_zt": 0, "obrabotka": 300, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 3000, "postobrabotka": 100, "stoimost_baza": 2500, "materialy_emal": 300, "analogi_shtifty": 100, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 300, "profile_discount_pct": 0}	Накладка композитная дополнительная для пакетного предложения	2026-04-28 22:40:23.668	2026-04-28 22:41:08.508
cmoj7lx870012tjxwhgzei5yr	cmoj7lx710000tjxwa4mwax9z	cmnrmuddt0003tjawt6aje9w4	{"scan": 0, "cad_fot": 850, "cam_fot": 100, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 300, "zapchasti": 0, "prostetika": 0, "print_model": 600, "vosk_shtift": 0, "client_price": 5500, "postobrabotka": 100, "stoimost_baza": 5000, "materialy_emal": 300, "analogi_shtifty": 100, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 300, "profile_discount_pct": 0}	Накладка композитная	2026-04-28 22:40:23.672	2026-04-28 22:41:08.513
cmoj7lx8c0014tjxwo1vxskfg	cmoj7lx710000tjxwa4mwax9z	cmnrmude20005tjawhanxqcd2	{"scan": 0, "cad_fot": 1500, "cam_fot": 0, "gips_fot": 0, "upakovka": 0, "manual_zt": 0, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 5500, "postobrabotka": 0, "stoimost_baza": 5000, "materialy_emal": 0, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Цифровой Вариатор	2026-04-28 22:40:23.677	2026-04-28 22:41:08.518
cmoj7lx8h0016tjxwf6695lhb	cmoj7lx710000tjxwa4mwax9z	cmnrmude50006tjaw00fnzaxg	{"scan": 0, "cad_fot": 3000, "cam_fot": 0, "gips_fot": 0, "upakovka": 0, "manual_zt": 0, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 12500, "postobrabotka": 0, "stoimost_baza": 11000, "materialy_emal": 0, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Сплинт полный протокол	2026-04-28 22:40:23.681	2026-04-28 22:41:08.524
cmoj7lx8l0018tjxwrqr0f1qf	cmoj7lx710000tjxwa4mwax9z	cmnrmude80007tjawztoku1hi	{"scan": 0, "cad_fot": 1500, "cam_fot": 0, "gips_fot": 0, "upakovka": 0, "manual_zt": 0, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 8000, "postobrabotka": 0, "stoimost_baza": 7000, "materialy_emal": 0, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Сплинт простой/мышечный депрограмматор (Койса)	2026-04-28 22:40:23.685	2026-04-28 22:41:08.529
cmoj7lx8q001atjxwicc4w7f8	cmoj7lx710000tjxwa4mwax9z	cmnrmudec0008tjawe7hjgr8n	{"scan": 0, "cad_fot": 25000, "cam_fot": 0, "gips_fot": 0, "upakovka": 0, "manual_zt": 0, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 67000, "postobrabotka": 0, "stoimost_baza": 61000, "materialy_emal": 0, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Комплексная(тотальная) моделировка	2026-04-28 22:40:23.69	2026-04-28 22:41:08.533
cmoj7lx8u001ctjxw69r03an9	cmoj7lx710000tjxwa4mwax9z	cmnrmudef0009tjawmvicnnsb	{"scan": 0, "cad_fot": 10000, "cam_fot": 0, "gips_fot": 0, "upakovka": 0, "manual_zt": 0, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 22000, "postobrabotka": 0, "stoimost_baza": 20000, "materialy_emal": 0, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Адаптация тотальной моделировки к рабочим сканам.	2026-04-28 22:40:23.695	2026-04-28 22:41:08.538
cmoj7lx8z001etjxw456u2m8q	cmoj7lx710000tjxwa4mwax9z	cmnrmudei000atjaw7au41xbx	{"scan": 0, "cad_fot": 4000, "cam_fot": 0, "gips_fot": 0, "upakovka": 0, "manual_zt": 0, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 17500, "postobrabotka": 0, "stoimost_baza": 16000, "materialy_emal": 0, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Диагностика по КЛКТ для ортопедического/ортодонтического лечения	2026-04-28 22:40:23.7	2026-04-28 22:41:08.543
cmoj7lx94001gtjxwjih1qttw	cmoj7lx710000tjxwa4mwax9z	cmnrmudel000btjaw00mmf7mp	{"scan": 0, "cad_fot": 850, "cam_fot": 0, "gips_fot": 0, "upakovka": 0, "manual_zt": 0, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 3000, "postobrabotka": 0, "stoimost_baza": 2500, "materialy_emal": 0, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Единица цифрового моделирования	2026-04-28 22:40:23.704	2026-04-28 22:41:08.547
cmoj7lx99001itjxwqcpz5bdq	cmoj7lx710000tjxwa4mwax9z	cmnrmudeo000ctjaw4d09mtdi	{"scan": 0, "cad_fot": 45000, "cam_fot": 0, "gips_fot": 0, "upakovka": 0, "manual_zt": 0, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 110000, "postobrabotka": 0, "stoimost_baza": 100500, "materialy_emal": 0, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Планирование тотальной реабилитации Всеволодом Соколовым	2026-04-28 22:40:23.709	2026-04-28 22:41:08.551
cmoj7lx9c001ktjxwgwofkuq2	cmoj7lx710000tjxwa4mwax9z	cmnrmuder000dtjawer7rpmwg	{"scan": 0, "cad_fot": 500, "cam_fot": 0, "gips_fot": 0, "upakovka": 0, "manual_zt": 0, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 3500, "postobrabotka": 0, "stoimost_baza": 3000, "materialy_emal": 0, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Просмотр исследованиия МРТ	2026-04-28 22:40:23.713	2026-04-28 22:41:08.565
cmoj7lx9h001mtjxwilqzuvgr	cmoj7lx710000tjxwa4mwax9z	cmnrmudex000ftjawr1i9tg67	{"scan": 0, "cad_fot": 850, "cam_fot": 100, "gips_fot": 0, "upakovka": 250, "manual_zt": 350, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 600, "vosk_shtift": 0, "client_price": 5500, "postobrabotka": 50, "stoimost_baza": 5000, "materialy_emal": 300, "analogi_shtifty": 100, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 300, "profile_discount_pct": 0}	Временная коронка композитная	2026-04-28 22:40:23.717	2026-04-28 22:41:08.569
cmoj7lx9l001otjxwy73gffk1	cmoj7lx710000tjxwa4mwax9z	cmnrmudf0000gtjawxjs526cr	{"scan": 0, "cad_fot": 850, "cam_fot": 100, "gips_fot": 0, "upakovka": 250, "manual_zt": 450, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 600, "vosk_shtift": 0, "client_price": 6500, "postobrabotka": 50, "stoimost_baza": 5500, "materialy_emal": 300, "analogi_shtifty": 100, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 300, "profile_discount_pct": 0}	Временная коронка композитная на винтовой фиксации*	2026-04-28 22:40:23.721	2026-04-28 22:41:08.573
cmoj7lx9q001qtjxw3gi2aeis	cmoj7lx710000tjxwa4mwax9z	cmnrmudf4000htjawmpxwsuha	{"scan": 0, "cad_fot": 850, "cam_fot": 100, "gips_fot": 0, "upakovka": 250, "manual_zt": 350, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 600, "vosk_shtift": 0, "client_price": 5000, "postobrabotka": 50, "stoimost_baza": 4500, "materialy_emal": 300, "analogi_shtifty": 100, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 250, "profile_discount_pct": 0}	Временная коронка принт/фрез*	2026-04-28 22:40:23.727	2026-04-28 22:41:08.577
cmoj7lx9v001stjxwc4lye9vf	cmoj7lx710000tjxwa4mwax9z	cmnrmudf7000itjawwdh67ji4	{"scan": 0, "cad_fot": 850, "cam_fot": 100, "gips_fot": 0, "upakovka": 250, "manual_zt": 450, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 600, "vosk_shtift": 0, "client_price": 5500, "postobrabotka": 50, "stoimost_baza": 5000, "materialy_emal": 300, "analogi_shtifty": 100, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 250, "profile_discount_pct": 0}	Временная коронка принт/фрез на винтовой фиксации*	2026-04-28 22:40:23.732	2026-04-28 22:41:08.581
cmoj7lxa1001utjxwevcsw8o2	cmoj7lx710000tjxwa4mwax9z	cmnrmudfb000jtjawzwdgsy0g	{"scan": 0, "cad_fot": 0, "cam_fot": 0, "gips_fot": 0, "upakovka": 0, "manual_zt": 1000, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 5500, "postobrabotka": 0, "stoimost_baza": 5000, "materialy_emal": 300, "analogi_shtifty": 100, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Индивидуализация десны на PMMA сегмент	2026-04-28 22:40:23.737	2026-04-28 22:41:08.583
cmoj7lxa5001wtjxw046pgh0y	cmoj7lx710000tjxwa4mwax9z	cmnrmudfe000ktjawn94adq8a	{"scan": 0, "cad_fot": 0, "cam_fot": 0, "gips_fot": 0, "upakovka": 0, "manual_zt": 1800, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 9000, "postobrabotka": 0, "stoimost_baza": 8000, "materialy_emal": 300, "analogi_shtifty": 100, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Индивидуализация десны на PMMA 1 челюсть	2026-04-28 22:40:23.741	2026-04-28 22:41:08.588
cmoj7lxaa001ytjxwyisj2m29	cmoj7lx710000tjxwa4mwax9z	cmoj65kya0019tjvg9upfeisx	{"scan": 0, "cad_fot": 850, "cam_fot": 400, "gips_fot": 500, "upakovka": 250, "manual_zt": 2500, "obrabotka": 500, "zapchasti": 0, "prostetika": 0, "print_model": 600, "vosk_shtift": 0, "client_price": 13500, "postobrabotka": 0, "stoimost_baza": 12000, "materialy_emal": 250, "analogi_shtifty": 200, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 1000, "profile_discount_pct": 0}	Коронка/Винир/Вкладка Emax	2026-04-28 22:40:23.747	2026-04-28 22:41:08.591
cmoj7lxae0020tjxwbfpr7emu	cmoj7lx710000tjxwa4mwax9z	cmoj65kyf001btjvgt1f2p58s	{"scan": 0, "cad_fot": 850, "cam_fot": 300, "gips_fot": 0, "upakovka": 250, "manual_zt": 2500, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 600, "vosk_shtift": 0, "client_price": 13500, "postobrabotka": 0, "stoimost_baza": 12000, "materialy_emal": 250, "analogi_shtifty": 200, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 2000, "profile_discount_pct": 0}	Коронка ДЦ	2026-04-28 22:40:23.751	2026-04-28 22:41:08.6
cmoj7lxai0022tjxwxv998uxa	cmoj7lx710000tjxwa4mwax9z	cmnrmudfz000rtjawq6uzvvzd	{"scan": 0, "cad_fot": 13000, "cam_fot": 450, "gips_fot": 0, "upakovka": 250, "manual_zt": 45500, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 1000, "vosk_shtift": 0, "client_price": 147000, "postobrabotka": 0, "stoimost_baza": 134500, "materialy_emal": 1000, "analogi_shtifty": 400, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 28000, "profile_discount_pct": 0}	Протез из ДЦ  на винтовой фиксации	2026-04-28 22:40:23.755	2026-04-28 22:41:08.613
cmoj7lxan0024tjxwysvxd9nv	cmoj7lx710000tjxwa4mwax9z	cmnrmudg5000ttjawze71uxc9	{"scan": 150, "cad_fot": 14500, "cam_fot": 450, "gips_fot": 0, "upakovka": 250, "manual_zt": 45500, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 1000, "vosk_shtift": 0, "client_price": 169000, "postobrabotka": 0, "stoimost_baza": 154500, "materialy_emal": 1000, "analogi_shtifty": 400, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 10000, "print_frez_koronki": 28000, "profile_discount_pct": 0}	Протез из ДЦ на балке	2026-04-28 22:40:23.76	2026-04-28 22:41:08.617
cmoj7lxar0026tjxwv1fsqgcl	cmoj7lx710000tjxwa4mwax9z	cmoj65kyz001ntjvgihaf1kbd	{"scan": 0, "cad_fot": 7500, "cam_fot": 450, "gips_fot": 0, "upakovka": 250, "manual_zt": 10000, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 600, "vosk_shtift": 0, "client_price": 80000, "postobrabotka": 0, "stoimost_baza": 73000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 1000, "print_frez_koronki": 0, "profile_discount_pct": 0}	Акриловый протез с армированием.	2026-04-28 22:40:23.764	2026-04-28 22:41:08.62
cmoj7lxav0028tjxwfjaxm6z4	cmoj7lx710000tjxwa4mwax9z	cmoj65kz4001ptjvg7mlyzj77	{"scan": 0, "cad_fot": 200, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 700, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 250, "vosk_shtift": 300, "client_price": 4500, "postobrabotka": 0, "stoimost_baza": 4000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Прикусной шаблон	2026-04-28 22:40:23.768	2026-04-28 22:41:08.624
cmoj7lxb0002atjxwwgbnirm5	cmoj7lx710000tjxwa4mwax9z	cmnrmudfr000otjaw34bm8oe4	{"scan": 0, "cad_fot": 450, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 600, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 250, "vosk_shtift": 300, "client_price": 10000, "postobrabotka": 0, "stoimost_baza": 9000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Абатмент Ti индивидуальный	2026-04-28 22:40:23.773	2026-04-28 22:41:08.628
cmoj7lxb5002ctjxw12axavvd	cmoj7lx710000tjxwa4mwax9z	cmnrmudft000ptjawai7f0g74	{"scan": 0, "cad_fot": 450, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 700, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 250, "vosk_shtift": 300, "client_price": 9000, "postobrabotka": 0, "stoimost_baza": 8000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Абатмент ДЦ индивидуальный	2026-04-28 22:40:23.777	2026-04-28 22:41:08.631
cmoj7lxb9002etjxwaqlguy6l	cmoj7lx710000tjxwa4mwax9z	cmnrmudg8000utjaw7rc2808j	{"scan": 0, "cad_fot": 100, "cam_fot": 50, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 50, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 1000, "postobrabotka": 0, "stoimost_baza": 500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 25, "print_frez_koronki": 0, "profile_discount_pct": 0}	Колпачок для доработки	2026-04-28 22:40:23.782	2026-04-28 22:41:08.635
cmoj7lxbd002gtjxwrvacf0iw	cmoj7lx710000tjxwa4mwax9z	cmnrmudgb000vtjawk1lvxluy	{"scan": 0, "cad_fot": 200, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 400, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 300, "vosk_shtift": 0, "client_price": 4000, "postobrabotka": 0, "stoimost_baza": 3500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Силиконовый ключ с 1 печатной моделью	2026-04-28 22:40:23.785	2026-04-28 22:41:08.64
cmoj7lxbh002itjxwrqenkwcg	cmoj7lx710000tjxwa4mwax9z	cmnrmudgd000wtjawyibsingm	{"scan": 0, "cad_fot": 650, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 350, "zapchasti": 0, "prostetika": 0, "print_model": 600, "vosk_shtift": 0, "client_price": 7000, "postobrabotka": 0, "stoimost_baza": 6000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Рентген-контрастный шаблон	2026-04-28 22:40:23.789	2026-04-28 22:41:08.644
cmoj7lxbl002ktjxwc8wk8fvl	cmoj7lx710000tjxwa4mwax9z	cmnrmudgg000xtjawxlaefaqq	{"scan": 0, "cad_fot": 800, "cam_fot": 300, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 450, "zapchasti": 0, "prostetika": 0, "print_model": 600, "vosk_shtift": 0, "client_price": 7500, "postobrabotka": 0, "stoimost_baza": 6500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 150, "print_frez_koronki": 0, "profile_discount_pct": 0}	Шаблон для пластики слизистой	2026-04-28 22:40:23.794	2026-04-28 22:41:08.648
cmoj7lxbp002mtjxweb61k41k	cmoj7lx710000tjxwa4mwax9z	cmnrmudgj000ytjawu9kaz6nc	{"scan": 0, "cad_fot": 750, "cam_fot": 300, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 350, "zapchasti": 0, "prostetika": 0, "print_model": 600, "vosk_shtift": 0, "client_price": 7500, "postobrabotka": 0, "stoimost_baza": 6500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 150, "print_frez_koronki": 0, "profile_discount_pct": 0}	Печатный регистрат прикуса	2026-04-28 22:40:23.798	2026-04-28 22:41:08.651
cmoj7lxbu002otjxwtx2go1vx	cmoj7lx710000tjxwa4mwax9z	cmnrmudgm000ztjawp01u13k5	{"scan": 0, "cad_fot": 200, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 800, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 150, "vosk_shtift": 0, "client_price": 6500, "postobrabotka": 0, "stoimost_baza": 5500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Каппа для композитного протокола	2026-04-28 22:40:23.803	2026-04-28 22:41:08.655
cmoj7lxbz002qtjxwe8a53w00	cmoj7lx710000tjxwa4mwax9z	cmnrmudgo0010tjawompo9aly	{"scan": 0, "cad_fot": 0, "cam_fot": 0, "gips_fot": 100, "upakovka": 250, "manual_zt": 0, "obrabotka": 100, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 2000, "postobrabotka": 0, "stoimost_baza": 1500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Модель гипсовая неразборная/диагностическая	2026-04-28 22:40:23.807	2026-04-28 22:41:08.658
cmoj7lxc3002stjxw2zqh6ifm	cmoj7lx710000tjxwa4mwax9z	cmnrmudgr0011tjawakvxqfod	{"scan": 0, "cad_fot": 0, "cam_fot": 0, "gips_fot": 100, "upakovka": 250, "manual_zt": 300, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 100, "vosk_shtift": 0, "client_price": 2000, "postobrabotka": 0, "stoimost_baza": 1500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Трансфер-чек (за 1 опору)	2026-04-28 22:40:23.812	2026-04-28 22:41:08.662
cmoj7lxc8002utjxwukko2gxh	cmoj7lx710000tjxwa4mwax9z	cmnrmudgu0012tjawygbzkgl9	{"scan": 0, "cad_fot": 200, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 500, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 200, "vosk_shtift": 0, "client_price": 3500, "postobrabotka": 0, "stoimost_baza": 3000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Индивидуальная ложка аналоговая/принтованная	2026-04-28 22:40:23.816	2026-04-28 22:41:08.666
cmoj7lxcd002wtjxwrtpmqkep	cmoj7lx710000tjxwa4mwax9z	cmnrmudgx0013tjawd5lxovo3	{"scan": 0, "cad_fot": 450, "cam_fot": 50, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 100, "zapchasti": 0, "prostetika": 0, "print_model": 100, "vosk_shtift": 0, "client_price": 1500, "postobrabotka": 0, "stoimost_baza": 1000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Шаблон для аутотрансплантации	2026-04-28 22:40:23.821	2026-04-28 22:41:08.669
cmoj7lxci002ytjxwmr5pa6ta	cmoj7lx710000tjxwa4mwax9z	cmoj65l0c002ftjvgx04nr0s6	{"scan": 0, "cad_fot": 0, "cam_fot": 0, "gips_fot": 0, "upakovka": 0, "manual_zt": 0, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 500, "postobrabotka": 0, "stoimost_baza": 0, "materialy_emal": 0, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Доставка	2026-04-28 22:40:23.827	2026-04-28 22:41:08.673
cmoj7lxcn0030tjxwlk0blyye	cmoj7lx710000tjxwa4mwax9z	cmnrmudh00014tjaw1ts283ij	{"scan": 0, "cad_fot": 0, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 4000, "postobrabotka": 0, "stoimost_baza": 3500, "materialy_emal": 0, "analogi_shtifty": 150, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 1000, "print_frez_koronki": 0, "profile_discount_pct": 0}	Сплинт	2026-04-28 22:40:23.832	2026-04-28 22:41:08.676
cmoj7lxct0032tjxw6emny16c	cmoj7lx710000tjxwa4mwax9z	cmnrmudh30015tjaw643moeaz	{"scan": 0, "cad_fot": 0, "cam_fot": 300, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 500, "zapchasti": 0, "prostetika": 0, "print_model": 300, "vosk_shtift": 0, "client_price": 6500, "postobrabotka": 0, "stoimost_baza": 5500, "materialy_emal": 300, "analogi_shtifty": 150, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 1000, "print_frez_koronki": 0, "profile_discount_pct": 0}	Сплинт  с обработкой	2026-04-28 22:40:23.837	2026-04-28 22:41:08.679
cmoj7lxcy0034tjxwafabs5m3	cmoj7lx710000tjxwa4mwax9z	cmnrmudh50016tjawycbtiewg	{"scan": 0, "cad_fot": 200, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 300, "vosk_shtift": 0, "client_price": 2500, "postobrabotka": 0, "stoimost_baza": 2000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Модель неразборная/диагностическая	2026-04-28 22:40:23.842	2026-04-28 22:41:08.682
cmoj7lxd20036tjxw4grq7t42	cmoj7lx710000tjxwa4mwax9z	cmoj65l0s002ntjvghw57wi7w	{"scan": 0, "cad_fot": 0, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 300, "vosk_shtift": 0, "client_price": 1500, "postobrabotka": 0, "stoimost_baza": 1000, "materialy_emal": 0, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Накладка\\коронка композитная	2026-04-28 22:40:23.846	2026-04-28 22:41:08.684
cmoj7lxd70038tjxwd0wb4ezo	cmoj7lx710000tjxwa4mwax9z	cmnrmudh80017tjaw7pr56yzh	{"scan": 0, "cad_fot": 0, "cam_fot": 0, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 350, "zapchasti": 0, "prostetika": 0, "print_model": 350, "vosk_shtift": 0, "client_price": 8000, "postobrabotka": 100, "stoimost_baza": 7000, "materialy_emal": 100, "analogi_shtifty": 0, "cad_fot_hirurgiya": 2200, "print_frez_drugoe": 0, "print_frez_koronki": 100, "profile_discount_pct": 0}	Навигационный шаблон для несьемных аппаратов до 4  мини-винтов	2026-04-28 22:40:23.851	2026-04-28 22:41:08.849
cmoj7lxdc003atjxw1y2i1xvx	cmoj7lx710000tjxwa4mwax9z	cmnrmudhb0018tjawnp5oanhf	{"scan": 0, "cad_fot": 850, "cam_fot": 0, "gips_fot": 0, "upakovka": 0, "manual_zt": 0, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 2000, "postobrabotka": 0, "stoimost_baza": 1800, "materialy_emal": 0, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Моделирование под навигационную хирургию	2026-04-28 22:40:23.856	2026-04-28 22:41:08.726
cmoj7lxdh003ctjxwjixf1xj1	cmoj7lx710000tjxwa4mwax9z	cmnrmudhd0019tjawsnzona8h	{"scan": 0, "cad_fot": 0, "cam_fot": 300, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 400, "zapchasti": 0, "prostetika": 0, "print_model": 350, "vosk_shtift": 0, "client_price": 10000, "postobrabotka": 50, "stoimost_baza": 9000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 2200, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Планирование до 2х единиц с опорой на зубы	2026-04-28 22:40:23.862	2026-04-28 22:41:08.693
cmoj7lxdn003etjxw3rr5pzfu	cmoj7lx710000tjxwa4mwax9z	cmnrmudhg001atjaw8gbqeqy2	{"scan": 0, "cad_fot": 0, "cam_fot": 300, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 500, "zapchasti": 0, "prostetika": 0, "print_model": 350, "vosk_shtift": 0, "client_price": 12500, "postobrabotka": 50, "stoimost_baza": 11000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 3500, "print_frez_drugoe": 150, "print_frez_koronki": 0, "profile_discount_pct": 0}	Планирование от 3-х до 5-и единиц с опорой на зубы	2026-04-28 22:40:23.867	2026-04-28 22:41:08.698
cmoj7lxdr003gtjxw9taoaq8h	cmoj7lx710000tjxwa4mwax9z	cmnrmudhj001btjawzpf5l3dn	{"scan": 0, "cad_fot": 0, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 500, "zapchasti": 0, "prostetika": 0, "print_model": 800, "vosk_shtift": 0, "client_price": 18500, "postobrabotka": 50, "stoimost_baza": 16500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 6000, "print_frez_drugoe": 300, "print_frez_koronki": 0, "profile_discount_pct": 0}	Планирование навигации ALL ON X	2026-04-28 22:40:23.871	2026-04-28 22:41:08.701
cmoj7lxdx003itjxwwhlkzkvh	cmoj7lx710000tjxwa4mwax9z	cmnrmudhm001ctjawe6no6nlh	{"scan": 0, "cad_fot": 0, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 250, "zapchasti": 0, "prostetika": 0, "print_model": 100, "vosk_shtift": 0, "client_price": 7500, "postobrabotka": 50, "stoimost_baza": 6500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 800, "print_frez_drugoe": 150, "print_frez_koronki": 0, "profile_discount_pct": 0}	Дополнительный шаблон	2026-04-28 22:40:23.878	2026-04-28 22:41:08.706
cmoj7lxe3003ktjxwe2fsskae	cmoj7lx710000tjxwa4mwax9z	cmnrmudhp001dtjawhlqktsbu	{"scan": 0, "cad_fot": 10200, "cam_fot": 1800, "gips_fot": 0, "upakovka": 250, "manual_zt": 6000, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 300, "vosk_shtift": 0, "client_price": 44000, "postobrabotka": 50, "stoimost_baza": 40000, "materialy_emal": 300, "analogi_shtifty": 150, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 1200, "profile_discount_pct": 0}	Немедленная нагрузка без армирования	2026-04-28 22:40:23.883	2026-04-28 22:41:08.71
cmoj7lxe8003mtjxwxalmvr54	cmoj7lx710000tjxwa4mwax9z	cmnrmudhs001etjaw6l3bw244	{"scan": 0, "cad_fot": 11200, "cam_fot": 1800, "gips_fot": 0, "upakovka": 250, "manual_zt": 7000, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 300, "vosk_shtift": 0, "client_price": 55000, "postobrabotka": 50, "stoimost_baza": 50000, "materialy_emal": 300, "analogi_shtifty": 150, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 3500, "print_frez_koronki": 1200, "profile_discount_pct": 0}	Немедленная нагрузка с армированием	2026-04-28 22:40:23.888	2026-04-28 22:41:08.715
cmoj7lxec003otjxweci7ugfh	cmoj7lx710000tjxwa4mwax9z	cmnrmudhu001ftjawun8qobeg	{"scan": 0, "cad_fot": 1200, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 550, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 7000, "postobrabotka": 0, "stoimost_baza": 6000, "materialy_emal": 300, "analogi_shtifty": 150, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 100, "profile_discount_pct": 0}	Немедленная нагрузка на винтовой фиксации	2026-04-28 22:40:23.893	2026-04-28 22:41:08.718
cmoj7lxeg003qtjxwul6sw0ow	cmoj7lx710000tjxwa4mwax9z	cmnrmudjs0024tjawjvutb5yt	{"scan": 0, "cad_fot": 0, "cam_fot": 0, "gips_fot": 0, "upakovka": 0, "manual_zt": 0, "obrabotka": 200, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 3000, "postobrabotka": 0, "stoimost_baza": 2500, "materialy_emal": 100, "analogi_shtifty": 0, "cad_fot_hirurgiya": 350, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Дополнительный мини-имплант	2026-04-28 22:40:23.896	2026-04-28 22:41:08.852
cmoj7lxek003stjxwni3dgmdh	cmoj7lx710000tjxwa4mwax9z	cmnrmudhx001gtjaw9xc3dq7g	{"scan": 0, "cad_fot": 2100, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 2200, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 20000, "postobrabotka": 0, "stoimost_baza": 18000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 3300, "print_frez_koronki": 0, "profile_discount_pct": 0}	Аппарат Дерихсвайлера ТИТАН	2026-04-28 22:40:23.901	2026-04-28 22:41:08.735
cmoj7lxeo003utjxw46h2y12n	cmoj7lx710000tjxwa4mwax9z	cmnrmudi0001htjawm9ndijy9	{"scan": 0, "cad_fot": 2100, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 2600, "obrabotka": 600, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 22000, "postobrabotka": 0, "stoimost_baza": 20000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 3300, "print_frez_koronki": 0, "profile_discount_pct": 0}	Аппарат Марко Росса/HAAS ТИТАН	2026-04-28 22:40:23.904	2026-04-28 22:41:08.74
cmoj7lxes003wtjxw1rtmnpta	cmoj7lx710000tjxwa4mwax9z	cmnrmudi3001itjawfsq6rpsu	{"scan": 0, "cad_fot": 450, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 600, "zapchasti": 0, "prostetika": 0, "print_model": 200, "vosk_shtift": 0, "client_price": 7500, "postobrabotka": 0, "stoimost_baza": 6500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 1500, "print_frez_koronki": 0, "profile_discount_pct": 0}	Кольцо с держателем места ТИТАН	2026-04-28 22:40:23.908	2026-04-28 22:41:08.744
cmoj7lxfc003ytjxwf8xf5hn5	cmoj7lx710000tjxwa4mwax9z	cmnrmudi6001jtjawyxo3mzdu	{"scan": 0, "cad_fot": 2100, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 2100, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 17000, "postobrabotka": 0, "stoimost_baza": 15500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 1500, "print_frez_koronki": 0, "profile_discount_pct": 0}	Аппарат Дерихсвайлера	2026-04-28 22:40:23.929	2026-04-28 22:41:08.748
cmoj7lxfj0040tjxwit9e9d7i	cmoj7lx710000tjxwa4mwax9z	cmnrmudi9001ktjawggf2ay2u	{"scan": 0, "cad_fot": 2100, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 2400, "obrabotka": 600, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 19000, "postobrabotka": 0, "stoimost_baza": 17000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 1500, "print_frez_koronki": 0, "profile_discount_pct": 0}	Аппарат Марко Росса/HAAS	2026-04-28 22:40:23.935	2026-04-28 22:41:08.752
cmoj7lxfo0042tjxw7h33lnmu	cmoj7lx710000tjxwa4mwax9z	cmnrmudic001ltjawykehhkbw	{"scan": 0, "cad_fot": 2000, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 2100, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 15500, "postobrabotka": 0, "stoimost_baza": 14000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 1500, "print_frez_koronki": 0, "profile_discount_pct": 0}	Аппарат Нансе	2026-04-28 22:40:23.941	2026-04-28 22:41:08.756
cmoj7lxft0044tjxw3rq2difv	cmoj7lx710000tjxwa4mwax9z	cmnrmudie001mtjawiwcepgku	{"scan": 0, "cad_fot": 350, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 500, "zapchasti": 0, "prostetika": 0, "print_model": 200, "vosk_shtift": 0, "client_price": 7000, "postobrabotka": 0, "stoimost_baza": 6000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 400, "print_frez_koronki": 0, "profile_discount_pct": 0}	Кольцо с пружинами	2026-04-28 22:40:23.946	2026-04-28 22:41:08.765
cmoj7lxfz0046tjxwgle9k7ms	cmoj7lx710000tjxwa4mwax9z	cmnrmudih001ntjawvki1ci20	{"scan": 0, "cad_fot": 300, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 1200, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 7000, "postobrabotka": 0, "stoimost_baza": 6000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 1000, "print_frez_koronki": 0, "profile_discount_pct": 0}	Губной бампер	2026-04-28 22:40:23.952	2026-04-28 22:41:08.77
cmoj7lxg30048tjxw09h168gd	cmoj7lx710000tjxwa4mwax9z	cmnrmudik001otjawic6wnn55	{"scan": 0, "cad_fot": 700, "cam_fot": 200, "gips_fot": 0, "upakovka": 250, "manual_zt": 1200, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 11000, "postobrabotka": 0, "stoimost_baza": 10000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 1500, "print_frez_koronki": 0, "profile_discount_pct": 0}	Лингвальная дуга	2026-04-28 22:40:23.955	2026-04-28 22:41:08.773
cmoj7lxg6004atjxw5vgnw0dv	cmoj7lx710000tjxwa4mwax9z	cmnrmudin001ptjawc2zc9oi0	{"scan": 0, "cad_fot": 1400, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 1200, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 11000, "postobrabotka": 0, "stoimost_baza": 10000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 1500, "print_frez_koronki": 0, "profile_discount_pct": 0}	Небный бюгель	2026-04-28 22:40:23.958	2026-04-28 22:41:08.776
cmoj7lxg9004ctjxws0qrkq08	cmoj7lx710000tjxwa4mwax9z	cmnrmudiq001qtjawlsdkptm9	{"scan": 0, "cad_fot": 900, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 700, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 11000, "postobrabotka": 0, "stoimost_baza": 10000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 2500, "print_frez_koronki": 0, "profile_discount_pct": 0}	Заслонка для языка (несъемная конструкция)	2026-04-28 22:40:23.962	2026-04-28 22:41:08.78
cmoj7lxgc004etjxwzc5mh0wh	cmoj7lx710000tjxwa4mwax9z	cmnrmudiw001stjaw92ebeb6d	{"scan": 0, "cad_fot": 2500, "cam_fot": 300, "gips_fot": 0, "upakovka": 250, "manual_zt": 4000, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 800, "vosk_shtift": 0, "client_price": 42000, "postobrabotka": 0, "stoimost_baza": 38000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 4000, "print_frez_koronki": 0, "profile_discount_pct": 0}	Аппарат Гербста	2026-04-28 22:40:23.965	2026-04-28 22:41:08.784
cmoj7lxgf004gtjxwqrgjlarq	cmoj7lx710000tjxwa4mwax9z	cmnrmudiy001ttjawvwe6pa6p	{"scan": 0, "cad_fot": 3500, "cam_fot": 300, "gips_fot": 0, "upakovka": 250, "manual_zt": 4200, "obrabotka": 0, "zapchasti": 3000, "prostetika": 0, "print_model": 800, "vosk_shtift": 0, "client_price": 46000, "postobrabotka": 0, "stoimost_baza": 42000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 4000, "print_frez_koronki": 0, "profile_discount_pct": 0}	Аппарат Гербста с винтом	2026-04-28 22:40:23.968	2026-04-28 22:41:08.789
cmoj7lxgj004itjxwoucngii3	cmoj7lx710000tjxwa4mwax9z	cmnrmudj1001utjaw1avw1bol	{"scan": 0, "cad_fot": 3600, "cam_fot": 450, "gips_fot": 0, "upakovka": 250, "manual_zt": 2200, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 30000, "postobrabotka": 0, "stoimost_baza": 27200, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 2200, "print_frez_drugoe": 2500, "print_frez_koronki": 0, "profile_discount_pct": 0}	Расширяющий аппарат на 2 мини имплантах с одним винтом	2026-04-28 22:40:23.972	2026-04-28 22:41:08.793
cmoj7lxgo004ktjxwne8j8x4w	cmoj7lx710000tjxwa4mwax9z	cmnrmudj4001vtjaw12rc7ocy	{"scan": 0, "cad_fot": 3600, "cam_fot": 450, "gips_fot": 0, "upakovka": 250, "manual_zt": 2200, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 33000, "postobrabotka": 0, "stoimost_baza": 30000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 2200, "print_frez_drugoe": 2500, "print_frez_koronki": 0, "profile_discount_pct": 0}	Расширяющий аппарат на 4 мини имплантах с одним винтом	2026-04-28 22:40:23.977	2026-04-28 22:41:08.797
cmoj7lxgs004mtjxwe6ger33g	cmoj7lx710000tjxwa4mwax9z	cmnrmudj7001wtjawnmr1b4cb	{"scan": 0, "cad_fot": 3600, "cam_fot": 450, "gips_fot": 0, "upakovka": 250, "manual_zt": 2600, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 39000, "postobrabotka": 0, "stoimost_baza": 35500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 2200, "print_frez_drugoe": 2500, "print_frez_koronki": 0, "profile_discount_pct": 0}	Аппарат для расширения и дистализации с тремя винтами на 2 мини имплантах	2026-04-28 22:40:23.98	2026-04-28 22:41:08.8
cmoj7lxgx004otjxw17np779m	cmoj7lx710000tjxwa4mwax9z	cmnrmudj9001xtjawwwdtiqta	{"scan": 0, "cad_fot": 3300, "cam_fot": 450, "gips_fot": 0, "upakovka": 250, "manual_zt": 2000, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 32000, "postobrabotka": 0, "stoimost_baza": 29000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 2200, "print_frez_drugoe": 2500, "print_frez_koronki": 0, "profile_discount_pct": 0}	Дистализирующий аппарат на 2 мини импланта с одним винтом	2026-04-28 22:40:23.985	2026-04-28 22:41:08.804
cmoj7lxh1004qtjxwspna08aj	cmoj7lx710000tjxwa4mwax9z	cmnrmudjc001ytjawlqb8mvxs	{"scan": 0, "cad_fot": 3600, "cam_fot": 450, "gips_fot": 0, "upakovka": 250, "manual_zt": 2300, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 35000, "postobrabotka": 0, "stoimost_baza": 32000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 2200, "print_frez_drugoe": 2200, "print_frez_koronki": 0, "profile_discount_pct": 0}	Дистализирующий аппарат на 2 мини импланта с двумя винтами для дистализации	2026-04-28 22:40:23.99	2026-04-28 22:41:08.808
cmoj7lxh7004stjxwh8jkidxg	cmoj7lx710000tjxwa4mwax9z	cmnrmudjf001ztjawu0je5tjd	{"scan": 0, "cad_fot": 3200, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 1500, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 19500, "postobrabotka": 0, "stoimost_baza": 17700, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 2200, "print_frez_koronki": 0, "profile_discount_pct": 0}	Дистализирующий аппарат с одним винтом	2026-04-28 22:40:23.995	2026-04-28 22:41:08.812
cmoj7lxhc004utjxwq0fki17z	cmoj7lx710000tjxwa4mwax9z	cmnrmudjh0020tjawa9ib618o	{"scan": 0, "cad_fot": 3200, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 1700, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 24500, "postobrabotka": 0, "stoimost_baza": 22000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 2200, "print_frez_koronki": 0, "profile_discount_pct": 0}	Дистализирующий аппарат с двумя винтами	2026-04-28 22:40:24	2026-04-28 22:41:08.815
cmoj7lxhh004wtjxwrvnqfq2x	cmoj7lx710000tjxwa4mwax9z	cmnrmudju0025tjaw19t1ylc0	{"scan": 0, "cad_fot": 2100, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 1800, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 20000, "postobrabotka": 0, "stoimost_baza": 18000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 2200, "print_frez_drugoe": 2200, "print_frez_koronki": 0, "profile_discount_pct": 0}	Аппарат на мини-имплантах без расширяющего винта	2026-04-28 22:40:24.005	2026-04-28 22:41:08.823
cmoj7lxhm004ytjxwwbgiadl3	cmoj7lx710000tjxwa4mwax9z	cmoj65l4e004ntjvgzsqwqnam	{"scan": 0, "cad_fot": 4000, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 1700, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 42000, "postobrabotka": 0, "stoimost_baza": 38000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 2200, "print_frez_drugoe": 2200, "print_frez_koronki": 0, "profile_discount_pct": 0}	Расширяющий аппарат на двух мини-имплантах с одним винтом и пружинами для односторонней или двусторонней дистализации	2026-04-28 22:40:24.01	2026-04-28 22:41:08.827
cmoj7lxhq0050tjxwpnp0ghti	cmoj7lx710000tjxwa4mwax9z	cmoj65l4j004ptjvgt4sca7ee	{"scan": 0, "cad_fot": 0, "cam_fot": 0, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 3500, "postobrabotka": 0, "stoimost_baza": 3000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Аренда набора для установки мини имплантов	2026-04-28 22:40:24.015	2026-04-28 22:41:08.831
cmoj7lxhw0052tjxwf517u5yo	cmoj7lx710000tjxwa4mwax9z	cmnrmudjn0022tjaw0leoh11e	{"scan": 0, "cad_fot": 400, "cam_fot": 0, "gips_fot": 0, "upakovka": 250, "manual_zt": 1700, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 10500, "postobrabotka": 0, "stoimost_baza": 9500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 1000, "print_frez_koronki": 0, "profile_discount_pct": 0}	Аппарат Pendulum	2026-04-28 22:40:24.02	2026-04-28 22:41:08.835
cmoj7lxi10054tjxwj1y1mugg	cmoj7lx710000tjxwa4mwax9z	cmnrmudjp0023tjawwveh0cld	{"scan": 0, "cad_fot": 2100, "cam_fot": 0, "gips_fot": 0, "upakovka": 250, "manual_zt": 1300, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 17000, "postobrabotka": 0, "stoimost_baza": 15500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 2500, "print_frez_koronki": 0, "profile_discount_pct": 0}	Мезиолизатор	2026-04-28 22:40:24.026	2026-04-28 22:41:08.84
cmoj7lxi80056tjxwe5z96ykw	cmoj7lx710000tjxwa4mwax9z	cmnrmudjx0026tjawyhbvfyfi	{"scan": 0, "cad_fot": 200, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 1900, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 7000, "postobrabotka": 0, "stoimost_baza": 6000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Ретенционная пластинка	2026-04-28 22:40:24.033	2026-04-28 22:41:08.856
cmoj7lxid0058tjxw4vpnpieu	cmoj7lx710000tjxwa4mwax9z	cmnrmudkx002jtjawzg2wsa2h	{"scan": 0, "cad_fot": 200, "cam_fot": 150, "gips_fot": 0, "upakovka": 250, "manual_zt": 1900, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 8500, "postobrabotka": 0, "stoimost_baza": 7500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Аппарат Хоули	2026-04-28 22:40:24.038	2026-04-28 22:41:08.861
cmoj7lxii005atjxw0h4kuqbm	cmoj7lx710000tjxwa4mwax9z	cmnrmudjz0027tjawnsx7att4	{"scan": 0, "cad_fot": 400, "cam_fot": 300, "gips_fot": 0, "upakovka": 250, "manual_zt": 2400, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 8500, "postobrabotka": 0, "stoimost_baza": 7500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Аппарат Шварца	2026-04-28 22:40:24.042	2026-04-28 22:41:08.865
cmoj7lxio005ctjxwkbpimebp	cmoj7lx710000tjxwa4mwax9z	cmnrmudk20028tjawqjyoxsup	{"scan": 0, "cad_fot": 400, "cam_fot": 300, "gips_fot": 0, "upakovka": 250, "manual_zt": 3100, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 13500, "postobrabotka": 0, "stoimost_baza": 12000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Аппарат Твин Блок	2026-04-28 22:40:24.048	2026-04-28 22:41:08.869
cmoj7lxiu005etjxw6r57pr1e	cmoj7lx710000tjxwa4mwax9z	cmnrmudk50029tjaw9flfbm4h	{"scan": 0, "cad_fot": 400, "cam_fot": 300, "gips_fot": 0, "upakovka": 250, "manual_zt": 4400, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 15500, "postobrabotka": 0, "stoimost_baza": 14000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Аппарат Френкля	2026-04-28 22:40:24.054	2026-04-28 22:41:08.875
cmoj7lxiy005gtjxwcwccsgi2	cmoj7lx710000tjxwa4mwax9z	cmnrmudk8002atjaw1g6k981l	{"scan": 0, "cad_fot": 400, "cam_fot": 300, "gips_fot": 0, "upakovka": 250, "manual_zt": 2500, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 12500, "postobrabotka": 0, "stoimost_baza": 11000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Аппарат Андрезена Гойпля	2026-04-28 22:40:24.058	2026-04-28 22:41:08.878
cmoj7lxj2005itjxwkot9qjth	cmoj7lx710000tjxwa4mwax9z	cmnrmudka002btjawqfqfizc0	{"scan": 0, "cad_fot": 400, "cam_fot": 0, "gips_fot": 0, "upakovka": 250, "manual_zt": 2600, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 11000, "postobrabotka": 0, "stoimost_baza": 10000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Аппарат Кламмта	2026-04-28 22:40:24.062	2026-04-28 22:41:08.883
cmoj7lxj5005ktjxw3l1pcb0v	cmoj7lx710000tjxwa4mwax9z	cmnrmudkd002ctjawpbwuldgq	{"scan": 0, "cad_fot": 400, "cam_fot": 300, "gips_fot": 0, "upakovka": 250, "manual_zt": 1600, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 8500, "postobrabotka": 0, "stoimost_baza": 7500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Аппарат Брюкля	2026-04-28 22:40:24.066	2026-04-28 22:41:08.887
cmoj7lxj9005mtjxwcnjljf2z	cmoj7lx710000tjxwa4mwax9z	cmoj65l66005htjvg828tpha6	{"scan": 0, "cad_fot": 200, "cam_fot": 100, "gips_fot": 0, "upakovka": 250, "manual_zt": 450, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 200, "vosk_shtift": 0, "client_price": 5000, "postobrabotka": 0, "stoimost_baza": 4500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Каппа ретенционная\\элайнер	2026-04-28 22:40:24.07	2026-04-28 22:41:08.956
cmoj7lxje005otjxw81yc6mq5	cmoj7lx710000tjxwa4mwax9z	cmnrmudkg002dtjaw1h7s4uhe	{"scan": 0, "cad_fot": 200, "cam_fot": 100, "gips_fot": 0, "upakovka": 250, "manual_zt": 600, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 200, "vosk_shtift": 0, "client_price": 5500, "postobrabotka": 0, "stoimost_baza": 5000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Каппа для отбеливания зубов	2026-04-28 22:40:24.075	2026-04-28 22:41:08.895
cmoj7lxjj005qtjxwdy1tp648	cmoj7lx710000tjxwa4mwax9z	cmnrmudkj002etjawup7wvwnp	{"scan": 0, "cad_fot": 400, "cam_fot": 100, "gips_fot": 0, "upakovka": 250, "manual_zt": 650, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 400, "vosk_shtift": 0, "client_price": 9500, "postobrabotka": 0, "stoimost_baza": 8500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Каппа с замещением деффекта до 4 зубов	2026-04-28 22:40:24.079	2026-04-28 22:41:08.9
cmoj7lxjo005stjxwgi60kmzs	cmoj7lx710000tjxwa4mwax9z	cmnrmudkm002ftjawdipq3gd2	{"scan": 0, "cad_fot": 400, "cam_fot": 400, "gips_fot": 0, "upakovka": 250, "manual_zt": 1000, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 300, "vosk_shtift": 0, "client_price": 8500, "postobrabotka": 0, "stoimost_baza": 7500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Каппа спортивная одночелюстная	2026-04-28 22:40:24.084	2026-04-28 22:41:08.904
cmoj7lxjs005utjxwweqsue6p	cmoj7lx710000tjxwa4mwax9z	cmnrmudkp002gtjawtx5ijpjd	{"scan": 0, "cad_fot": 200, "cam_fot": 100, "gips_fot": 0, "upakovka": 250, "manual_zt": 700, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 200, "vosk_shtift": 0, "client_price": 6500, "postobrabotka": 0, "stoimost_baza": 5500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Каппа ретенционная Osamu	2026-04-28 22:40:24.088	2026-04-28 22:41:08.909
cmoj7lxjw005wtjxwlifvmqaa	cmoj7lx710000tjxwa4mwax9z	cmoj65l6m005rtjvgg9txqpri	{"scan": 0, "cad_fot": 200, "cam_fot": 0, "gips_fot": 0, "upakovka": 250, "manual_zt": 600, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 200, "vosk_shtift": 0, "client_price": 10000, "postobrabotka": 0, "stoimost_baza": 9000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Починка сторонних ортодонтических съемных аппаратов	2026-04-28 22:40:24.093	2026-04-28 22:41:08.913
cmoj7lxk0005ytjxwkse4rppt	cmoj7lx710000tjxwa4mwax9z	cmnrmudku002itjawlouxu08s	{"scan": 0, "cad_fot": 200, "cam_fot": 0, "gips_fot": 0, "upakovka": 250, "manual_zt": 600, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 200, "vosk_shtift": 0, "client_price": 3000, "postobrabotka": 0, "stoimost_baza": 2500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Починка ортодонтических съемных аппаратов КЛИКЛаб	2026-04-28 22:40:24.097	2026-04-28 22:41:08.917
cmoj7lxk50060tjxwzr3bgy39	cmoj7lx710000tjxwa4mwax9z	cmnrmudl3002ltjaw7a4r2gwn	{"scan": 0, "cad_fot": 0, "cam_fot": 0, "gips_fot": 0, "upakovka": 250, "manual_zt": 250, "obrabotka": 0, "zapchasti": 1000, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 3500, "postobrabotka": 0, "stoimost_baza": 3000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Добавление расширяющего винта в аппарат	2026-04-28 22:40:24.102	2026-04-28 22:41:08.924
cmoj7lxk90062tjxw83qlyu30	cmoj7lx710000tjxwa4mwax9z	cmnrmudlg002qtjawnjts85t8	{"scan": 0, "cad_fot": 0, "cam_fot": 0, "gips_fot": 0, "upakovka": 250, "manual_zt": 300, "obrabotka": 0, "zapchasti": 1000, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 3500, "postobrabotka": 0, "stoimost_baza": 3000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Заслон для языка	2026-04-28 22:40:24.105	2026-04-28 22:41:08.928
cmoj7lxke0064tjxwdxvsg92o	cmoj7lx710000tjxwa4mwax9z	cmoj65l750061tjvgvr0o8hmy	{"scan": 0, "cad_fot": 0, "cam_fot": 0, "gips_fot": 0, "upakovka": 250, "manual_zt": 300, "obrabotka": 0, "zapchasti": 1000, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 1500, "postobrabotka": 0, "stoimost_baza": 1000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Зуб пластмассовый	2026-04-28 22:40:24.11	2026-04-28 22:41:08.936
cmoj7lxki0066tjxw56eutnfk	cmoj7lx710000tjxwa4mwax9z	cmnrmudlj002rtjawx2c217o5	{"scan": 0, "cad_fot": 0, "cam_fot": 0, "gips_fot": 0, "upakovka": 250, "manual_zt": 200, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 1500, "postobrabotka": 0, "stoimost_baza": 1000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Окклюзионная накладка	2026-04-28 22:40:24.114	2026-04-28 22:41:08.941
cmoj7lxkn0068tjxwdgbay4j9	cmoj7lx710000tjxwa4mwax9z	cmoj65l7g0067tjvgz4a3plnj	{"scan": 0, "cad_fot": 1500, "cam_fot": 0, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 6500, "postobrabotka": 0, "stoimost_baza": 5500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Сетап до 3 ед.	2026-04-28 22:40:24.119	2026-04-28 22:41:08.944
cmoj7lxks006atjxw9apqlcqy	cmoj7lx710000tjxwa4mwax9z	cmoj65l7l0069tjvgb1qr4g82	{"scan": 0, "cad_fot": 2500, "cam_fot": 0, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 8500, "postobrabotka": 0, "stoimost_baza": 7500, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Сетап до 6 ед.	2026-04-28 22:40:24.124	2026-04-28 22:41:08.949
cmoj7lxkx006ctjxwzzoubk7p	cmoj7lx710000tjxwa4mwax9z	cmoj65l7q006btjvgd0uxb3z8	{"scan": 0, "cad_fot": 5000, "cam_fot": 0, "gips_fot": 0, "upakovka": 250, "manual_zt": 0, "obrabotka": 0, "zapchasti": 0, "prostetika": 0, "print_model": 0, "vosk_shtift": 0, "client_price": 17500, "postobrabotka": 0, "stoimost_baza": 16000, "materialy_emal": 300, "analogi_shtifty": 0, "cad_fot_hirurgiya": 0, "print_frez_drugoe": 0, "print_frez_koronki": 0, "profile_discount_pct": 0}	Сетап для одной челюсти более 6 ед.	2026-04-28 22:40:24.13	2026-04-28 22:41:08.952
\.


--
-- Data for Name: CostingLinePoolShare; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CostingLinePoolShare" ("lineId", "poolId", "shareRub") FROM stdin;
\.


--
-- Data for Name: CostingSharedPool; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CostingSharedPool" (id, "versionId", key, label, "totalRub", "sortOrder") FROM stdin;
\.


--
-- Data for Name: CostingVersion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."CostingVersion" (id, title, "effectiveFrom", archived, "monthlyFixedCostsRub", "fixedCostsPeriodNote", "expectedWorksPerMonth", "createdAt", "updatedAt") FROM stdin;
cmoj7lx710000tjxwa4mwax9z	Прайс версия 1.2026	2026-01-01 12:00:00	f	0	\N	\N	2026-04-28 22:40:23.629	2026-04-28 22:40:24.14
\.


--
-- Data for Name: Courier; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Courier" (id, "tenantId", name, "sortOrder", "isActive", "createdAt") FROM stdin;
\.


--
-- Data for Name: Doctor; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Doctor" (id, "tenantId", "fullName", "lastName", "firstName", patronymic, "formerLastName", specialty, city, email, "clinicWorkEmail", phone, "preferredContact", "telegramUsername", birthday, particulars, "acceptsPrivatePractice", "isIpEntrepreneur", "orderPriceListKind", "createdAt", "deletedAt") FROM stdin;
cmnnoyefu0000tjxw1r3hfcj7	cltenantdefault0000000000	Абакаров	Абакаров	\N	\N	\N	хирург	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:21.691	\N
cmnnoyegi0001tjxwlnb75v4h	cltenantdefault0000000000	Абдулабеков Гасан Абакарович	Абдулабеков	Гасан	Абакарович	\N	\N	\N	me@abdulabekov.ru	\N	8 999 532 3579	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:21.714	\N
cmnnoyegs0002tjxw3xf72g2h	cltenantdefault0000000000	Абдуллаев Вагиф	Абдуллаев	Вагиф	\N	\N	\N	\N	vadoctor1969@gmail.com	\N	8 931 581 9974	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:21.724	\N
cmnnoyeh50003tjxwf8wqk8gc	cltenantdefault0000000000	Абдурайимова Саодат	Абдурайимова	Саодат	\N	\N	\N	\N	\N	\N	8 961 661 7365	Telegram	saodat_abdurayimova	\N	\N	f	f	\N	2026-04-06 21:17:21.737	\N
cmnnoyhdr00bktjxwc260hllq	cltenantdefault0000000000	Абесадзе	Абесадзе	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.503	\N
cmnnoyeho0004tjxwomsrrzd0	cltenantdefault0000000000	Аблова Юлия	Аблова	Юлия	\N	\N	\N	\N	\N	\N	8 950 008 3675	Telegram	Yuliadoc24	\N	\N	f	f	\N	2026-04-06 21:17:21.756	\N
cmnnoyei00005tjxw83vjiutx	cltenantdefault0000000000	Авдеева Мария Викторовна	Авдеева	Мария	Викторовна	\N	\N	\N	\N	\N	8 999 042 2750	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:21.769	\N
cmnnoyei70006tjxwfhe0yhoq	cltenantdefault0000000000	Аветисян Анна Смбатовна	Аветисян	Анна	Смбатовна	\N	\N	\N	veneziadentalcases@gmail.com	\N	8 921 748 4811	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:21.776	\N
cmnnoyeij0007tjxwfnc2mutr	cltenantdefault0000000000	Аветисян Лолита Манвеловна	Аветисян	Лолита	Манвеловна	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:21.787	\N
cmnnoyhvd00extjxwaqp2rifi	cltenantdefault0000000000	Аветова	Аветова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.138	\N
cmnnoyeiq0008tjxwhc0mfyui	cltenantdefault0000000000	Агафонов Борис Владимирович	Агафонов	Борис	Владимирович	\N	\N	\N	\N	\N	8 921 108 5860	Telegram	abv_doc	\N	\N	f	f	\N	2026-04-06 21:17:21.794	\N
cmnnoyhj600cjtjxw2hepx4gt	cltenantdefault0000000000	Агеева	Агеева	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.698	\N
cmnnoyej30009tjxwx3l13n9b	cltenantdefault0000000000	Агурина Елена	Агурина	Елена	\N	\N	\N	\N	e.agurina@atribeautekids.ru	\N	8 931 624 1819	Telegram	agurinae	\N	\N	f	f	\N	2026-04-06 21:17:21.808	\N
cmnnoyhrg00e4tjxwg4yrtcvx	cltenantdefault0000000000	Азарян Георгий Альбертович	Азарян	Георгий	Альбертович	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.996	\N
cmnnoyhu600eptjxwvcasnq6k	cltenantdefault0000000000	Айрапетян	Айрапетян	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.095	\N
cmnnoyeje000atjxwm1d4t34k	cltenantdefault0000000000	Акинча Евгения Олеговна	Акинча	Евгения	Олеговна	\N	\N	\N	\N	\N	8 911 001 9029	Telegram	ZhyrbaE	\N	\N	f	f	\N	2026-04-06 21:17:21.819	\N
cmnnoyejr000btjxw4umn39y0	cltenantdefault0000000000	Акопян Сюзанна Самвеловна	Акопян	Сюзанна	Самвеловна	\N	\N	\N	\N	\N	8 923 359 9199	Telegram	ТГ @suzansuzasuzsus	\N	\N	f	f	\N	2026-04-06 21:17:21.831	\N
cmnnoyhx900fetjxwjyu1sjlj	cltenantdefault0000000000	Алборова	Алборова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.206	\N
cmnnoyek7000dtjxwkxsbeip0	cltenantdefault0000000000	Алексеева	Алексеева	\N	\N	\N	\N	\N	\N	\N	8 902 684 0662	Telegram	o_te1egram	\N	\N	f	f	\N	2026-04-06 21:17:21.847	\N
cmnnoyek1000ctjxwzl4s5bh6	cltenantdefault0000000000	Алексеева Екатерина Юрьевна	Алексеева	Екатерина	Юрьевна	\N	\N	\N	\N	\N	8 921 643 4544	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:21.842	\N
cmnnoyekd000etjxwf1ehskb1	cltenantdefault0000000000	Алиев Тимурлан Абдыразакович	Алиев	Тимурлан	Абдыразакович	\N	\N	\N	\N	\N	\N	Telegram	a1varez	\N	\N	f	f	\N	2026-04-06 21:17:21.853	\N
cmnnoyhuj00ertjxw8avh7ead	cltenantdefault0000000000	Алиева	Алиева	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.108	\N
cmnnoyeki000ftjxwnqwwgkup	cltenantdefault0000000000	Амаева Дамира М	Амаева	Дамира	М	\N	\N	\N	amaevad@mail.ru	\N	\N	Telegram	https://t.me/Amaevadinara	\N	\N	f	f	\N	2026-04-06 21:17:21.859	\N
cmnnoyeko000gtjxwl0npc85m	cltenantdefault0000000000	Амирханов Таймураз Назимович	Амирханов	Таймураз	Назимович	\N	\N	\N	\N	\N	8 921 398 0008	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:21.865	\N
cmnnoyekt000htjxwxm70b6l8	cltenantdefault0000000000	Амирханова	Амирханова	\N	\N	\N	\N	\N	\N	\N	8 964 000 2107	Telegram	AIs_sh_A	\N	\N	f	f	\N	2026-04-06 21:17:21.87	\N
cmnnoyel0000itjxw4nnxm3x6	cltenantdefault0000000000	Андреищева Маргарита	Андреищева	Маргарита	\N	\N	\N	\N	\N	\N	8 921 924 3103	Telegram	margo_vihrova	\N	\N	f	f	\N	2026-04-06 21:17:21.876	\N
cmnnoyelb000jtjxw0hcazdo6	cltenantdefault0000000000	Анисимова Алиса	Анисимова	Алиса	\N	\N	\N	\N	\N	\N	8 921 916 9806	Telegram	smilecorporationspb	\N	\N	f	f	\N	2026-04-06 21:17:21.888	\N
cmnnoyhiv00chtjxwz8466bsj	cltenantdefault0000000000	Антоневич	Антоневич	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.688	\N
cmnnoyelm000ktjxw3p0ufxpp	cltenantdefault0000000000	Апанасевич Алексей	Апанасевич	Алексей	\N	\N	\N	\N	\N	\N	420 777 033 315	Telegram	fincher55 (https://t.me/fincher55)	\N	\N	f	f	\N	2026-04-06 21:17:21.898	\N
cmnnoyhp600dptjxwq6pogiqv	cltenantdefault0000000000	Арес	Арес	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.915	\N
cmnnoyelq000ltjxww0xox1rt	cltenantdefault0000000000	Артикова	Артикова	\N	\N	\N	\N	\N	\N	\N	8 953 168 4670	Telegram	ortho_artikova	\N	\N	f	f	\N	2026-04-06 21:17:21.902	\N
cmnnoyelw000mtjxw5iqbtrta	cltenantdefault0000000000	Асирян Мариам	Асирян	Мариам	\N	\N	\N	\N	\N	\N	8 909 930 4353	Telegram	teh_dent	\N	\N	f	f	\N	2026-04-06 21:17:21.908	\N
cmnnoyem7000ntjxw767b79lh	cltenantdefault0000000000	Афанасьева Светлана Петровна	Афанасьева	Светлана	Петровна	\N	\N	\N	\N	\N	8 921 946 8991	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:21.919	\N
cmnnoyemd000otjxwtetwaw3k	cltenantdefault0000000000	Ахмедов Идрис Магомедович	Ахмедов	Идрис	Магомедович	\N	\N	\N	\N	\N	8 981 988 1111	Telegram	dr_esthete	\N	\N	f	f	\N	2026-04-06 21:17:21.926	\N
cmnnoyemn000ptjxwisqpyrwu	cltenantdefault0000000000	Ахмедов Эльвин Ифратович	Ахмедов	Эльвин	Ифратович	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:21.936	\N
cmnnoyemu000qtjxw5qja2stm	cltenantdefault0000000000	Ачкан Анастасия	Ачкан	Анастасия	\N	\N	\N	\N	anastasia.achkan@mail.ru	\N	8 921 375 5265	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:21.942	\N
cmnnoyhy100fltjxw28uw8jgh	cltenantdefault0000000000	Ашортиа	Ашортиа	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.234	\N
cmnnoyen4000rtjxw9b87b0j7	cltenantdefault0000000000	Бабан Кристина Юрьевна	Бабан	Кристина	Юрьевна	\N	\N	\N	\N	\N	8 911 179 2601	Telegram	KriSSSSmile	\N	\N	f	f	\N	2026-04-06 21:17:21.952	\N
cmnnoyen9000stjxw721aqj2p	cltenantdefault0000000000	Бабушкин Илья	Бабушкин	Илья	\N	\N	\N	\N	\N	\N	\N	Telegram	food_fanatix	\N	\N	f	f	\N	2026-04-06 21:17:21.958	\N
cmnnoyenf000ttjxwy5ftk06k	cltenantdefault0000000000	Багаутдинова Амина	Багаутдинова	Амина	\N	\N	\N	\N	\N	\N	8 999 208 0515	Telegram	b_aminaa_b	\N	\N	f	f	\N	2026-04-06 21:17:21.964	\N
cmnnoyenr000utjxwysqfqs3w	cltenantdefault0000000000	Бадаев Рустам	Бадаев	Рустам	\N	\N	\N	\N	\N	\N	8 911 837 5866	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:21.975	\N
cmnnoyhjn00cmtjxw1k53d3tf	cltenantdefault0000000000	Бадмаев Алдар Соёлович	Бадмаев	Алдар	Соёлович	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.715	\N
cmnnoyenv000vtjxww30y2zrf	cltenantdefault0000000000	Бажанов	Бажанов	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:21.98	\N
cmnnoyeo2000wtjxwaf7uv8t4	cltenantdefault0000000000	Базаров Азиз	Базаров	Азиз	\N	\N	\N	\N	\N	\N	8 931 291 1776	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:21.986	\N
cmnnoyeo7000xtjxw8lney097	cltenantdefault0000000000	Базарова Татьяна	Базарова	Татьяна	\N	\N	\N	\N	\N	\N	8 981 809 7786	Telegram	Tatiana_Bazarova	\N	\N	f	f	\N	2026-04-06 21:17:21.992	\N
cmnnoyeoj000ytjxwzhgklnhw	cltenantdefault0000000000	Баканова Виктория Максимовна	Баканова	Виктория	Максимовна	\N	\N	\N	\N	\N	8 921 406 4121	Telegram	veryvika07	\N	\N	f	f	\N	2026-04-06 21:17:22.003	\N
cmnnoyeon000ztjxwtomdpqyn	cltenantdefault0000000000	Балакирева	Балакирева	\N	\N	\N	\N	\N	\N	\N	8 920 678 6344	Telegram	SofiBalakireva	\N	\N	f	f	\N	2026-04-06 21:17:22.008	\N
cmnnoyeos0010tjxwquvq1esx	cltenantdefault0000000000	Балашова	Балашова	\N	\N	\N	\N	\N	\N	\N	8 921 753 8992	Telegram	nat_ashasg	\N	\N	f	f	\N	2026-04-06 21:17:22.013	\N
cmnnoyeox0011tjxw22d7a0wi	cltenantdefault0000000000	Баринова	Баринова	\N	\N	\N	\N	\N	\N	\N	8 921 759 7916	Telegram	dr_barinovaanna	\N	\N	f	f	\N	2026-04-06 21:17:22.017	\N
cmnnoyep40012tjxw2suwl341	cltenantdefault0000000000	Баркаревич Валерий Денисович	Баркаревич	Валерий	Денисович	\N	\N	\N	\N	\N	8 923 351 9100	Telegram	ValBarkar	\N	\N	f	f	\N	2026-04-06 21:17:22.025	\N
cmnnoyepb0013tjxwj7ucegr4	cltenantdefault0000000000	Барсегян Нонна Фирузовна	Барсегян	Нонна	Фирузовна	\N	\N	\N	\N	\N	8 921 376 8358	Telegram	nonnusha (https://t.me/nonnusha)	\N	\N	f	f	\N	2026-04-06 21:17:22.032	\N
cmnnoyhnx00dftjxw3jstyisu	cltenantdefault0000000000	Баторшина Анастасия Александровна	Баторшина	Анастасия	Александровна	\N	\N	\N	\N	\N	89622688888.	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.869	\N
cmnnoyepn0014tjxwlct5v32x	cltenantdefault0000000000	Бахтин Михаил Александрович	Бахтин	Михаил	Александрович	\N	ортодонт	\N	\N	\N	79119049265	Telegram	bahmisha	\N	\N	f	f	\N	2026-04-06 21:17:22.043	\N
cmnnoyepw0015tjxwe9kcj2w9	cltenantdefault0000000000	Беликов	Беликов	\N	\N	\N	\N	\N	\N	\N	8 920 870 3846	Telegram	dokdokdokdok123	\N	\N	f	f	\N	2026-04-06 21:17:22.052	\N
cmnnoyeq60016tjxw1agp9qyk	cltenantdefault0000000000	Белозуб Елена Анатольевна	Белозуб	Елена	Анатольевна	\N	\N	\N	\N	\N	8 921 945 0135	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.062	\N
cmnnoyhw500f4tjxws6ircqkr	cltenantdefault0000000000	Белявский	Белявский	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.166	\N
cmnnoyhfd00bvtjxwmvna46rb	cltenantdefault0000000000	Бен Гхали Анна Александровна	Бен Гхали	Анна	Александровна	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.562	\N
cmnnoyeqb0017tjxwi79arquq	cltenantdefault0000000000	Березина Александра Юрьевна	Березина	Александра	Юрьевна	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.067	\N
cmnnoyhjd00cktjxwf2jwrc36	cltenantdefault0000000000	Бессонова Валерия Владимировна	Бессонова	Валерия	Владимировна	\N	\N	\N	\N	\N	79522030051	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.705	\N
cmnnoyeqh0018tjxwooojstvv	cltenantdefault0000000000	Бир Мария	Бир	Мария	\N	Наталья Сергеевна Русских	\N	\N	\N	\N	8 926 120 4925	Telegram	MariaBier	\N	\N	f	f	\N	2026-04-06 21:17:22.073	\N
cmnnoyhw900f5tjxwejkn70wy	cltenantdefault0000000000	Бойцов	Бойцов	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.17	\N
cmnnoyeqr0019tjxwjln8k1t0	cltenantdefault0000000000	Болгова Вероника Александровна	Болгова	Вероника	Александровна	\N	\N	\N	\N	\N	8 921 975 3634	Telegram	nikamson	\N	\N	f	f	\N	2026-04-06 21:17:22.083	\N
cmnnoyhkf00crtjxwqy0bf5j4	cltenantdefault0000000000	Большедворская	Большедворская	\N	\N	\N	\N	\N	\N	\N	89995255948	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.744	\N
cmnnoyhz500futjxwo8nb40sr	cltenantdefault0000000000	Борукаева	Борукаева	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.274	\N
cmnnoyeqw001atjxwzmbq02iq	cltenantdefault0000000000	Бройтман Анна Борисовна	Бройтман	Анна	Борисовна	\N	\N	\N	broitman.anna@mail.ru	\N	8 921 925 0480	Telegram	anyabroitman (https://t.me/anyabroitman)	\N	\N	f	f	\N	2026-04-06 21:17:22.089	\N
cmnnoyer6001btjxwjvue1smr	cltenantdefault0000000000	Булатов Владимир	Булатов	Владимир	\N	\N	\N	\N	\N	\N	8 911 720 7939	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.098	\N
cmnnoyhwl00f8tjxwnf30lthu	cltenantdefault0000000000	Булычева	Булычева	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.181	\N
cmnnoyerf001ctjxwar2qbigq	cltenantdefault0000000000	Буренков Ростислав Николаевич	Буренков	Ростислав	Николаевич	\N	\N	\N	\N	\N	8 996 963 7568	Telegram	[object Object]	\N	\N	f	f	\N	2026-04-06 21:17:22.108	\N
cmnnoyern001dtjxwu46fld3v	cltenantdefault0000000000	Бурлова Елена Вяччеславовна	Бурлова	Елена	Вяччеславовна	\N	\N	\N	\N	\N	8 911 100 3444	Telegram	LenkinBourlik	\N	\N	f	f	\N	2026-04-06 21:17:22.115	\N
cmnnoyert001etjxwu2qujwsc	cltenantdefault0000000000	Бя Станислав Чердюнович	Бя	Станислав	Чердюнович	\N	ортопед	\N	\N	\N	\N	Telegram	stanislavbia	\N	\N	f	f	\N	2026-04-06 21:17:22.121	\N
cmnnoyhu200eotjxwnrt3lbry	cltenantdefault0000000000	Ваганова	Ваганова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.091	\N
cmnnoyes2001ftjxwafhkz6vd	cltenantdefault0000000000	Важенина Евгения	Важенина	Евгения	\N	\N	\N	\N	\N	\N	\N	Telegram	vazhenya	\N	\N	f	f	\N	2026-04-06 21:17:22.131	\N
cmnnoyes7001gtjxw4zz35osh	cltenantdefault0000000000	Валиев Рафик Тенгиз оглы	Валиев	Рафик	Тенгиз оглы	\N	\N	\N	\N	\N	\N	Telegram	RafiqValiev15	\N	\N	f	f	\N	2026-04-06 21:17:22.136	\N
cmnnoyesd001htjxw29zitt2d	cltenantdefault0000000000	Варлашина Наталья Сергеевна	Варлашина	Наталья	Сергеевна	\N	\N	\N	\N	\N	8 999 205 5412	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.142	\N
cmnnoyesj001itjxwd2xfmn7k	cltenantdefault0000000000	Василенко Прохор Сергеевич	Василенко	Прохор	Сергеевич	\N	ортопед	\N	\N	1dental@mail.ru	8 964 374 9268	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.148	\N
cmnnoyesr001jtjxwtyxkrqkm	cltenantdefault0000000000	Васильева	Васильева	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.156	\N
cmnnoyesx001ktjxwoe58en4a	cltenantdefault0000000000	Ващук Михаил Алексеевич	Ващук	Михаил	Алексеевич	\N	\N	\N	\N	\N	8 911 733 4163	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.161	\N
cmnnoyhvu00f1tjxw0yagyagi	cltenantdefault0000000000	Велиханова	Велиханова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.154	\N
cmnnoyet3001ltjxw2x7kunyb	cltenantdefault0000000000	Венкова Евгения Сергеевна	Венкова	Евгения	Сергеевна	\N	\N	\N	\N	\N	8 921 978 6638	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.167	\N
cmnnoyet9001mtjxwfhand87b	cltenantdefault0000000000	Веретехин Руслан Андреевич	Веретехин	Руслан	Андреевич	\N	\N	\N	\N	\N	8 961 0003103	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.173	\N
cmnnoyhy800fntjxwyftrcfy4	cltenantdefault0000000000	Вершинская	Вершинская	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.24	\N
cmnnoyhao00b3tjxwwdb8amrw	cltenantdefault0000000000	Веселовский	Веселовский	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.393	\N
cmnnoyetj001ntjxw6wmy2vrf	cltenantdefault0000000000	Вечелковская Евгения	Вечелковская	Евгения	\N	\N	\N	\N	\N	\N	8 911 296 1586	Telegram	Jane_Vvv	\N	\N	f	f	\N	2026-04-06 21:17:22.184	\N
cmnnoyhxn00fhtjxwn8yilip2	cltenantdefault0000000000	Виноградов	Виноградов	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.219	\N
cmnnoyhoj00dktjxw3k80k52b	cltenantdefault0000000000	Власенко	Власенко	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.891	\N
cmnnoyetp001otjxw95rg7h8q	cltenantdefault0000000000	Власова Мария	Власова	Мария	\N	\N	\N	\N	\N	\N	8 912 240 0208	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.19	\N
cmnnoyhzi00fxtjxwwbrmn1up	cltenantdefault0000000000	Войнилко	Войнилко	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.286	\N
cmnnoyha100b1tjxwhgbbo31m	cltenantdefault0000000000	Войтик Сергей	Войтик	Сергей	\N	\N	\N	Молдова	sergheivoitic88@gmail.com	\N	+373 69 126 662	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.37	\N
cmnnoyetw001ptjxw05s872ka	cltenantdefault0000000000	Волкова Евгения	Волкова	Евгения	\N	\N	\N	\N	\N	\N	8 921 395 8263	Telegram	volkova_evgenya	\N	\N	f	f	\N	2026-04-06 21:17:22.196	\N
cmnnoyhlw00d0tjxwikjbzuub	cltenantdefault0000000000	Волкова Марина Игоревна	Волкова	Марина	Игоревна	\N	\N	\N	\N	\N	89218661458	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.796	\N
cmnnoyeu5001qtjxw32o1qzzy	cltenantdefault0000000000	Воронин Юрий	Воронин	Юрий	\N	\N	\N	\N	\N	\N	8 962 697 3665	Telegram	dr_yuriy_voronin	\N	\N	f	f	\N	2026-04-06 21:17:22.206	\N
cmnnoyhcy00bgtjxworr2dnhm	cltenantdefault0000000000	Габолаев	Габолаев	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.474	\N
cmnnoyhh000c5tjxwhm90wd1k	cltenantdefault0000000000	Гаврюк Егор Владимирович	Гаврюк	Егор	Владимирович	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.621	\N
cmnnoyhel00bptjxwmgnvkvmf	cltenantdefault0000000000	Газиева Маржанат Магомедовна	Газиева	Маржанат	Магомедовна	\N	\N	\N	\N	\N	79215656529	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.533	\N
cmnnoyhm400d2tjxwlf44vtrs	cltenantdefault0000000000	Галицкая	Галицкая	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.805	\N
cmnnoyeu9001rtjxwo0r18v66	cltenantdefault0000000000	Гамов	Гамов	\N	\N	\N	\N	\N	\N	\N	\N	Telegram	iigamov	\N	\N	f	f	\N	2026-04-06 21:17:22.21	\N
cmnnoyhrz00e8tjxw8s0e2uok	cltenantdefault0000000000	Гамыдов	Гамыдов	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.015	\N
cmnnoyhjr00cntjxwuwcrm52q	cltenantdefault0000000000	Гафурова	Гафурова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.72	\N
cmnnoyhl400cvtjxwdi3drsaw	cltenantdefault0000000000	Гетц Дмитрий	Гетц	Дмитрий	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.768	\N
cmnnoyeum001ttjxw79pmpfqf	cltenantdefault0000000000	Гильмзянова Елена Рафаиловна	Гильмзянова	Елена	Рафаиловна	\N	\N	\N	\N	\N	8 950 042 5810	Telegram	Elena_Gilmzianova	\N	\N	f	f	\N	2026-04-06 21:17:22.222	\N
cmnnoyeuw001utjxwz1h9kdf0	cltenantdefault0000000000	Гильфанова Камиля	Гильфанова	Камиля	\N	\N	\N	\N	\N	\N	8 921 646 4690	Telegram	dr_gilfanovak	\N	\N	f	f	\N	2026-04-06 21:17:22.232	\N
cmnnoyev7001vtjxwlrpsosbk	cltenantdefault0000000000	Гладкая Ульяна Валерьевна	Гладкая	Ульяна	Валерьевна	\N	ортодонт	\N	\N	\N	8 952 224 5301	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.244	\N
cmnnoyevh001wtjxwffd3qq15	cltenantdefault0000000000	Глазова Ольга Владимировна	Глазова	Ольга	Владимировна	\N	\N	\N	\N	\N	8 921 366 5660	Telegram	OGlazova	\N	\N	f	f	\N	2026-04-06 21:17:22.253	\N
cmnnoyevr001xtjxwtbkfmi54	cltenantdefault0000000000	Глякова Анна Андреевна	Глякова	Анна	Андреевна	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.263	\N
cmnnoyhmr00d7tjxwdzcqy4tf	cltenantdefault0000000000	Говорун	Говорун	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.827	\N
cmnnoyevx001ytjxwsmtq08ef	cltenantdefault0000000000	Гогуев Марат Асланович	Гогуев	Марат	Асланович	\N	\N	\N	gaguy@mail.ru	\N	8 962 709 9900	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.27	\N
cmnnoyew3001ztjxw64wakeyo	cltenantdefault0000000000	Годявин Роман	Годявин	Роман	\N	\N	ортодонт	\N	\N	\N	8 981 961 8087	Telegram	Godyavin	\N	\N	f	f	\N	2026-04-06 21:17:22.276	\N
cmnnoyewa0020tjxwlsejaor8	cltenantdefault0000000000	Голубева Кристина	Голубева	Кристина	\N	\N	Ортодонт	\N	\N	\N	8 921 685 5448	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.282	\N
cmnnoyhhj00c8tjxwte0g44ge	cltenantdefault0000000000	Гольдштейн Илья Игоревич	Гольдштейн	Илья	Игоревич	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.639	\N
cmnnoyhyb00fotjxwq65pm4rl	cltenantdefault0000000000	Горбунова	Горбунова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.244	\N
cmnnoyhhd00c7tjxwkp609oqw	cltenantdefault0000000000	Горская Ольга	Горская	Ольга	\N	\N	\N	\N	\N	\N	7 953 150-11-95	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.634	\N
cmnnoyhef00botjxwbds304hj	cltenantdefault0000000000	Горский Игорь Игоревич	Горский	Игорь	Игоревич	\N	\N	\N	\N	\N	89602665824	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.528	\N
cmnnoyhka00cqtjxwg9r866ih	cltenantdefault0000000000	Григорьев Александр Дмитриевич	Григорьев	Александр	Дмитриевич	\N	\N	\N	\N	\N	89215006253	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.738	\N
cmnnoyewg0021tjxw2x64sa7t	cltenantdefault0000000000	Григорьева Алина	Григорьева	Алина	\N	\N	\N	\N	\N	\N	8 911 227 0835	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.289	\N
cmnnoyewv0022tjxw7q7bzs0t	cltenantdefault0000000000	Григорьева Ирина	Григорьева	Ирина	\N	\N	\N	\N	\N	\N	8 911 227 0835\n8 921 599 0077	Telegram	DrIrGr	\N	\N	f	f	\N	2026-04-06 21:17:22.304	\N
cmnnoyex90023tjxwzvy67uw1	cltenantdefault0000000000	Григорян Джульетта	Григорян	Джульетта	\N	\N	\N	\N	\N	\N	\N	Telegram	Juliet_Johnovna	\N	\N	f	f	\N	2026-04-06 21:17:22.318	\N
cmnnoyexj0024tjxw7tjyxtjh	cltenantdefault0000000000	Грищенко Элада Борисовна	Грищенко	Элада	Борисовна	\N	\N	\N	\N	\N	8 921 900 6109	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.327	\N
cmnnoyexw0026tjxwjcmk8umu	cltenantdefault0000000000	Губин Степан	Губин	Степан	\N	\N	\N	\N	\N	\N	\N	Telegram	drgubin	\N	\N	f	f	\N	2026-04-06 21:17:22.341	\N
cmnnoyey30027tjxwphtpx1uo	cltenantdefault0000000000	Гудко Ольга	Гудко	Ольга	\N	\N	\N	\N	olga.gudko@507-9393.ru	\N	8 906 410 9745	Telegram	Olga_g_k (https://t.me/Olga_g_k)	\N	\N	f	f	\N	2026-04-06 21:17:22.348	\N
cmnnoyeyd0028tjxwfxexa9au	cltenantdefault0000000000	Гуляева Наталья Александровна	Гуляева	Наталья	Александровна	\N	\N	\N	\N	\N	8 951 688 5923	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.358	\N
cmnnoyeyj0029tjxw4uurqktj	cltenantdefault0000000000	Гулянов Георгий	Гулянов	Георгий	\N	\N	\N	\N	\N	\N	\N	Telegram	avvettis	\N	\N	f	f	\N	2026-04-06 21:17:22.363	\N
cmnnoyeyp002atjxw0ioneel7	cltenantdefault0000000000	Гурбанов Орхан Мехманович	Гурбанов	Орхан	Мехманович	\N	\N	\N	human-being@mail.ru	\N	8 921 897 0072	Telegram	chermon	\N	\N	f	f	\N	2026-04-06 21:17:22.369	\N
cmnnoyhbe00b7tjxwj0v5uswh	cltenantdefault0000000000	Гусенаджиев Курбан Айгумович	Гусенаджиев	Курбан	Айгумович	\N	\N	\N	\N	\N	+7 921 781 1195	Telegram	KurbanD	\N	\N	f	f	\N	2026-04-06 21:17:25.419	\N
cmnnoyeyv002btjxwqfcwwnds	cltenantdefault0000000000	Гусова Залина Аслановна	Гусова	Залина	Аслановна	\N	\N	\N	\N	\N	8 911 272 0908	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.376	\N
cmnnoyhro00e6tjxwegv4a37l	cltenantdefault0000000000	Гутарина	Гутарина	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.005	\N
cmnnoyez1002ctjxw7d7zpb9z	cltenantdefault0000000000	Дадашова Гюнель	Дадашова	Гюнель	\N	\N	\N	\N	\N	\N	8 981 773 4491	Telegram	Gyunel_Dad	\N	\N	f	f	\N	2026-04-06 21:17:22.381	\N
cmnnoyez7002dtjxw6bz9frq0	cltenantdefault0000000000	Дайтиева Анна Сергеевна	Дайтиева	Анна	Сергеевна	\N	\N	\N	\N	\N	8 988 768 7046	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.387	\N
cmnnoyezg002etjxwmqzn40vx	cltenantdefault0000000000	Данилова Сати	Данилова	Сати	\N	\N	\N	\N	\N	\N	8 921 632 9427	Telegram	Sati_nv	\N	\N	f	f	\N	2026-04-06 21:17:22.396	\N
cmnnoyexp0025tjxw3nlppa2k	cltenantdefault0000000000	Девяткина (Груздева) Ксения Николаевна	Девяткина (Груздева)	Ксения	Николаевна	\N	\N	\N	\N	\N	\N	Telegram	dr_ksenia_gr	\N	\N	f	f	\N	2026-04-06 21:17:22.333	\N
cmnnoyezm002ftjxw6rbr6s20	cltenantdefault0000000000	Демина Елена Андреевна	Демина	Елена	Андреевна	\N	\N	\N	\N	\N	8 981 860 7225	Telegram	телеграмм: dr_elena_dem	\N	\N	f	f	\N	2026-04-06 21:17:22.402	\N
cmnnoyezr002gtjxw8tv797qr	cltenantdefault0000000000	Джавадов Орхан Камранович	Джавадов	Орхан	Камранович	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.408	\N
cmnnoyezx002htjxw0skh8hb9	cltenantdefault0000000000	Джамалова Аминат Магомедовна	Джамалова	Аминат	Магомедовна	\N	\N	\N	\N	\N	8 988 222 2193	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.413	\N
cmnnoyf07002itjxw07ucvhy0	cltenantdefault0000000000	Джексенбаева Зарина	Джексенбаева	Зарина	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.423	\N
cmnnoyf0d002jtjxw82zmfd8g	cltenantdefault0000000000	Джекшеналиев Эржан	Джекшеналиев	Эржан	\N	\N	\N	\N	\N	\N	\N	Telegram	dzhkshnlv	\N	\N	f	f	\N	2026-04-06 21:17:22.429	\N
cmnnoyhrk00e5tjxwg02dovz6	cltenantdefault0000000000	Джуринская	Джуринская	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26	\N
cmnnoyf0i002ktjxwypdfezxp	cltenantdefault0000000000	Дзгоев Урузмаг	Дзгоев	Урузмаг	\N	\N	\N	\N	\N	\N	8 964 390 6201	Telegram	Dr_Dzgoev_Uruzmag	\N	\N	f	f	\N	2026-04-06 21:17:22.435	\N
cmnnoyhyg00fptjxwjd2r2v5u	cltenantdefault0000000000	Дзейтов	Дзейтов	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.248	\N
cmnnoyi0800g1tjxwv9adox3n	cltenantdefault0000000000	Дмитриева	Дмитриева	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.312	\N
cmnnoyf0o002ltjxwbf8hvjdh	cltenantdefault0000000000	Дорофеева Полина Александровна	Дорофеева	Полина	Александровна	\N	\N	\N	\N	\N	8 950 044 2101	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.441	\N
cmnnoyf0u002mtjxw2619m00p	cltenantdefault0000000000	Дочия Татия	Дочия	Татия	\N	\N	\N	\N	\N	\N	8 960 283 8868	Telegram	DrKuznetsovaTM	\N	\N	f	f	\N	2026-04-06 21:17:22.447	\N
cmnnoygxn009otjxwnbca42lh	cltenantdefault0000000000	Дробкова Кристина Олеговна	Дробкова	Кристина	Олеговна	Дробкова	ортодонт	\N	\N	\N	79213215057	Telegram	kristina_drobkova	\N	\N	f	f	\N	2026-04-06 21:17:24.923	\N
cmnnoyf0z002ntjxw0s7lhk9p	cltenantdefault0000000000	Дрожжина Диана	Дрожжина	Диана	\N	\N	\N	\N	dr.ozhzhina@yandex.ru	\N	8 921 775 3693	Telegram	Didropie	\N	\N	f	f	\N	2026-04-06 21:17:22.452	\N
cmnnoyhac00b2tjxwf2g6pao3	cltenantdefault0000000000	Дружининская Светлана	Дружининская	Светлана	\N	\N	ортодонт	\N	svetlanadruzhininskaya@gmail.com	\N	8 931 260 9921	Telegram	DruzhininskayaSvetlana	\N	\N	f	f	\N	2026-04-06 21:17:25.38	\N
cmnnoyf15002otjxwzmjm9j0m	cltenantdefault0000000000	Дрыженко Юлия Евгеньевна	Дрыженко	Юлия	Евгеньевна	\N	\N	\N	\N	\N	8 911 732 0630	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.458	\N
cmnnoyf1b002ptjxwyvxo2yv2	cltenantdefault0000000000	Дубовская Марина Анатольевна	Дубовская	Марина	Анатольевна	\N	\N	\N	\N	\N	8 911 935 2049	Telegram	marina.dubovskaya@konfidencia.ru - почта	\N	\N	f	f	\N	2026-04-06 21:17:22.464	\N
cmnnoyf1h002qtjxwdstpom12	cltenantdefault0000000000	Дубровина Елизавета Олеговна	Дубровина	Елизавета	Олеговна	\N	\N	\N	\N	\N	8 981 185 1403	Telegram	elizavetadubrovina	\N	\N	f	f	\N	2026-04-06 21:17:22.469	\N
cmnnoyhmi00d5tjxw7xac45dt	cltenantdefault0000000000	Дулевич	Дулевич	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.818	\N
cmnnoyhji00cltjxw3918287q	cltenantdefault0000000000	Дьяк Герман Александрович	Дьяк	Герман	Александрович	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.71	\N
cmnnoyf1n002rtjxwf66g6lhq	cltenantdefault0000000000	Егельская Александра Сергеевна	Егельская	Александра	Сергеевна	\N	\N	\N	\N	\N	8 921 888 8188	Telegram	ortho008	\N	\N	f	f	\N	2026-04-06 21:17:22.475	\N
cmnnoyhky00cutjxwzahxuw64	cltenantdefault0000000000	Егиазарян Рафаэль Араикович	Егиазарян	Рафаэль	Араикович	\N	\N	\N	\N	\N	79313568820	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.762	\N
cmnnoyf1s002stjxw6fclwo9p	cltenantdefault0000000000	Егорова Ольга Константиновна	Егорова	Ольга	Константиновна	\N	\N	\N	\N	\N	8 921 317 3734	Telegram	Braces_ok	\N	\N	f	f	\N	2026-04-06 21:17:22.48	\N
cmnnoyhwd00f6tjxwaikjaas8	cltenantdefault0000000000	Езиев	Езиев	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.174	\N
cmnnoyf1y002ttjxwophb3exy	cltenantdefault0000000000	Ельцова Варвара Петрова	Ельцова	Варвара	Петрова	\N	\N	\N	\N	\N	8 982 490 6303	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.486	\N
cmnnoyf25002utjxwjqyb1cjz	cltenantdefault0000000000	Енькова Алина Анатольевна	Енькова	Алина	Анатольевна	\N	\N	\N	\N	\N	8 981 797 3839	Telegram	dentalien	\N	\N	f	f	\N	2026-04-06 21:17:22.493	\N
cmnnoyflc005ftjxwem50t0x9	cltenantdefault0000000000	Епейкина Екатерина Степановна	Епейкина	Екатерина	Степановна	Лесина	ортодонт	\N	\N	\N	\N	Telegram	dr_ekaterina_lesina	\N	\N	f	f	\N	2026-04-06 21:17:23.185	\N
cmnnoyf2f002vtjxwibrtoj4l	cltenantdefault0000000000	Ермошкина Ольга Сергеевна	Ермошкина	Ольга	Сергеевна	\N	\N	\N	byka.18@mail.ru	\N	8 921 585 5405	Telegram	Olgaolga94	\N	\N	f	f	\N	2026-04-06 21:17:22.503	\N
cmnnoyhnq00detjxwa2tifjt1	cltenantdefault0000000000	Ероньян Мария Владимировна	Ероньян	Мария	Владимировна	\N	\N	\N	\N	\N	7 981 194 2448	Telegram	mashamashaa1703	\N	\N	f	f	\N	2026-04-06 21:17:25.863	\N
cmnnoyhhp00c9tjxwzqzwya1b	cltenantdefault0000000000	Ерошкина Вера Анатольевна	Ерошкина	Вера	Анатольевна	\N	\N	\N	\N	\N	7 952 224 2346	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.646	\N
cmnnoyf2p002wtjxwwqyn8xqx	cltenantdefault0000000000	Ерунова Ольга Вячеславовна	Ерунова	Ольга	Вячеславовна	\N	\N	\N	\N	\N	8 981 145 3362	Telegram	bublturbo	\N	\N	f	f	\N	2026-04-06 21:17:22.513	\N
cmnnoyf2v002xtjxwnisxuz1u	cltenantdefault0000000000	Ершов Марк Романович	Ершов	Марк	Романович	\N	\N	\N	\N	\N	8 981 842 8229	Telegram	yershovm	\N	\N	f	f	\N	2026-04-06 21:17:22.519	\N
cmnnoyf30002ytjxwe2xj6s30	cltenantdefault0000000000	Есипович Кристина Ропиковна	Есипович	Кристина	Ропиковна	\N	\N	\N	\N	\N	8 921 956 7222	Telegram	esipovichkris	\N	\N	f	f	\N	2026-04-06 21:17:22.525	\N
cmnnoyf39002ztjxweuqxtgt5	cltenantdefault0000000000	Ефимов Станислав Дмитриевич	Ефимов	Станислав	Дмитриевич	\N	\N	\N	\N	\N	8 962 285 5360	Telegram	stagas666	\N	\N	f	f	\N	2026-04-06 21:17:22.533	\N
cmnnoyf3e0030tjxwi9hi3w86	cltenantdefault0000000000	Жадан Анастасия Антоновна	Жадан	Анастасия	Антоновна	\N	\N	\N	\N	\N	8 911 253 6145	Telegram	anazhadan	\N	\N	f	f	\N	2026-04-06 21:17:22.539	\N
cmnnoyf3i0031tjxw42cebalh	cltenantdefault0000000000	Жгунова Маргарита Андреевна	Жгунова	Маргарита	Андреевна	\N	\N	\N	\N	\N	скрыт	Telegram	скрыт	\N	\N	f	f	\N	2026-04-06 21:17:22.543	\N
cmnnoyf3n0032tjxwcfnir3jp	cltenantdefault0000000000	Жданюк Игорь Владимирович	Жданюк	Игорь	Владимирович	\N	\N	\N	\N	\N	8 921 947 5135	Telegram	скрыт	\N	\N	f	f	\N	2026-04-06 21:17:22.548	\N
cmnnoyhcj00bdtjxwc1q3ab5o	cltenantdefault0000000000	Жевлаков Андрей	Жевлаков	Андрей	\N	\N	\N	\N	\N	\N	8-967-590-59-90	Telegram	dr_andrey_zhevlakov	\N	\N	f	f	\N	2026-04-06 21:17:25.459	\N
cmnnoyf3s0033tjxwfx4pl03z	cltenantdefault0000000000	Железогло Елена Григорьевна	Железогло	Елена	Григорьевна	\N	\N	\N	\N	\N	8 952 277 5082	Telegram	zhele03	\N	\N	f	f	\N	2026-04-06 21:17:22.553	\N
cmnnoyhv900ewtjxwssx0msal	cltenantdefault0000000000	Житникова	Житникова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.134	\N
cmnnoyf3y0034tjxwqfbvpnyn	cltenantdefault0000000000	Заварзина Елизавета Андреевна	Заварзина	Елизавета	Андреевна	\N	\N	\N	\N	\N	8 953 348 9195	Telegram	elizavetazavarzina	\N	\N	f	f	\N	2026-04-06 21:17:22.558	\N
cmnnoyf430035tjxwjjw1m6wu	cltenantdefault0000000000	Загреева Айгуль Айратовна	Загреева	Айгуль	Айратовна	\N	\N	\N	\N	\N	8 986 926 7515	Telegram	Aigul_zagreeva	\N	\N	f	f	\N	2026-04-06 21:17:22.564	\N
cmnnoyhs800eatjxw66xbb3ya	cltenantdefault0000000000	Заикина Евгения	Заикина	Евгения	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.024	\N
cmnnoyf4c0036tjxw0fvr1ent	cltenantdefault0000000000	Заитова Мария Владимировна	Заитова	Мария	Владимировна	\N	\N	\N	\N	\N	8 921 435 8232	Telegram	Maria_MayRose07	\N	\N	f	f	\N	2026-04-06 21:17:22.572	\N
cmnnoyht100ehtjxw03idrsk9	cltenantdefault0000000000	Зайкина Е.	Зайкина	Е.	\N	\N	\N	\N	\N	\N	972534739398	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.053	\N
cmnnoyf4g0037tjxwnjhkrhk5	cltenantdefault0000000000	Зайцева Юлия Александровна	Зайцева	Юлия	Александровна	\N	\N	\N	\N	\N	скрыт	Telegram	dr_zaytseva_julia	\N	\N	f	f	\N	2026-04-06 21:17:22.576	\N
cmnnoyf4l0038tjxwixm02c14	cltenantdefault0000000000	Захаренкова Светлана Сергеевна	Захаренкова	Светлана	Сергеевна	\N	\N	\N	\N	\N	8 911 638 8427	Telegram	SvetlanaZakharenkova99	\N	\N	f	f	\N	2026-04-06 21:17:22.581	\N
cmnnoyf4r0039tjxw263s540g	cltenantdefault0000000000	Зинина Наталья Владимировна	Зинина	Наталья	Владимировна	\N	\N	\N	\N	\N	8 906 261 3413	Telegram	скрыт	\N	\N	f	f	\N	2026-04-06 21:17:22.587	\N
cmnnoyf4w003atjxwqfrhx43j	cltenantdefault0000000000	Зинченко Елизавета Кирилловна	Зинченко	Елизавета	Кирилловна	\N	\N	\N	\N	\N	8 931 240 1989	Telegram	zinchili	\N	\N	f	f	\N	2026-04-06 21:17:22.593	\N
cmnnoyf56003btjxwqgkpwrrb	cltenantdefault0000000000	Зограбян Артавазд Гагикович	Зограбян	Артавазд	Гагикович	\N	\N	\N	\N	\N	8 981 881 0555	Telegram	скрыт	\N	\N	f	f	\N	2026-04-06 21:17:22.602	\N
cmnnoyf5c003ctjxwmvpb9t0n	cltenantdefault0000000000	Зорина Татьяна Анатольева	Зорина	Татьяна	Анатольева	\N	\N	\N	\N	\N	8 921 941 7510	Telegram	PechenkaTati	2024-09-24 12:00:00	\N	f	f	\N	2026-04-06 21:17:22.608	\N
cmnnoyf5n003dtjxw1rfvtwa1	cltenantdefault0000000000	Зотов Андрей Николаевич	Зотов	Андрей	Николаевич	\N	\N	\N	\N	\N	8 921 966 6590	Telegram	dr_zotov_andrey	\N	\N	f	f	\N	2026-04-06 21:17:22.619	\N
cmnnoyhpz00dutjxwpqz5z7bg	cltenantdefault0000000000	Зотов Дмитрий	Зотов	Дмитрий	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.943	\N
cmnnoyf5u003etjxwcghqdmwi	cltenantdefault0000000000	Зубарев Сергей Валерьевич	Зубарев	Сергей	Валерьевич	\N	\N	\N	dr@zubarevspb.ru	\N	8 999 519 6300	Telegram	drzubarev	\N	\N	f	f	\N	2026-04-06 21:17:22.627	\N
cmnnoyf60003ftjxwort53isc	cltenantdefault0000000000	Зубов Михаил Александровна	Зубов	Михаил	Александровна	\N	\N	\N	\N	\N	8 911 977 7397	Telegram	Archangel_MichaelZ	\N	\N	f	f	\N	2026-04-06 21:17:22.633	\N
cmnnoyhex00bstjxwfwxt9bvq	cltenantdefault0000000000	Зубова Кетеван Нугзаровна	Зубова	Кетеван	Нугзаровна	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.546	\N
cmnnoyf65003gtjxw89jhekfr	cltenantdefault0000000000	Зыкова	Зыкова	\N	\N	\N	\N	\N	\N	\N	8 952 226 3554	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.637	\N
cmnnoyf6a003htjxww5aglix0	cltenantdefault0000000000	Ибрагимова Зэрнитач Сурхайевна	Ибрагимова	Зэрнитач	Сурхайевна	\N	\N	\N	\N	\N	8 903 633 0911	Telegram	zernitach	\N	\N	f	f	\N	2026-04-06 21:17:22.643	\N
cmnnoyf6g003itjxw9b6a189t	cltenantdefault0000000000	Иванов Василий Олегович	Иванов	Василий	Олегович	\N	\N	\N	\N	\N	8 951 664 350	Telegram	Dr_Vasilii_Ivanov	\N	\N	f	f	\N	2026-04-06 21:17:22.648	\N
cmnnoyf6l003jtjxwpi4p0zfl	cltenantdefault0000000000	Иванов Евгений Иванович	Иванов	Евгений	Иванович	\N	\N	\N	\N	\N	8 922 251 2353	Telegram	docIvanovei	\N	\N	f	f	\N	2026-04-06 21:17:22.654	\N
seed-doc-ivanov	cltenantdefault0000000000	Иванов И.И.	\N	\N	\N	\N	\N	\N	\N	\N	+7 900 111-22-33	Telegram	ivanov_ortho	\N	\N	f	f	\N	2026-04-06 19:50:51.925	\N
cmnnoyhmx00d8tjxwtmpaw9o8	cltenantdefault0000000000	Иванова	Иванова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.834	\N
cmnnoyhgo00c3tjxwcq5za1av	cltenantdefault0000000000	Иванова Арина Александровна	Иванова	Арина	Александровна	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.609	\N
cmnnoyf6r003ktjxwae1y1pmq	cltenantdefault0000000000	Иванова Татиана Линовна	Иванова	Татиана	Линовна	\N	\N	\N	\N	\N	8 987 675 9572	Telegram	скрыт	\N	\N	f	f	\N	2026-04-06 21:17:22.659	\N
cmnnoyf6w003ltjxww452j1k0	cltenantdefault0000000000	Иванькин Евгений Викторович	Иванькин	Евгений	Викторович	\N	\N	\N	\N	\N	8 911 705 6224	Telegram	скрыт	\N	\N	f	f	\N	2026-04-06 21:17:22.664	\N
cmnnoyhqm00dytjxww5gmg11z	cltenantdefault0000000000	Ивашкевич Евгений	Ивашкевич	Евгений	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.966	\N
cmnnoyhin00cftjxwnmx3y2as	cltenantdefault0000000000	Игнатьев	Игнатьев	\N	\N	\N	\N	\N	\N	\N	89111509773	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.679	\N
cmnnoyi0o00g4tjxwmfnwgmnz	cltenantdefault0000000000	Игнатьева	Игнатьева	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.328	\N
cmnnoyf71003mtjxwq9x4ig0f	cltenantdefault0000000000	Игнатьева Наталья Александровна	Игнатьева	Наталья	Александровна	\N	\N	\N	\N	\N	8 921 556 2911	Telegram	nataliiii79	\N	\N	f	f	\N	2026-04-06 21:17:22.67	\N
cmnnoyf77003ntjxwnen9166q	cltenantdefault0000000000	Ильдаров Дмитрий Темирланович	Ильдаров	Дмитрий	Темирланович	\N	\N	\N	\N	\N	8 938 307 4284	Telegram	dimaildarov	\N	\N	f	f	\N	2026-04-06 21:17:22.675	\N
cmnnoyf7c003otjxwmv8fhsuf	cltenantdefault0000000000	Ильина Александра Игоревна	Ильина	Александра	Игоревна	\N	\N	\N	\N	\N	8 921 391 7879	Telegram	aleksandrail	\N	\N	f	f	\N	2026-04-06 21:17:22.681	\N
cmnnoyhe800bntjxwmrnlogd0	cltenantdefault0000000000	Илюк Регина	Илюк	Регина	\N	\N	\N	\N	\N	\N	7 931 002 9111	Telegram	re_stom	\N	\N	f	f	\N	2026-04-06 21:17:25.521	\N
cmnnoyhgc00c1tjxwtu3hmfdk	cltenantdefault0000000000	Ирхина	Ирхина	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.596	\N
cmnnoyf7i003ptjxwu5zptfyn	cltenantdefault0000000000	Исмаилов Мухаммед Камильевич	Исмаилов	Мухаммед	Камильевич	\N	\N	\N	\N	\N	8 906 244 9994	Telegram	скрыт	\N	\N	f	f	\N	2026-04-06 21:17:22.687	\N
cmnnoyi0s00g5tjxw7nni5wci	cltenantdefault0000000000	Романов	Романов	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.332	\N
cmnnoyf7o003qtjxwvz4njndl	cltenantdefault0000000000	Исхакова Галия Илдусовна	Исхакова	Галия	Илдусовна	\N	\N	\N	\N	\N	8 950 036 39 34	Telegram	iskhakova_galia	\N	\N	f	f	\N	2026-04-06 21:17:22.693	\N
cmnnoyf7s003rtjxw5aessdtz	cltenantdefault0000000000	Калайчев	Калайчев	\N	\N	\N	\N	\N	\N	\N	\N	Telegram	Alexns93	\N	\N	f	f	\N	2026-04-06 21:17:22.696	\N
cmnnoyhwo00f9tjxwwtdkoaj5	cltenantdefault0000000000	Калашникова	Калашникова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.185	\N
cmnnoyhv200eutjxw6pxr6kzb	cltenantdefault0000000000	Калинина	Калинина	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.127	\N
cmnnoyf7x003stjxwwrjpjxyv	cltenantdefault0000000000	Камардин Антон Олегович	Камардин	Антон	Олегович	\N	\N	\N	\N	\N	скрыт	Telegram	скрыт	\N	\N	f	f	\N	2026-04-06 21:17:22.702	\N
cmnnoyhwh00f7tjxwadwxr861	cltenantdefault0000000000	Канунникова	Канунникова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.177	\N
cmnnoyf83003ttjxwylxstqut	cltenantdefault0000000000	Караванова Ирина Николаевна	Караванова	Ирина	Николаевна	\N	\N	\N	\N	\N	8 903 806 6356	Telegram	скрыт	\N	\N	f	f	\N	2026-04-06 21:17:22.708	\N
cmnnoyhnk00ddtjxw8b4rzb75	cltenantdefault0000000000	Карапетян Елена Айковна	Карапетян	Елена	Айковна	\N	\N	\N	\N	\N	79110857343	Telegram	karapetyanhelen)	\N	\N	f	f	\N	2026-04-06 21:17:25.856	\N
cmnnoyf87003utjxwgn6ybuv0	cltenantdefault0000000000	Караханова	Караханова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.711	\N
cmnnoyf8d003vtjxwcujxz25q	cltenantdefault0000000000	Каретин Михаил Александрович	Каретин	Михаил	Александрович	\N	\N	\N	\N	\N	8 911 036 8229	Telegram	DocKaret	\N	\N	f	f	\N	2026-04-06 21:17:22.717	\N
cmnnoyhb100b5tjxwiiwiij79	cltenantdefault0000000000	Карпушов Илья Михайлович	Карпушов	Илья	Михайлович	\N	ортопед	\N	dkim-13@yandex.ru	dkim-13@yandex.ru	7 987 662 1530	Telegram	dr_kim_orthoss	\N	\N	f	f	\N	2026-04-06 21:17:25.405	\N
cmnnoyf8j003wtjxwablavroj	cltenantdefault0000000000	Карюкина Евгения Игоревна	Карюкина	Евгения	Игоревна	\N	\N	\N	\N	\N	8 911 299 1142	Telegram	Evgeniia_Igorevna	\N	\N	f	f	\N	2026-04-06 21:17:22.723	\N
cmnnoyf8o003xtjxwg5jjyezf	cltenantdefault0000000000	Касаткина Анна Владимировна	Касаткина	Анна	Владимировна	\N	\N	\N	\N	\N	скрыт	Telegram	скрыт	\N	\N	f	f	\N	2026-04-06 21:17:22.729	\N
cmnnoyf8t003ytjxw31wsf9rb	cltenantdefault0000000000	Касимова Нодира Давлатовна	Касимова	Нодира	Давлатовна	\N	\N	\N	\N	\N	скрыт	Telegram	nodirakasimova	\N	\N	f	f	\N	2026-04-06 21:17:22.734	\N
cmnnoyf90003ztjxwv77jn362	cltenantdefault0000000000	Квирквелия Леван Давидович	Квирквелия	Леван	Давидович	\N	\N	\N	\N	\N	8 911 927 58 58	Telegram	скрыт	\N	\N	f	f	\N	2026-04-06 21:17:22.74	\N
cmnnoyf950040tjxwgikikfbj	cltenantdefault0000000000	Кинович Павел Сергеевич	Кинович	Павел	Сергеевич	\N	\N	\N	\N	\N	8 981 833 19 96	Telegram	pavelkinovich	\N	\N	f	f	\N	2026-04-06 21:17:22.746	\N
cmnnoyf9b0041tjxwo3vw94hv	cltenantdefault0000000000	Кирьянов Алексей Александрович	Кирьянов	Алексей	Александрович	\N	\N	\N	\N	\N	8 951 668 8200	Telegram	Aleks_dent	\N	\N	f	f	\N	2026-04-06 21:17:22.751	\N
cmnnoyf9h0042tjxwd16hvl33	cltenantdefault0000000000	Киселев Алексей Витальевич	Киселев	Алексей	Витальевич	\N	ортодонт	\N	av.kiselev93@yandex.ru	\N	8 965 764 5077	Telegram	kiselev_ortho	\N	\N	f	f	\N	2026-04-06 21:17:22.757	\N
cmnnoyf9r0043tjxw5hnrxr5j	cltenantdefault0000000000	Кислова Юлия Львовна	Кислова	Юлия	Львовна	\N	\N	\N	julvovna@gmail.com	\N	8 999 027 5336	Telegram	Julvovna	\N	\N	f	f	\N	2026-04-06 21:17:22.768	\N
cmnnoyf9x0044tjxwvnw8gsjm	cltenantdefault0000000000	Кнутова Екатерина Алексеевна	Кнутова	Екатерина	Алексеевна	\N	\N	\N	\N	\N	скрыт	Telegram	rinakamuru	\N	\N	f	f	\N	2026-04-06 21:17:22.773	\N
cmnnoyhdf00bitjxwnbgxad03	cltenantdefault0000000000	Князькова Екатерина Романовна	Князькова	Екатерина	Романовна	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.492	\N
cmnnoyfa30045tjxw1fv6j9r9	cltenantdefault0000000000	Кобалия Вильсон Мерабович	Кобалия	Вильсон	Мерабович	\N	\N	\N	\N	\N	8 921 986 9534	Telegram	Vilson_Kobaliya	\N	\N	f	f	\N	2026-04-06 21:17:22.779	\N
cmnnoyfa90046tjxwstvkohqi	cltenantdefault0000000000	Кобелева	Кобелева	\N	\N	\N	\N	\N	\N	\N	8 992 203 0779	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.786	\N
cmnnoyfag0047tjxw26labemd	cltenantdefault0000000000	Кобзева Светлана Алексеевна	Кобзева	Светлана	Алексеевна	\N	\N	\N	\N	\N	8 911 799 5281	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.793	\N
cmnnoyhyw00fstjxwlsym2vpo	cltenantdefault0000000000	Ковалевский	Ковалевский	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.265	\N
cmnnoyhm000d1tjxwfdbisj64	cltenantdefault0000000000	Коваленко	Коваленко	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.8	\N
cmnnoyfam0048tjxwci9hznqi	cltenantdefault0000000000	Ковтун Елизавета	Ковтун	Елизавета	\N	\N	\N	\N	\N	\N	\N	Telegram	ignispella	\N	\N	f	f	\N	2026-04-06 21:17:22.798	\N
cmnnoyhxd00fftjxwh34y23zu	cltenantdefault0000000000	Кожакин	Кожакин	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.21	\N
cmnnoyfas0049tjxw0ta787xq	cltenantdefault0000000000	Кожедуб Владислав Сергеевич	Кожедуб	Владислав	Сергеевич	\N	\N	\N	\N	\N	8 913 632 5353	Telegram	DemiaJa	\N	\N	f	f	\N	2026-04-06 21:17:22.804	\N
cmnnoyfax004atjxw04hj5ebr	cltenantdefault0000000000	Колбая Кэтино	Колбая	Кэтино	\N	\N	\N	\N	\N	\N	8 929 116 7685	Telegram	Ketygram	\N	\N	f	f	\N	2026-04-06 21:17:22.81	\N
cmnnoyfb4004btjxwv1dyfdlj	cltenantdefault0000000000	Колесников Дмитрий Александрович	Колесников	Дмитрий	Александрович	\N	ортопед	\N	\N	\N	8 981 680 9314	Telegram	kold90	\N	\N	f	f	\N	2026-04-06 21:17:22.816	\N
cmnnoyfbg004ctjxwgfpul1m6	cltenantdefault0000000000	Колесников Эмиль Александрович	Колесников	Эмиль	Александрович	\N	ортопед	\N	\N	\N	8 920 348 4666	Telegram	Emil_Kolesnikov	\N	\N	f	f	\N	2026-04-06 21:17:22.829	\N
cmnnoyfbp004dtjxwk5itzmk9	cltenantdefault0000000000	Колибаба	Колибаба	\N	\N	\N	\N	\N	\N	\N	8 921 883 2571	Telegram	kolibabalex	\N	\N	f	f	\N	2026-04-06 21:17:22.837	\N
cmnnoyfbv004etjxw9k48vym6	cltenantdefault0000000000	Коломыцева Ксения Алексеевна	Коломыцева	Ксения	Алексеевна	\N	\N	\N	kolomytseva.orto@mail.ru	\N	8 951 869 9555	Telegram	https://t.me/pandoramalaya	\N	\N	f	f	\N	2026-04-06 21:17:22.843	\N
cmnnoyfc4004ftjxw1wtya5hl	cltenantdefault0000000000	Комаров Виталий Александрович	Комаров	Виталий	Александрович	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.853	\N
cmnnoyhcc00bctjxw6btet8wp	cltenantdefault0000000000	Комарова Мария Сергеевна	Комарова	Мария	Сергеевна	\N	\N	\N	\N	\N	8(953)-566-11-40	Telegram	KomarovaOrtho	\N	\N	f	f	\N	2026-04-06 21:17:25.452	\N
cmnnoyfca004gtjxw1qr18r0a	cltenantdefault0000000000	Комиссарова Ольга Владимировна	Комиссарова	Ольга	Владимировна	\N	\N	\N	\N	\N	8 911 234 0519	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.859	\N
cmnnoyfcg004htjxw3pd5y9n1	cltenantdefault0000000000	Коновалов Евгений	Коновалов	Евгений	\N	\N	\N	\N	\N	\N	8 958 178 1193	Telegram	jackhorsefall	\N	\N	f	f	\N	2026-04-06 21:17:22.864	\N
cmnnoyfcm004itjxwiwmttei7	cltenantdefault0000000000	Контребуц Мария Сергеевна	Контребуц	Мария	Сергеевна	\N	\N	\N	\N	\N	8 960 281 5131	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.87	\N
cmnnoyfct004jtjxw3tg8ufn2	cltenantdefault0000000000	Кончаковский Александр Владимирович	Кончаковский	Александр	Владимирович	\N	\N	\N	\N	\N	8 921 960 3916	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.878	\N
cmnnoyfcz004ktjxwcprn6kdi	cltenantdefault0000000000	Копалов Антон Вячеславович	Копалов	Антон	Вячеславович	\N	\N	\N	\N	\N	\N	Telegram	foxjan	\N	\N	f	f	\N	2026-04-06 21:17:22.883	\N
cmnnoyfd5004ltjxwlapm8gg4	cltenantdefault0000000000	Корепова Анна Алексеевна	Корепова	Анна	Алексеевна	\N	\N	\N	\N	\N	8 981 432 5960	Telegram	Dr_Korepova	\N	\N	f	f	\N	2026-04-06 21:17:22.889	\N
cmnnoyfdg004mtjxwr4dvmdu9	cltenantdefault0000000000	Корнилова Ксения	Корнилова	Ксения	\N	\N	ортодонт	\N	\N	\N	7 911 215 4446	Telegram	ksenykat	\N	\N	f	f	\N	2026-04-06 21:17:22.901	\N
cmnnoyfdm004ntjxw2ddvoz4o	cltenantdefault0000000000	Коробко Михаил Сергеевич	Коробко	Михаил	Сергеевич	\N	\N	\N	\N	\N	8 925 144 5428	Telegram	DrKorobkoM	\N	\N	f	f	\N	2026-04-06 21:17:22.907	\N
cmnnoyi1100g7tjxwdnk2s7is	cltenantdefault0000000000	Косова	Косова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.341	\N
cmnnoyfdy004ptjxwti10ic5h	cltenantdefault0000000000	Костюченко Ксения Денисовна	Костюченко	Ксения	Денисовна	\N	ортодонт	\N	\N	\N	8 999 229 2515	Telegram	drkostyuchenko	\N	\N	f	f	\N	2026-04-06 21:17:22.918	\N
cmnnoyfed004qtjxw3l0g4u3z	cltenantdefault0000000000	Кочегарова Валентина Валерьевна	Кочегарова	Валентина	Валерьевна	\N	\N	\N	\N	\N	8 923 489 0695	Telegram	Walentina0830	\N	\N	f	f	\N	2026-04-06 21:17:22.933	\N
cmnnoyfek004rtjxwtz15f0q9	cltenantdefault0000000000	Кощенко Андрей Михайлович	Кощенко	Андрей	Михайлович	\N	\N	\N	dj-melon@mail.ru	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.94	\N
cmnnoyfew004stjxwdvknqe1n	cltenantdefault0000000000	Кощенко Юлия Александровна	Кощенко	Юлия	Александровна	\N	\N	\N	\N	\N	8 921 376 1923	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:22.952	\N
cmnnoyff6004ttjxwn5ytfnsn	cltenantdefault0000000000	Кравченко Павел Сергеевич	Кравченко	Павел	Сергеевич	\N	ортодонт	\N	\N	\N	8 938 109 3325	Telegram	orto_pash_ok	\N	\N	f	f	\N	2026-04-06 21:17:22.963	\N
cmnnoyffi004utjxwc2txwi1o	cltenantdefault0000000000	Крайнова Александра Григорьевна	Крайнова	Александра	Григорьевна	\N	\N	\N	\N	\N	8 911 097 4843	Telegram	Zuboteh666	\N	\N	f	f	\N	2026-04-06 21:17:22.975	\N
cmnnoyffp004vtjxw176kxiaq	cltenantdefault0000000000	Красавина Анастасия Владимировна	Красавина	Анастасия	Владимировна	\N	ортодонт	\N	\N	\N	8 981 735 5272	Telegram	anastasiakrasaa	\N	\N	f	f	\N	2026-04-06 21:17:22.982	\N
cmnnoyfg0004wtjxwukv62ijs	cltenantdefault0000000000	Крестелева Ирина Николаевна	Крестелева	Ирина	Николаевна	\N	ортодонт	\N	\N	\N	8 918 793 5516	Telegram	kresteleva_i	\N	\N	f	f	\N	2026-04-06 21:17:22.993	\N
cmnnoyfgb004xtjxwog3rjvxo	cltenantdefault0000000000	Кривдина Юлия Андреевна	Кривдина	Юлия	Андреевна	\N	ортопед	\N	\N	\N	8 911 709 7333	Telegram	ykrivdina	\N	\N	f	f	\N	2026-04-06 21:17:23.003	\N
cmnnoyfgn004ytjxww3hn4eqe	cltenantdefault0000000000	Кристат Ирина Владимировна	Кристат	Ирина	Владимировна	\N	ортодонт	\N	kristat.irina@yandex.ru	\N	8 921 951 2883	Telegram	drkristat	\N	\N	f	f	\N	2026-04-06 21:17:23.015	\N
cmnnoyfgy004ztjxwq1szqqms	cltenantdefault0000000000	Ксенофонтов Алексей Павлович	Ксенофонтов	Алексей	Павлович	\N	ортопед	\N	\N	\N	8 906 268 4803	Telegram	Alekskse	\N	\N	f	f	\N	2026-04-06 21:17:23.027	\N
cmnnoyfh90050tjxwaxy8ymwb	cltenantdefault0000000000	Кузмицкая Алеся Леонидовна	Кузмицкая	Алеся	Леонидовна	\N	ортодонт	\N	\N	\N	8 921 903 2312	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.037	\N
cmnnoyfhj0051tjxwzu90q21h	cltenantdefault0000000000	Кузнецов Евгений Александрович	Кузнецов	Евгений	Александрович	\N	ортопед	\N	\N	\N	8 921 554 9505	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.048	\N
cmnnoyfhu0052tjxwrfglmqo2	cltenantdefault0000000000	Кузнецова Вероника Константиновна	Кузнецова	Вероника	Константиновна	\N	ортодонт	\N	\N	\N	8 904 771 9661	Telegram	Veronika_hairlines	\N	\N	f	f	\N	2026-04-06 21:17:23.058	\N
cmnnoyhjw00cotjxw9ccbo4s7	cltenantdefault0000000000	Кузнецова Татия	Кузнецова	Татия	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.725	\N
cmnnoyhzu00g0tjxwpohj6xxh	cltenantdefault0000000000	Кузьмин	Кузьмин	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.299	\N
cmnnoyhsb00ebtjxwsav6rz25	cltenantdefault0000000000	Кукушкин	Кукушкин	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.028	\N
cmnnoyfi40053tjxwss7bd3sb	cltenantdefault0000000000	Кулагин Александр Владимирович	Кулагин	Александр	Владимирович	\N	ортопед	\N	\N	\N	8 921 334 2981	Telegram	drKulagin	\N	\N	f	f	\N	2026-04-06 21:17:23.068	\N
cmnnoyhtn00eltjxwtjtcnzmy	cltenantdefault0000000000	Куприянова	Куприянова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.075	\N
cmnnoyfie0054tjxw6tsyhhzn	cltenantdefault0000000000	Курданова Джамиля Юсуфовна	Курданова	Джамиля	Юсуфовна	\N	ортодонт	\N	\N	\N	8 921 428 3861	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.079	\N
cmnnoyfip0055tjxw68ozpa7j	cltenantdefault0000000000	Куренной Сергей Валерьевич	Куренной	Сергей	Валерьевич	\N	ортопед	\N	\N	\N	8 931 530 2628	Telegram	Spbstom_178	\N	\N	f	f	\N	2026-04-06 21:17:23.089	\N
cmnnoyfj00056tjxws263o2kt	cltenantdefault0000000000	Курмаева Татьяна Андреевна	Курмаева	Татьяна	Андреевна	\N	ортодонт	\N	\N	\N	8 921 871 9073	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.101	\N
cmnnoyfjc0057tjxwdeh7291p	cltenantdefault0000000000	Курчанинова Марина Геннадиевна	Курчанинова	Марина	Геннадиевна	\N	ортодонт	\N	\N	\N	8 903 632 3412	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.112	\N
cmnnoyfjl0058tjxw56ssge84	cltenantdefault0000000000	Кучкаров Шохзод Суратович	Кучкаров	Шохзод	Суратович	\N	ортопед, гнатолог	\N	dr.kuchkarov@yandex.ru	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.122	\N
cmnnoyfjx0059tjxwk7tx2kdx	cltenantdefault0000000000	Кущенко Николай Викторович	Кущенко	Николай	Викторович	\N	ортопед, гнатолог	\N	\N	\N	8 931 244 6448	Telegram	Nikolaiknv	\N	\N	f	f	\N	2026-04-06 21:17:23.133	\N
cmnnoyhi500cctjxwlk470p0r	cltenantdefault0000000000	Кычакова Валерия Алексеевна	Кычакова	Валерия	Алексеевна	\N	\N	\N	\N	\N	89388696727,	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.662	\N
cmnnoyfk8005atjxw969v6ixa	cltenantdefault0000000000	Кюлян Эдуард Ншанович	Кюлян	Эдуард	Ншанович	\N	ортопед, гнатолог	\N	kulyan_eduard@mail.ru	\N	скрыт	Telegram	скрыт	\N	\N	f	f	\N	2026-04-06 21:17:23.144	\N
cmnnoyfki005btjxwi4jshicy	cltenantdefault0000000000	Лавникевич Ксения Михайловна	Лавникевич	Ксения	Михайловна	\N	ортодонт	\N	ksenia.lavnikevich@konfidencia.ru	\N	8 911 961 6445	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.154	\N
cmnnoyhvp00f0tjxwtfkw0kbr	cltenantdefault0000000000	Лавренчук	Лавренчук	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.15	\N
cmnnoyfks005ctjxwsjy3vfy8	cltenantdefault0000000000	Левина Ирина Андреевна	Левина	Ирина	Андреевна	\N	ортодонт	\N	\N	\N	8 921 550 2215	Telegram	Toffe_e	\N	\N	f	f	\N	2026-04-06 21:17:23.164	\N
cmnnoyfl1005dtjxwt73pplzm	cltenantdefault0000000000	Левуцкий Александр Евгеньевич	Левуцкий	Александр	Евгеньевич	\N	\N	\N	\N	\N	8 999 513 2107	Telegram	darkedee	\N	\N	f	f	\N	2026-04-06 21:17:23.174	\N
cmnnoyfl7005etjxwp031awjy	cltenantdefault0000000000	Леонтьева Алена Владимировна	Леонтьева	Алена	Владимировна	\N	\N	\N	\N	\N	8 900 632 3322	Telegram	Lavlady	\N	\N	f	f	\N	2026-04-06 21:17:23.18	\N
cmnnoyfln005gtjxwsig2dqql	cltenantdefault0000000000	Линников Алексей Владимирович	Линников	Алексей	Владимирович	\N	ортопед	\N	\N	\N	8 905 252 5652	Telegram	aleks_lin	\N	\N	f	f	\N	2026-04-06 21:17:23.195	\N
cmnnoyflv005htjxwy4rahmd4	cltenantdefault0000000000	Литвинов Павел Николаевич	Литвинов	Павел	Николаевич	\N	ортопед	\N	\N	\N	поискать в почте	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.204	\N
cmnnoyfm7005itjxwo106exnp	cltenantdefault0000000000	Литвинова Анна Павловна	Литвинова	Анна	Павловна	\N	ортопед	\N	\N	\N	8 905 214 2149	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.215	\N
cmnnoyfmh005jtjxwhypk9i8w	cltenantdefault0000000000	Литовченко Юлия Петровна	Литовченко	Юлия	Петровна	Шевелева	ортодонт	\N	\N	\N	79117684218	Telegram	yu_litovchenko	\N	\N	f	f	\N	2026-04-06 21:17:23.225	\N
cmnnoyhz900fvtjxw9q0zt0op	cltenantdefault0000000000	Лобачева	Лобачева	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.277	\N
cmnnoyfmq005ktjxwr1td4f8o	cltenantdefault0000000000	Лобов Алексей Александрович	Лобов	Алексей	Александрович	\N	ортодонт, гнатолог	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.234	\N
cmnnoyfn0005ltjxw40ueo0e5	cltenantdefault0000000000	Лойберг Эдвард Игоревич	Лойберг	Эдвард	Игоревич	\N	ортопед	\N	dr@loiberg.ru	\N	8 911 141 13 78	Telegram	drloiberg	\N	\N	f	f	\N	2026-04-06 21:17:23.245	\N
cmnnoyfnb005mtjxw9c7ehivn	cltenantdefault0000000000	Ломачинский Владимир Валерьевич	Ломачинский	Владимир	Валерьевич	\N	ортопед, хирург	\N	\N	\N	8 921 598 2792	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.255	\N
cmnnoyfnh005ntjxwmt1lsizn	cltenantdefault0000000000	Лубкин Павел Викторович	Лубкин	Павел	Викторович	\N	ортопед	\N	\N	\N	89522418406	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.262	\N
cmnnoyfns005otjxwe8w6rp0s	cltenantdefault0000000000	Лубская Екатерина Юрьевна	Лубская	Екатерина	Юрьевна	\N	ортопед	\N	lubskaya.k@yandex.ru	\N	8 921 933 4715	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.273	\N
cmnnoyfny005ptjxweht202wz	cltenantdefault0000000000	Луговская Екатерина Сергеевна	Луговская	Екатерина	Сергеевна	\N	ортодонт	\N	\N	\N	8 921 755 3673	Telegram	lugcatalina	\N	\N	f	f	\N	2026-04-06 21:17:23.279	\N
cmnnoyfoa005qtjxweg6hxaiy	cltenantdefault0000000000	Лукина Анастасия Александровна	Лукина	Анастасия	Александровна	\N	ортодонт	\N	\N	\N	79119838934	Telegram	lukinaana	\N	\N	f	f	\N	2026-04-06 21:17:23.29	\N
cmnnoyfog005rtjxw0ym7dq6d	cltenantdefault0000000000	Лукьяненко Артур Викторович	Лукьяненко	Артур	Викторович	\N	ортопед	\N	[object Object]	\N	79112672151	Telegram	Artur_Lukyanenko	\N	\N	f	f	\N	2026-04-06 21:17:23.296	\N
cmnnoyfos005stjxwj4jacvtt	cltenantdefault0000000000	Любченко Любовь Олеговна	Любченко	Любовь	Олеговна	\N	ортопед	\N	\N	\N	8 921 557 2385	Telegram	dr_liubov_liubchenko	\N	\N	f	f	\N	2026-04-06 21:17:23.308	\N
cmnnoyfp7005ttjxw4ftb66xw	cltenantdefault0000000000	Ляпина Екатерина Павловна	Ляпина	Екатерина	Павловна	\N	ортодонт	\N	\N	\N	39 347 089 8709	Telegram	lyapinaekat	\N	\N	f	f	\N	2026-04-06 21:17:23.324	\N
cmnnoyhq500dvtjxwvu7wh9k2	cltenantdefault0000000000	Ляхов Геннадий Олегович	Ляхов	Геннадий	Олегович	\N	\N	\N	\N	\N	89110090749	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.95	\N
cmnnoyfpi005utjxwgh6hlld1	cltenantdefault0000000000	Магомадов Ильяс Виситович	Магомадов	Ильяс	Виситович	\N	ортодонт	\N	dr.cheil@mail.ru	\N	\N	Telegram	cheil	\N	\N	f	f	\N	2026-04-06 21:17:23.335	\N
cmnnoyfpv005vtjxwhvnkqx1m	cltenantdefault0000000000	Магомедов Насрулла Алиевич	Магомедов	Насрулла	Алиевич	\N	ортопед, хирург	\N	\N	\N	79213603934	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.347	\N
cmnnoyfq6005wtjxwoap2jjzs	cltenantdefault0000000000	Магомедова Мадина Абдулразаковна	Магомедова	Мадина	Абдулразаковна	\N	ортодонт	\N	\N	\N	79213062660	Telegram	madinaortho	\N	\N	f	f	\N	2026-04-06 21:17:23.358	\N
cmnnoyfqh005xtjxwdd6soctv	cltenantdefault0000000000	Мазурина Анастасия Юрьевна	Мазурина	Анастасия	Юрьевна	\N	ортодонт	\N	\N	\N	79112793702	Telegram	dr_mazurina	\N	\N	f	f	\N	2026-04-06 21:17:23.369	\N
cmnnoyhfv00bytjxwemuxph4g	cltenantdefault0000000000	Максимова Виктория Владимировна	Максимова	Виктория	Владимировна	\N	\N	\N	\N	\N	89996697417	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.579	\N
cmnnoyhg200bztjxw5jswmix7	cltenantdefault0000000000	Максимова Елена Юрьевна	Максимова	Елена	Юрьевна	\N	\N	\N	\N	\N	89180293155	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.586	\N
cmnnoyhbz00batjxwkbtl5hfc	cltenantdefault0000000000	Максимова Регина Зуфаровна	Максимова	Регина	Зуфаровна	\N	\N	\N	\N	\N	\N	Telegram	reginarish	\N	\N	f	f	\N	2026-04-06 21:17:25.439	\N
cmnnoyfqs005ytjxwnm199f2e	cltenantdefault0000000000	Малафеевская Татьяна Олеговна	Малафеевская	Татьяна	Олеговна	\N	ортодонт	\N	\N	\N	8 921 874 1031	Telegram	tanyamalaf	\N	\N	f	f	\N	2026-04-06 21:17:23.381	\N
cmnnoyfrg0060tjxw1wd2rfwm	cltenantdefault0000000000	Малахова Наталья Евгеньевна	Малахова	Наталья	Евгеньевна	\N	ортодонт	\N	\N	\N	79219979279	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.404	\N
cmnnoyfrn0061tjxwyhll73jv	cltenantdefault0000000000	Малхасьян Стелла Гургеновна	Малхасьян	Стелла	Гургеновна	\N	ортодонт	\N	\N	\N	8 965 038 3038	Telegram	dr_smile0710	\N	\N	f	f	\N	2026-04-06 21:17:23.411	\N
cmnnoyhos00dmtjxw0vlmfhvw	cltenantdefault0000000000	Малько Наталья Павловна	Малько	Наталья	Павловна	\N	\N	\N	\N	\N	79119009063	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.901	\N
cmnnoyfrz0062tjxw0qxeciq9	cltenantdefault0000000000	Мамаева Софья Александровна	Мамаева	Софья	Александровна	\N	ортодонт, гнатолог	\N	\N	\N	8 981 832 1644	Telegram	sofia_mamaeva	\N	\N	f	f	\N	2026-04-06 21:17:23.424	\N
cmnnoyfsd0063tjxwt06766jv	cltenantdefault0000000000	Мануйлов Роман Алексеевич	Мануйлов	Роман	Алексеевич	\N	техник	\N	\N	\N	8 999 630 1789	Telegram	rasdwa666	\N	\N	f	f	\N	2026-04-06 21:17:23.437	\N
cmnnoyhj200citjxwiqnk0p3f	cltenantdefault0000000000	Марухно Дарья Александровна	Марухно	Дарья	Александровна	\N	\N	\N	\N	\N	89502241188	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.694	\N
cmnnoyfsl0064tjxw01348f5l	cltenantdefault0000000000	Матасова Анна Александровна	Матасова	Анна	Александровна	\N	ортодонт	\N	\N	\N	79827008104	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.445	\N
cmnnoyhvl00eztjxw5lxvhf46	cltenantdefault0000000000	Матвеева	Матвеева	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.145	\N
cmnnoyfsx0065tjxwow3ih04z	cltenantdefault0000000000	Махонина Мария Сергеевна	Махонина	Мария	Сергеевна	\N	ортодонт	\N	\N	\N	79313480918	Telegram	mariimkh	\N	\N	f	f	\N	2026-04-06 21:17:23.458	\N
cmnnoyhys00frtjxw5s42k2z7	cltenantdefault0000000000	Медведев Роман Викторович	Медведев	Роман	Викторович	\N	\N	\N	\N	\N	79817246167	Telegram	Dr_Zoob	\N	\N	f	f	\N	2026-04-06 21:17:26.261	\N
cmnnoyhxu00fjtjxwahjonl1n	cltenantdefault0000000000	Мелков	Мелков	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.226	\N
cmnnoyhxx00fktjxwko3njwtv	cltenantdefault0000000000	Мешалкина	Мешалкина	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.23	\N
cmnnoyhdm00bjtjxwu6rbukcs	cltenantdefault0000000000	Мизин Даниил Игоревич	Мизин	Даниил	Игоревич	\N	\N	\N	\N	\N	+7 981 121 3005	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.499	\N
cmnnoyfta0066tjxwfef0v2ix	cltenantdefault0000000000	Минасян Армен	Минасян	Армен	\N	\N	ортопед, гнатолог	\N	\N	\N	8 959 201  2011	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.471	\N
cmnnoyhwu00fatjxwbi0g16p5	cltenantdefault0000000000	Мирбакиев	Мирбакиев	\N	\N	\N	\N	\N	\N	\N	79213827922	Telegram	DilmuratM	\N	\N	f	f	\N	2026-04-06 21:17:26.19	\N
cmnnoyfti0067tjxwttcpomun	cltenantdefault0000000000	Мирзоян Виолетта Вячеславовна	Мирзоян	Виолетта	Вячеславовна	\N	ортодонт	\N	\N	\N	8 911 825 4912	Telegram	violettamirzoyan	\N	\N	f	f	\N	2026-04-06 21:17:23.479	\N
cmnnoyftw0068tjxwuker1bny	cltenantdefault0000000000	Миронова Евгения	Миронова	Евгения	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.493	\N
cmnnoyfu90069tjxwvloh46af	cltenantdefault0000000000	Михайлова Марина Александровна	Михайлова	Марина	Александровна	\N	ортодонт	\N	\N	\N	8 981 734 7716	Telegram	marmish05	\N	\N	f	f	\N	2026-04-06 21:17:23.505	\N
cmnnoyfug006atjxwt2ilgggm	cltenantdefault0000000000	Мичкова Эрика Павловна	Мичкова	Эрика	Павловна	\N	ортодонт, гнатолог	\N	\N	\N	79650453836	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.513	\N
cmnnoyfus006btjxwktl89urn	cltenantdefault0000000000	Мишина Юлия Петровна	Мишина	Юлия	Петровна	\N	\N	\N	\N	\N	8 931 964 2869	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.525	\N
cmnnoyfuz006ctjxw1ds3urli	cltenantdefault0000000000	Можаитин Максим Алесандрович	Можаитин	Максим	Алесандрович	\N	ортопед	\N	\N	\N	8 915 560 5437	Telegram	mozhaitin_maxim	\N	\N	f	f	\N	2026-04-06 21:17:23.531	\N
cmnnoyfva006dtjxw1b4k26vk	cltenantdefault0000000000	Можина Александра Евгеньевна	Можина	Александра	Евгеньевна	\N	ортодонт	\N	\N	\N	79111677177	Telegram	mozhina_s	\N	\N	f	f	\N	2026-04-06 21:17:23.542	\N
cmnnoyfvm006etjxwtnlqpzi2	cltenantdefault0000000000	Молчанова Мария Сергеевна	Молчанова	Мария	Сергеевна	\N	ортодонт	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.554	\N
cmnnoyfvx006ftjxwxc3fz1km	cltenantdefault0000000000	Морозов Михаил Сергеевич	Морозов	Михаил	Сергеевич	\N	ортодонт	\N	\N	\N	8 909 588 8322	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.565	\N
cmnnoyhmm00d6tjxwp8evie8s	cltenantdefault0000000000	Морозова	Морозова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.822	\N
cmnnoyfw8006gtjxwoq38do8b	cltenantdefault0000000000	Мочалова Галина Игоревна	Мочалова	Галина	Игоревна	\N	ортодонт	\N	\N	\N	8 905 233 5060	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.576	\N
cmnnoyhxq00fitjxwi1xc36rz	cltenantdefault0000000000	Мугдиев	Мугдиев	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.223	\N
cmnnoyfwj006htjxwholb1gtd	cltenantdefault0000000000	Мунчава Рональд Малхазович	Мунчава	Рональд	Малхазович	\N	ортопед	\N	\N	\N	8 921 777 9012	Telegram	Dr.ronald_munchava	\N	\N	f	f	\N	2026-04-06 21:17:23.587	\N
cmnnoyfwz006itjxwpjrg9nry	cltenantdefault0000000000	Мурадов Самир Рамазанович	Мурадов	Самир	Рамазанович	\N	ортопед	\N	\N	\N	79291183949	Telegram	Sam_Stoma	\N	\N	f	f	\N	2026-04-06 21:17:23.603	\N
cmnnoyhzq00fztjxwb6piawkn	cltenantdefault0000000000	Мурадова	Мурадова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.295	\N
cmnnoyhuy00ettjxwcge5t2fb	cltenantdefault0000000000	Мурзина	Мурзина	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.122	\N
cmnnoyfxf006jtjxwzxteh79g	cltenantdefault0000000000	Мусаев Курбан-Исмаил Курбанович	Мусаев	Курбан-Исмаил	Курбанович	\N	хирург, ортопед	\N	\N	\N	8 917 326 8769	Telegram	mussv2I	\N	\N	f	f	\N	2026-04-06 21:17:23.619	\N
cmnnoyhpa00dqtjxwi2klksl4	cltenantdefault0000000000	Мухлиханов	Мухлиханов	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.919	\N
cmnnoyfxz006ktjxwpjlafva8	cltenantdefault0000000000	Мхитарян Лиана Гариковна	Мхитарян	Лиана	Гариковна	\N	ортодонт	\N	\N	\N	79217671926	Telegram	Liana_ortho	\N	\N	f	f	\N	2026-04-06 21:17:23.639	\N
cmnnoyhpo00dstjxwi29q91ue	cltenantdefault0000000000	Нагулаева Аюна Олеговна	Нагулаева	Аюна	Олеговна	\N	\N	\N	\N	\N	8950 0029227	Telegram	Ayuna_NO	\N	\N	f	f	\N	2026-04-06 21:17:25.932	\N
cmnnoyhlg00cxtjxwuct2rumh	cltenantdefault0000000000	Найданова Ирина Санжимитуповна	Найданова	Ирина	Санжимитуповна	\N	\N	\N	\N	\N	79211854448	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.78	\N
cmnnoyhoa00ditjxw9kydnhqj	cltenantdefault0000000000	Насибуллина	Насибуллина	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.883	\N
cmnnoyfye006ltjxwtdacsrpe	cltenantdefault0000000000	Науменко Георгий Владимирович	Науменко	Георгий	Владимирович	\N	хирург	\N	\N	\N	79627179394	Telegram	dr_NaumenkoGV	\N	\N	f	f	\N	2026-04-06 21:17:23.655	\N
cmnnoyfyr006mtjxwm3x3phbh	cltenantdefault0000000000	Наумова Елена Александровна	Наумова	Елена	Александровна	\N	ортодонт	\N	\N	\N	79119063700	Telegram	klappar	\N	\N	f	f	\N	2026-04-06 21:17:23.667	\N
cmnnoyfz3006ntjxwbhjpo2ha	cltenantdefault0000000000	Невский Денис Дмитриевич	Невский	Денис	Дмитриевич	\N	ортопед	\N	\N	\N	79279095520	Telegram	Denis_Nevskiy	\N	\N	f	f	\N	2026-04-06 21:17:23.679	\N
cmnnoyfzf006otjxw89hrpsm1	cltenantdefault0000000000	Нефедов Олег Викторович	Нефедов	Олег	Викторович	\N	ортопед	\N	\N	\N	8 961 929 5677	Telegram	Terra444	\N	\N	f	f	\N	2026-04-06 21:17:23.692	\N
cmnnoyfzr006ptjxwybdm1kds	cltenantdefault0000000000	Нигматуллина Наджия Марсовна	Нигматуллина	Наджия	Марсовна	\N	ортодонт	\N	\N	\N	8 914 672 7948	Telegram	nadzhzh	\N	\N	f	f	\N	2026-04-06 21:17:23.703	\N
cmnnoyg03006qtjxwfqtjea2b	cltenantdefault0000000000	Николаев Андрей Викторович	Николаев	Андрей	Викторович	\N	ортопед	\N	nikolaev23@gmail.com	\N	79312553254	Telegram	nikolaevortho	\N	\N	f	f	\N	2026-04-06 21:17:23.716	\N
cmnnoyg0f006rtjxw3psyapgc	cltenantdefault0000000000	Николаева Дарья Игоревна	Николаева	Дарья	Игоревна	\N	ортодонт	\N	dasha-nikolaeva-00@mail.ru	\N	8 950 279 6229	Telegram	aurdarias	\N	\N	f	f	\N	2026-04-06 21:17:23.728	\N
cmnnoyg0s006stjxwce7u10zr	cltenantdefault0000000000	Николаева Наталья Анатльевна	Николаева	Наталья	Анатльевна	\N	ортодонт	\N	\N	\N	8 921 321 28 90	Telegram	Natalia2401	\N	\N	f	f	\N	2026-04-06 21:17:23.74	\N
cmnnoyhsf00ectjxws0v6zcq1	cltenantdefault0000000000	Новикова	Новикова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.031	\N
cmnnoyg15006ttjxwnmklli2m	cltenantdefault0000000000	Новоселова Юлия Игоревна	Новоселова	Юлия	Игоревна	\N	ортодонт	\N	novo.140@mail.ru	\N	79117686735	Telegram	Yulia_Novoselova_exp	\N	\N	f	f	\N	2026-04-06 21:17:23.754	\N
cmnnoyg1k006utjxwg97h499y	cltenantdefault0000000000	Носкова Дарья Александровна	Носкова	Дарья	Александровна	\N	ортодонт	\N	\N	\N	79817604618	Telegram	dariaort	\N	\N	f	f	\N	2026-04-06 21:17:23.768	\N
cmnnoyg1z006vtjxwaiy9lxxn	cltenantdefault0000000000	Нурисламова Айсылу Альфировна	Нурисламова	Айсылу	Альфировна	\N	ортодонт	\N	\N	\N	\N	Telegram	Aisnuris	\N	\N	f	f	\N	2026-04-06 21:17:23.783	\N
cmnnoyg2b006wtjxwpojyj8hy	cltenantdefault0000000000	Обухов Алексей Владимирович	Обухов	Алексей	Владимирович	\N	ортопед	\N	\N	\N	79611194921	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.796	\N
cmnnoyhf300bttjxwsconglcd	cltenantdefault0000000000	Обуховская	Обуховская	\N	\N	\N	\N	\N	\N	\N	9215989568	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.551	\N
cmnnoyg2n006xtjxw7mmfc2ca	cltenantdefault0000000000	Овчинникова Нина Вячеславовна	Овчинникова	Нина	Вячеславовна	\N	ортопед	\N	\N	\N	8 909 107 9682	Telegram	dr_ovchinnikovanina	\N	\N	f	f	\N	2026-04-06 21:17:23.808	\N
cmnnoyg2u006ytjxwhipxyjjy	cltenantdefault0000000000	Одинцов Илья Илья Сергеевич	Одинцов Илья	Илья	Сергеевич	\N	ортопед	\N	\N	\N	8 911 830 8897	Telegram	a_vista17	\N	\N	f	f	\N	2026-04-06 21:17:23.814	\N
cmnnoyg38006ztjxwjv7q9ult	cltenantdefault0000000000	Одинцов Семен Семен Олегович	Одинцов Семен	Семен	Олегович	\N	ортопед	\N	\N	\N	8 963 780 9797	Telegram	odint_s	\N	\N	f	f	\N	2026-04-06 21:17:23.829	\N
cmnnoyg3g0070tjxwgu0w4i6h	cltenantdefault0000000000	Окунев Павел Юрьевич	Окунев	Павел	Юрьевич	\N	ортопед	\N	\N	\N	8 911 211 1261	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.837	\N
cmnnoyg3s0071tjxw98sn69dq	cltenantdefault0000000000	Окунева Татьяна Юрьевна	Окунева	Татьяна	Юрьевна	\N	ортодонт	\N	\N	\N	нет	Telegram	нет	\N	\N	f	f	\N	2026-04-06 21:17:23.848	\N
cmnnoyg430072tjxw4tfb3rn2	cltenantdefault0000000000	Ольхова Дарина Александровна	Ольхова	Дарина	Александровна	\N	ортодонт	\N	\N	\N	\N	Telegram	Darinaolhova	\N	\N	f	f	\N	2026-04-06 21:17:23.86	\N
cmnnoyg4i0073tjxwfaej3js7	cltenantdefault0000000000	Онацкая Анна Михайловна	Онацкая	Анна	Михайловна	Сергеева	ортодонт	\N	\N	\N	8 911 220 8216	Telegram	annfreesia	\N	\N	f	f	\N	2026-04-06 21:17:23.875	\N
cmnnoyg4x0074tjxwcu9iz5rl	cltenantdefault0000000000	Оноприенко Юлия Александровна	Оноприенко	Юлия	Александровна	\N	ортодонт	\N	\N	\N	8 999 217 8853	Telegram	https://t.me/hey_juliete	\N	\N	f	f	\N	2026-04-06 21:17:23.889	\N
cmnnoyg590075tjxwkd2tff2s	cltenantdefault0000000000	Оношко Ольга Михайловна	Оношко	Ольга	Михайловна	\N	ортодонт	\N	\N	\N	8 931 224 8595	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.902	\N
cmnnoyhzm00fytjxwhgauprgs	cltenantdefault0000000000	Орбелиани	Орбелиани	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.29	\N
cmnnoyg5m0076tjxwytu3mk8v	cltenantdefault0000000000	Оришина Екатерина Павловна	Оришина	Екатерина	Павловна	\N	ортодонт	\N	\N	\N	8 952 242 6467	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.915	\N
cmnnoyhup00estjxwh2fsfx1g	cltenantdefault0000000000	Орлова	Орлова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.113	\N
cmnnoyhkr00cttjxwccwf6rzw	cltenantdefault0000000000	Отхозория	Отхозория	\N	\N	\N	\N	\N	\N	\N	7 911 258 18 34	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.755	\N
cmnnoyg600077tjxws6ho4a4x	cltenantdefault0000000000	Павликов Константин Владимирович	Павликов	Константин	Владимирович	\N	ортопед	\N	\N	\N	8 911 165 2466	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.928	\N
cmnnoyhc500bbtjxwnqod1idp	cltenantdefault0000000000	Павлова Маргарита Борисовна	Павлова	Маргарита	Борисовна	\N	\N	\N	\N	\N	7 911 155 2653	Telegram	ritapavlova	\N	\N	f	f	\N	2026-04-06 21:17:25.446	\N
cmnnoyg6c0078tjxw4qktn48w	cltenantdefault0000000000	Пайо Яна Александровна	Пайо	Яна	Александровна	\N	ортодонт	\N	kuchmayanka@yandex.ru	leninskiy@factorsmile.ru	\N	Telegram	oYaniss	\N	\N	f	f	\N	2026-04-06 21:17:23.941	\N
cmnnoyg6n0079tjxwe7j9yo3y	cltenantdefault0000000000	Пак Кристина Юрьевна	Пак	Кристина	Юрьевна	\N	\N	\N	\N	\N	нет	Telegram	ChristineYurevna	\N	\N	f	f	\N	2026-04-06 21:17:23.952	\N
cmnnoyg70007atjxwyhndllpu	cltenantdefault0000000000	Паляничкин Евгений Сергеевич	Паляничкин	Евгений	Сергеевич	\N	ортопед	\N	\N	\N	8 960 282 6575	Telegram	Eugine6	\N	\N	f	f	\N	2026-04-06 21:17:23.964	\N
cmnnoyg7d007btjxwop0fic68	cltenantdefault0000000000	Паляничкина Татьяна Александровна	Паляничкина	Татьяна	Александровна	\N	ортодонт	\N	\N	\N	8 981 791 1226	Telegram	Tatyana_ortho	\N	\N	f	f	\N	2026-04-06 21:17:23.977	\N
cmnnoyg7p007ctjxweytzqo0k	cltenantdefault0000000000	Панкова Ольга Васильевна	Панкова	Ольга	Васильевна	\N	ортодонт	\N	\N	\N	8 921 743 7921	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:23.989	\N
cmnnoyg7v007dtjxw5mk2ieq4	cltenantdefault0000000000	Парсаматова Одина	Парсаматова	Одина	\N	\N	\N	\N	\N	\N	\N	Telegram	-	\N	\N	f	f	\N	2026-04-06 21:17:23.996	\N
cmnnoyg83007etjxwsqjjnywj	cltenantdefault0000000000	Пархоменко Ольга Николаевна	Пархоменко	Ольга	Николаевна	\N	ортодонт	\N	\N	\N	нет	Telegram	нет	\N	\N	f	f	\N	2026-04-06 21:17:24.004	\N
cmnnoyhpu00dttjxw2w490hm0	cltenantdefault0000000000	Пахомов Дмитрий	Пахомов	Дмитрий	\N	\N	\N	\N	\N	\N	8904-514-8486	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.938	\N
cmnnoyg8g007ftjxw1mie2v3y	cltenantdefault0000000000	Пашаев Султан Расулович	Пашаев	Султан	Расулович	\N	ортодонт	\N	\N	\N	8 929 895 9292	Telegram	sultan_orthodont	\N	\N	f	f	\N	2026-04-06 21:17:24.016	\N
cmnnoyhda00bhtjxwxuuxqyto	cltenantdefault0000000000	Пашкова Евгения Константиновна	Пашкова	Евгения	Константиновна	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.486	\N
cmnnoyg8t007gtjxw0ak84psn	cltenantdefault0000000000	Перекалин Кирилл Петрович	Перекалин	Кирилл	Петрович	\N	ортопед	\N	\N	\N	8 921 648 7867	Telegram	нет	\N	\N	f	f	\N	2026-04-06 21:17:24.029	\N
cmnnoyhm800d3tjxwlrc3pg19	cltenantdefault0000000000	Персикова	Персикова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.809	\N
cmnnoyg95007htjxwi0n4unx2	cltenantdefault0000000000	Перчак (Москаленко) Яна Витальевна	Перчак (Москаленко)	Яна	Витальевна	Москаленко	ортодонт	сейчас работает в Поколении на Стачек 19а	yana.moskalenko.97@mail.ru	\N	8 981 686 3849	Telegram	xmoskalenkox	\N	\N	f	f	\N	2026-04-06 21:17:24.041	\N
cmnnoyhir00cgtjxw6h58z52e	cltenantdefault0000000000	Петрашень	Петрашень	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.684	\N
seed-doc-private	cltenantdefault0000000000	Петров П.П.	\N	\N	\N	\N	\N	\N	\N	\N	+7 900 444-55-66	Звонок	\N	\N	Только частная практика в демо-данных	t	f	\N	2026-04-06 19:50:51.948	\N
cmnnoyg9g007itjxwgxar5wnp	cltenantdefault0000000000	Петрова Елена Александровна	Петрова	Елена	Александровна	\N	ортодонт	\N	\N	\N	8 906 242 9539	Telegram	elena_ortodontista	\N	\N	f	f	\N	2026-04-06 21:17:24.053	\N
cmnnoyg9s007jtjxwtti9lmic	cltenantdefault0000000000	Петрова Софья Михайловна	Петрова	Софья	Михайловна	\N	\N	\N	\N	\N	8 911 824 8769	Telegram	petrovvv_v	\N	\N	f	f	\N	2026-04-06 21:17:24.064	\N
cmnnoyhfo00bxtjxwtv3oh9bk	cltenantdefault0000000000	Петросян	Петросян	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.573	\N
cmnnoyga6007ktjxwr1qtbldg	cltenantdefault0000000000	Петросян Нарэ Геворговна	Петросян	Нарэ	Геворговна	\N	\N	\N	\N	\N	8 931 353 5508	Telegram	нет	\N	\N	f	f	\N	2026-04-06 21:17:24.078	\N
cmnnoygae007ltjxwqfuqn1i8	cltenantdefault0000000000	Пивоварова Татьяна Александровна	Пивоварова	Татьяна	Александровна	\N	ортодонт	\N	\N	\N	8 921 642 9869	Telegram	Kidsdantist1	\N	\N	f	f	\N	2026-04-06 21:17:24.087	\N
cmnnoygas007mtjxwxileolso	cltenantdefault0000000000	Пискунов Антон	Пискунов	Антон	\N	\N	\N	ранее работал в Симплексе	\N	\N	8 900 652 3769	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.1	\N
cmnnoygay007ntjxw491gjryl	cltenantdefault0000000000	Письменская Кристина Ивановна	Письменская	Кристина	Ивановна	\N	ортодонт	\N	\N	\N	8 911 824 9154	Telegram	Kristina_Pismenskaia	\N	\N	f	f	\N	2026-04-06 21:17:24.106	\N
cmnnoygb4007otjxw26cbjxuz	cltenantdefault0000000000	Подковыркин Евгений Александрович	Подковыркин	Евгений	Александрович	\N	хирург	\N	\N	\N	8 911 276 3137	Telegram	Zhekpod	\N	\N	f	f	\N	2026-04-06 21:17:24.113	\N
cmnnoyhng00dctjxw65qgp948	cltenantdefault0000000000	Позднякова	Позднякова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.853	\N
cmnnoyhpg00drtjxwoh7mi6ll	cltenantdefault0000000000	Полторацкая Ирина Павловна	Полторацкая	Ирина	Павловна	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.925	\N
cmnnoygbf007ptjxwiyekip54	cltenantdefault0000000000	Полухина Александра Ивановна	Полухина	Александра	Ивановна	\N	ортодонт	\N	\N	\N	8 911 717 8707	Telegram	Alexandra_Polukhina	\N	\N	f	f	\N	2026-04-06 21:17:24.124	\N
cmnnoygbm007qtjxwk56oi26l	cltenantdefault0000000000	Полякова Анастасия Сергеевна	Полякова	Анастасия	Сергеевна	\N	ортодонт	\N	\N	\N	8 911 818 0462	Telegram	poliakova_ac	\N	\N	f	f	\N	2026-04-06 21:17:24.13	\N
cmnnoygby007rtjxwge89rehg	cltenantdefault0000000000	Полякова Екатерина Николаевна	Полякова	Екатерина	Николаевна	\N	ортопед	\N	\N	\N	8 921 611 0647	Telegram	нет	\N	\N	f	f	\N	2026-04-06 21:17:24.142	\N
cmnnoygca007stjxwtnmfzjws	cltenantdefault0000000000	Пономарев Алексей Вячеславович	Пономарев	Алексей	Вячеславович	\N	ортопед	\N	\N	\N	8 911 013 4818	Telegram	нет	\N	\N	f	f	\N	2026-04-06 21:17:24.155	\N
cmnnoygcm007ttjxwju7cqxxp	cltenantdefault0000000000	Пономарев Станислав Евгеньевич	Пономарев	Станислав	Евгеньевич	\N	ортопед	\N	\N	\N	8 908 269 6703	Telegram	нет	\N	\N	f	f	\N	2026-04-06 21:17:24.166	\N
cmnnoyhtt00emtjxw5oka2hco	cltenantdefault0000000000	Попова Валерия Юрьевна	Попова	Валерия	Юрьевна	\N	\N	\N	\N	\N	79507553087	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.082	\N
cmnnoygcz007utjxwz6fn0fdi	cltenantdefault0000000000	Потапова Анна Юрьевна	Потапова	Анна	Юрьевна	\N	ортопед	\N	\N	\N	8 911 995 8745	Telegram	annimalpo	\N	\N	f	f	\N	2026-04-06 21:17:24.179	\N
cmnnoygdb007vtjxw3zmusccb	cltenantdefault0000000000	Прокопив Анна Михайловна	Прокопив	Анна	Михайловна	\N	ортопед	\N	\N	\N	8 931 215 1693	Telegram	dr_Prokopiv_Anna	\N	\N	f	f	\N	2026-04-06 21:17:24.192	\N
cmnnoygdn007wtjxw57z1bm7v	cltenantdefault0000000000	Прохорова Виктория Валерьевна	Прохорова	Виктория	Валерьевна	\N	ортодонт	\N	\N	\N	8 951 686 4387	Telegram	Viktoria92	\N	\N	f	f	\N	2026-04-06 21:17:24.203	\N
cmnnoyhym00fqtjxwc2kygufq	cltenantdefault0000000000	Прыткова Екатерина Фаридовна	Прыткова	Екатерина	Фаридовна	\N	\N	\N	\N	\N	8913-800-5007	Telegram	Ekaterina Prytkova	\N	\N	f	f	\N	2026-04-06 21:17:26.255	\N
cmnnoygdz007xtjxwpnw0cfvu	cltenantdefault0000000000	Пулатов Дильшод Шухратович	Пулатов	Дильшод	Шухратович	\N	ортопед	\N	\N	\N	8 931 988 8376	Telegram	нет	\N	\N	f	f	\N	2026-04-06 21:17:24.216	\N
cmnnoygec007ytjxw6dwd57gv	cltenantdefault0000000000	Пухаева Ирина Александровна	Пухаева	Ирина	Александровна	\N	ортодонт	\N	\N	\N	8 938 863 7332	Telegram	Irina_Pukhaeva	\N	\N	f	f	\N	2026-04-06 21:17:24.229	\N
cmnnoygep007ztjxwhsvtxzsx	cltenantdefault0000000000	Пухов Денис Вадимович	Пухов	Денис	Вадимович	\N	ортопед	\N	\N	\N	8 909 787 3978	Telegram	pukhov_denis	\N	\N	f	f	\N	2026-04-06 21:17:24.242	\N
cmnnoygew0080tjxwpr7v2kkn	cltenantdefault0000000000	Пушняков Иван Владимирович	Пушняков	Иван	Владимирович	\N	ортодонт	\N	\N	\N	8 981 754 0180	Telegram	Dr_Pushnyakov	\N	\N	f	f	\N	2026-04-06 21:17:24.248	\N
cmnnoygf80081tjxwj8mvm987	cltenantdefault0000000000	Раблюк Анна Юрьевна	Раблюк	Анна	Юрьевна	\N	ортодонт	\N	\N	\N	8 918 107 4983	Telegram	Anna_Rablyuk	\N	\N	f	f	\N	2026-04-06 21:17:24.26	\N
cmnnoyhty00entjxwk1d09mtp	cltenantdefault0000000000	Райдмяе Анна Вячеславовна	Райдмяе	Анна	Вячеславовна	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.087	\N
cmnnoygfk0082tjxwh66fufry	cltenantdefault0000000000	Райкова Анастасия Павловна	Райкова	Анастасия	Павловна	\N	ортодонт	\N	\N	\N	8 981 143 8382	Telegram	ortodontraykova	\N	\N	f	f	\N	2026-04-06 21:17:24.273	\N
cmnnoyhlk00cytjxw3enhh9at	cltenantdefault0000000000	Рамалданов	Рамалданов	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.784	\N
cmnnoyhib00cdtjxw0w7bcxno	cltenantdefault0000000000	Рахимова Алсу	Рахимова	Алсу	\N	\N	\N	\N	\N	\N	89210909191	Telegram	alsu_sya	\N	\N	f	f	\N	2026-04-06 21:17:25.668	\N
cmnnoygfx0083tjxwthedwkxe	cltenantdefault0000000000	Резин Алексей Олегович	Резин	Алексей	Олегович	\N	ортопед	\N	\N	\N	8 913 673 6477	Telegram	alexthedentist	\N	\N	f	f	\N	2026-04-06 21:17:24.286	\N
cmnnoyggc0084tjxwvwmtl9ih	cltenantdefault0000000000	Ривкин Ева Ева	Ривкин Ева	Ева	\N	\N	\N	Клиника Dr.Eva Rivkin, Tel Aviv, Israel	\N	\N	972537220317	Telegram	Eva_Rivkin	\N	\N	f	f	\N	2026-04-06 21:17:24.3	\N
cmnnoyfr4005ztjxwhn8ln1o0	cltenantdefault0000000000	Розанова Мария Николаевна	Розанова	Мария	Николаевна	\N	ортодонт	\N	rozanovi4@mail.ru	\N	8 9816867818	Telegram	mari_ortho_balance	\N	\N	f	f	\N	2026-04-06 21:17:23.392	\N
cmnnoyhep00bqtjxw50fbdkmu	cltenantdefault0000000000	Рома Наш Моделировщик	Рома Наш Моделировщик	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.537	\N
cmnnoyggq0085tjxw0v0b0f5g	cltenantdefault0000000000	Романова Анастасия Сергеевна	Романова	Анастасия	Сергеевна	\N	ортодонт	\N	\N	\N	8 921 325 6004	Telegram	drromanovaa	\N	\N	f	f	\N	2026-04-06 21:17:24.314	\N
cmnnoyhn200d9tjxwe1k8jphi	cltenantdefault0000000000	Романченко	Романченко	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.838	\N
cmnnoygh20086tjxw1h2ktcu9	cltenantdefault0000000000	Рослова Ольга Сергеевна	Рослова	Ольга	Сергеевна	\N	ортодонт	\N	\N	\N	8 999 041 3815	Telegram	OlgaRoslova	\N	\N	f	f	\N	2026-04-06 21:17:24.326	\N
cmnnoyhb800b6tjxwpz320ks1	cltenantdefault0000000000	Ротарь Илина Владимировна	Ротарь	Илина	Владимировна	\N	\N	\N	\N	\N	89500321701	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.412	\N
cmnnoyhv600evtjxwkixw4ap5	cltenantdefault0000000000	Рудич	Рудич	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.13	\N
cmnnoyghi0087tjxwbj7phel5	cltenantdefault0000000000	Румянцев Андрей	Румянцев	Андрей	\N	\N	ортопед	\N	\N	\N	8 911 906 2012	Telegram	AndreyRumm	\N	\N	f	f	\N	2026-04-06 21:17:24.342	\N
cmnnoyght0088tjxw25smu41t	cltenantdefault0000000000	Румянцева	Румянцева	\N	\N	\N	ортодонт	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.354	\N
cmnnoygi70089tjxwv85u4srn	cltenantdefault0000000000	Русакова Мария Алексеевна	Русакова	Мария	Алексеевна	\N	\N	\N	\N	\N	8 911 011 5659	Telegram	mariarusakovaa	\N	\N	f	f	\N	2026-04-06 21:17:24.367	\N
cmnnoygii008atjxwc83q15la	cltenantdefault0000000000	Рыжова Елена Николаевна	Рыжова	Елена	Николаевна	\N	ортопед	от техника Ильи Шевченко	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.378	\N
cmnnoygiv008btjxw7iax7cg4	cltenantdefault0000000000	Рычова Яна Андреевна	Рычова	Яна	Андреевна	\N	ортодонт	\N	\N	\N	8 995 128 5725	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.392	\N
cmnnoygj7008ctjxwbcbu8e9y	cltenantdefault0000000000	Рышкова Светлана Сергеевна	Рышкова	Светлана	Сергеевна	\N	ортодонт	\N	ryshkovasvetlana@gmail.com	\N	8 911 781 2372	Telegram	Ryshkova_Ortho	\N	\N	f	f	\N	2026-04-06 21:17:24.403	\N
cmnnoygjj008dtjxwqtzkw8x8	cltenantdefault0000000000	Рязанцева Юлия Евгеньевна	Рязанцева	Юлия	Евгеньевна	\N	ортодонт	\N	\N	\N	8 913 046 4628	Telegram	kaddionova	\N	\N	f	f	\N	2026-04-06 21:17:24.415	\N
cmnnoyhze00fwtjxwk2j9vmfb	cltenantdefault0000000000	Сабеева	Сабеева	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.282	\N
cmnnoygjw008etjxwrb3ixjqk	cltenantdefault0000000000	Савельев Сергей Кириллович	Савельев	Сергей	Кириллович	\N	ортопед	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.429	\N
cmnnoyhvy00f2tjxwu3zrc1d6	cltenantdefault0000000000	Савельева	Савельева	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.158	\N
cmnnoyeug001stjxw5s9lb2xr	cltenantdefault0000000000	Савинова Камила Авдановна	Савинова	Камила	Авдановна	Гамаонова, Гасанова, Савинова	ортодонт	\N	kamila1005@mail.ru	\N	8 912 015 9943	Telegram	Gamaonova	\N	\N	f	f	\N	2026-04-06 21:17:22.216	\N
cmnnoyi0g00g2tjxwh6ktch5d	cltenantdefault0000000000	Садовникова Олеся Александровна	Садовникова	Олеся	Александровна	\N	\N	\N	\N	\N	79163090771	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.321	\N
cmnnoygkk008ftjxwa6eyowie	cltenantdefault0000000000	Садовникова Татьяна Глебовна	Садовникова	Татьяна	Глебовна	\N	ортодонт	\N	ortho.sad@mail.ru	\N	8 981 839 1506	Telegram	TatyanaSadovnikova	\N	\N	f	f	\N	2026-04-06 21:17:24.452	\N
cmnnoygkw008gtjxw69n5vkbr	cltenantdefault0000000000	Самус Наталья Эднаровна	Самус	Наталья	Эднаровна	\N	ортодонт	\N	dr.natalia.samus@gmail.com	\N	8 911 927 9393	Telegram	dr_samus	\N	\N	f	f	\N	2026-04-06 21:17:24.465	\N
cmnnoyhwx00fbtjxwymshv2fv	cltenantdefault0000000000	Сарсадских	Сарсадских	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.194	\N
cmnnoygla008htjxw8dnr6rwa	cltenantdefault0000000000	Сатова Анастасия Александровна	Сатова	Анастасия	Александровна	\N	ортодонт	\N	\N	\N	8 921 998 9880	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.479	\N
cmnnoyglp008itjxwsl1lhlbh	cltenantdefault0000000000	Сачиян Юлия Владимировна	Сачиян	Юлия	Владимировна	\N	ортодонт	\N	\N	\N	8 921 947 5712	Telegram	Y1echka	\N	\N	f	f	\N	2026-04-06 21:17:24.494	\N
cmnnoyhhz00cbtjxw5mkt6hgt	cltenantdefault0000000000	Свиридова	Свиридова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.655	\N
cmnnoygm1008jtjxwddc7rmsy	cltenantdefault0000000000	Седых Дмитрий Николаевич	Седых	Дмитрий	Николаевич	\N	ортопед	Тамбов	\N	\N	8 915 672 6999	Telegram	Dmitriy_Sedych	\N	\N	f	f	\N	2026-04-06 21:17:24.506	\N
cmnnoyhn900datjxwrtpqk8lm	cltenantdefault0000000000	Семаш	Семаш	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.845	\N
cmnnoygmd008ktjxwlygetuyr	cltenantdefault0000000000	Семелева Екатерина Игоревна	Семелева	Екатерина	Игоревна	\N	ортодонт	\N	\N	\N	\N	Telegram	Semeleva	\N	\N	f	f	\N	2026-04-06 21:17:24.517	\N
cmnnoygmo008ltjxwg9unqkou	cltenantdefault0000000000	Семенов Вячеслв Владимирович	Семенов	Вячеслв	Владимирович	\N	ортопед	\N	\N	\N	8 913 266 6373	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.529	\N
cmnnoygn1008mtjxwxl2rgdbq	cltenantdefault0000000000	Семенова Юлия Сергеевна	Семенова	Юлия	Сергеевна	\N	ортодонт, гнатолог	\N	\N	\N	8 921 653 6123	Telegram	dr_julia_semenova	\N	\N	f	f	\N	2026-04-06 21:17:24.541	\N
cmnnoygnb008ntjxwmc1ndq1q	cltenantdefault0000000000	Семенцова Дарья Игоревна	Семенцова	Дарья	Игоревна	\N	ортодонт	\N	\N	\N	\N	Telegram	ddarryas	\N	\N	f	f	\N	2026-04-06 21:17:24.551	\N
cmnnoygnk008otjxwar2het85	cltenantdefault0000000000	Семенюк Андрей Витальевич	Семенюк	Андрей	Витальевич	\N	ортопед	\N	\N	\N	\N	Telegram	sawdental	\N	\N	f	f	\N	2026-04-06 21:17:24.56	\N
cmnnoyhbu00b9tjxwysqbmi82	cltenantdefault0000000000	Семенюк Максим Витальевич	Семенюк	Максим	Витальевич	\N	\N	\N	\N	\N	+7 911 196 7183	Telegram	Maximussem777	\N	\N	f	f	\N	2026-04-06 21:17:25.434	\N
seed-doc-sergeeva	cltenantdefault0000000000	Сергеева А.В.	\N	\N	\N	\N	\N	\N	\N	\N	\N	WhatsApp	\N	\N	Предпочитает связь после 14:00	t	f	\N	2026-04-06 19:50:51.938	\N
cmnnoyhqr00dztjxw0btx3ep3	cltenantdefault0000000000	Сергиенко Елена	Сергиенко	Елена	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.972	\N
cmnnoygnv008ptjxwme5eua0b	cltenantdefault0000000000	Сеселкина Елена Леонидовна	Сеселкина	Елена	Леонидовна	\N	ортодонт, остеопат	\N	\N	\N	8 921 964 1153	Telegram	dr_seselkina	\N	\N	f	f	\N	2026-04-06 21:17:24.571	\N
cmnnoygo5008qtjxw2l5v06qb	cltenantdefault0000000000	Сигуа Нино Валериевна	Сигуа	Нино	Валериевна	\N	ортодонт	\N	\N	\N	\N	Telegram	NinoSigua	\N	\N	f	f	\N	2026-04-06 21:17:24.582	\N
cmnnoygog008rtjxwll3ck3hz	cltenantdefault0000000000	Сидоренко Елена Александровна	Сидоренко	Елена	Александровна	\N	\N	\N	\N	\N	8 911 921 0037	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.592	\N
cmnnoyi0k00g3tjxwg4u89auz	cltenantdefault0000000000	Сидякина	Сидякина	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.325	\N
cmnnoyhw100f3tjxwif8k39vd	cltenantdefault0000000000	Сильницкая	Сильницкая	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.162	\N
cmnnoygoq008stjxwd5fovj2m	cltenantdefault0000000000	Симаков Антон Олегович	Симаков	Антон	Олегович	\N	хирург	\N	\N	\N	8 921 247 9642	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.602	\N
cmnnoyhx100fctjxwohbhtwhh	cltenantdefault0000000000	Симакова	Симакова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.198	\N
cmnnoygov008ttjxwvjya4u9v	cltenantdefault0000000000	Синицина Татьяна Михайловна	Синицина	Татьяна	Михайловна	\N	ортодонт, гнатолог	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.608	\N
cmnnoygp8008utjxwnqiiyl9y	cltenantdefault0000000000	Синицкая Виктория Викторовна	Синицкая	Виктория	Викторовна	\N	ортодонт	\N	\N	\N	8 911 701 6716	Telegram	vikadoctor123	\N	\N	f	f	\N	2026-04-06 21:17:24.62	\N
cmnnoygpk008vtjxw54wazovn	cltenantdefault0000000000	Синьговская Ксения Сергеевна	Синьговская	Ксения	Сергеевна	\N	ортодонт	\N	\N	\N	8 999 157 9167	Telegram	singovsskaya	\N	\N	f	f	\N	2026-04-06 21:17:24.633	\N
cmnnoygpw008wtjxwsle4p8r9	cltenantdefault0000000000	Синявская Гульнара Насибулловна	Синявская	Гульнара	Насибулловна	\N	ортодонт	\N	\N	\N	8 921 991 0279	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.644	\N
cmnnoygq8008xtjxwemwukpab	cltenantdefault0000000000	Сканцева (Бахарева) Анна Петровна	Сканцева (Бахарева)	Анна	Петровна	Бахарева	ортодонт	\N	\N	\N	8 906 275 7204	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.656	\N
cmnnoygqj008ytjxwa3198dvm	cltenantdefault0000000000	Скребцова Дарья Дмитриевна	Скребцова	Дарья	Дмитриевна	\N	ортодонт, гнатолог	\N	\N	\N	8 953 361 1887	Telegram	daydarts	\N	\N	f	f	\N	2026-04-06 21:17:24.668	\N
cmnnoyhl800cwtjxwabpw2dkp	cltenantdefault0000000000	Скумина Полина Сергеевна	Скумина	Полина	Сергеевна	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.773	\N
cmnnoygqu008ztjxw4rz7l0tw	cltenantdefault0000000000	Скупченко Михаил Дмитриевич	Скупченко	Михаил	Дмитриевич	\N	ортодонт	\N	\N	\N	8 999 202 8016	Telegram	Mishka613	2025-09-15 12:00:00	\N	f	f	\N	2026-04-06 21:17:24.679	\N
cmnnoygr80090tjxwa0nsopay	cltenantdefault0000000000	Смелова Юлия Сергеевна	Смелова	Юлия	Сергеевна	\N	ортодонт	Москва	\N	\N	8 926 527 2480	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.692	\N
cmnnoygri0091tjxwj2c14nj6	cltenantdefault0000000000	Сметская Алёна Викторовна	Сметская	Алёна	Викторовна	\N	ортодонт	\N	\N	\N	8 999 529 2826	Telegram	Smetskaia	\N	\N	f	f	\N	2026-04-06 21:17:24.703	\N
cmnnoygrt0092tjxw3q5jk79l	cltenantdefault0000000000	Смирнов Олег Сергеевич	Смирнов	Олег	Сергеевич	\N	ортопед	\N	\N	\N	8 911 963 2547	Telegram	dr_oleg_smirnov	\N	\N	f	f	\N	2026-04-06 21:17:24.714	\N
cmnnoyhe100bmtjxwvgmgpq6m	cltenantdefault0000000000	Смирнова	Смирнова	\N	\N	\N	ортодонт	\N	\N	\N	7 905 275 6552	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.514	\N
cmnnoygs20093tjxwyg8trb1y	cltenantdefault0000000000	Смирнова Марьяна Геннадьевна	Смирнова	Марьяна	Геннадьевна	\N	\N	\N	\N	\N	\N	Telegram	sm_maryana	\N	\N	f	f	\N	2026-04-06 21:17:24.723	\N
cmnnoygs80094tjxwn4t8mm8h	cltenantdefault0000000000	Соколов Никита Вячеславович	Соколов	Никита	Вячеславович	\N	ортопед	\N	stomsokol@gmail.com	\N	8 953 166 7783	Telegram	stomsokol	\N	\N	f	f	\N	2026-04-06 21:17:24.729	\N
cmnnoyhkl00cstjxwh9r42uev	cltenantdefault0000000000	Соколова	Соколова	\N	\N	\N	\N	\N	\N	\N	7 905 279 3132	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.749	\N
cmnnoygsj0095tjxwx5t35107	cltenantdefault0000000000	Солдаткина Аксинья Сергеевна	Солдаткина	Аксинья	Сергеевна	\N	\N	\N	\N	\N	8 921 391 1170	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.739	\N
cmnnoyhfk00bwtjxw0b60cbt2	cltenantdefault0000000000	Солдатов Вениамин	Солдатов	Вениамин	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.569	\N
cmnnoyhcp00betjxw6lkpro2y	cltenantdefault0000000000	Солдатова Людмила Николаевна	Солдатова	Людмила	Николаевна	\N	\N	\N	\N	\N	8-921-933-53-59	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.466	\N
cmnnoygst0096tjxw8azmrxci	cltenantdefault0000000000	Соловьев Александр Николаевич	Соловьев	Александр	Николаевич	\N	\N	Москва	\N	\N	\N	Telegram	soloclinic	\N	\N	f	f	\N	2026-04-06 21:17:24.75	\N
cmnnoygt20097tjxwe1tlfstu	cltenantdefault0000000000	Сподин	Сподин	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.758	\N
cmnnoygtc0098tjxwklw0cxg4	cltenantdefault0000000000	Староверова Ксения Владимировна	Староверова	Ксения	Владимировна	\N	ортопед	\N	\N	\N	8 921 942 2822	Telegram	Ksenia_dentist	\N	\N	f	f	\N	2026-04-06 21:17:24.768	\N
cmnnoyhqc00dwtjxwh8w7xv8h	cltenantdefault0000000000	Стародубцева Анастасия Александровна	Стародубцева	Анастасия	Александровна	\N	\N	\N	\N	\N	960-687-25-39	Telegram	Dr_AnastasiaStar	\N	\N	f	f	\N	2026-04-06 21:17:25.957	\N
cmnnoygtm0099tjxwby01mugr	cltenantdefault0000000000	Стельмахова Дарина Сергеевна	Стельмахова	Дарина	Сергеевна	\N	ортодонт	\N	\N	\N	8 981 886 4197	Telegram	daridarii	\N	\N	f	f	\N	2026-04-06 21:17:24.778	\N
cmnnoygtx009atjxws9s1qulr	cltenantdefault0000000000	Степанова Алина Юрьевна	Степанова	Алина	Юрьевна	Максимович	ортодонт	\N	\N	\N	8 914 412 9242	Telegram	auorth	\N	\N	f	f	\N	2026-04-06 21:17:24.789	\N
cmnnoygu8009btjxwgexvhbc6	cltenantdefault0000000000	Степанова Тамара Александровна	Степанова	Тамара	Александровна	\N	ортодонт	\N	\N	\N	8 921 334 4949	Telegram	tamara_stomatolog	\N	\N	f	f	\N	2026-04-06 21:17:24.8	\N
cmnnoyguj009ctjxw5v6h7qoa	cltenantdefault0000000000	Степченкова Марина Алексеевна	Степченкова	Марина	Алексеевна	\N	\N	\N	\N	\N	8 914 186 8624	Telegram	MalinaStep	\N	\N	f	f	\N	2026-04-06 21:17:24.812	\N
cmnnoyguq009dtjxwus9xcr3l	cltenantdefault0000000000	Стерехова Елена Борисовна	Стерехова	Елена	Борисовна	\N	ортодонт	\N	\N	\N	8 911 970 5725	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.819	\N
cmnnoyhlo00cztjxwbpkjbzp5	cltenantdefault0000000000	Столярова	Столярова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.789	\N
cmnnoyhru00e7tjxwcvrf9cyv	cltenantdefault0000000000	Ступак	Ступак	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.011	\N
cmnnoygv1009etjxw5pbh8gg9	cltenantdefault0000000000	Сулейманов Георгий Рукузаевич	Сулейманов	Георгий	Рукузаевич	\N	\N	\N	\N	\N	8 999 205 8980	Telegram	GoshSpb	\N	\N	f	f	\N	2026-04-06 21:17:24.83	\N
cmnnoygvc009ftjxwtkbwx2mo	cltenantdefault0000000000	Сулыгина Татьяна Евгеньевна	Сулыгина	Татьяна	Евгеньевна	\N	ортодонт	\N	\N	\N	8 921 751 1180	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.841	\N
cmnnoyhom00dltjxwp5af1efp	cltenantdefault0000000000	Суркова	Суркова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.895	\N
cmnnoyhxi00fgtjxwe2tq3x7a	cltenantdefault0000000000	Сысоева	Сысоева	\N	\N	\N	\N	\N	\N	\N	79600014510	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.215	\N
cmnnoyhow00dntjxwz6rfje2n	cltenantdefault0000000000	Тадтаева	Тадтаева	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.905	\N
cmnnoygvl009gtjxwf6u6vgj5	cltenantdefault0000000000	Таран Лидия	Таран	Лидия	\N	\N	\N	\N	\N	\N	\N	Telegram	tsesarskaya_liliya	\N	\N	f	f	\N	2026-04-06 21:17:24.85	\N
cmnnoygvs009htjxwgdin9gfd	cltenantdefault0000000000	Таранова Алина Александрова	Таранова	Алина	Александрова	\N	\N	\N	\N	\N	8 921 567 45 39	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.856	\N
cmnnoyhr200e1tjxw1zcbgs1g	cltenantdefault0000000000	Темирханова Камилла	Темирханова	Камилла	\N	\N	\N	\N	\N	\N	89654919911	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.983	\N
cmnnoyhsj00edtjxwtffnbczj	cltenantdefault0000000000	Тенчурина	Тенчурина	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.035	\N
cmnnoygw2009itjxwvb4c0qea	cltenantdefault0000000000	Теплова Мария Борисовна	Теплова	Мария	Борисовна	\N	ортодонт	\N	\N	\N	8 921 595 9318	\N	\N	2025-09-19 12:00:00	\N	f	f	\N	2026-04-06 21:17:24.867	\N
cmnnoygwc009jtjxww182vsda	cltenantdefault0000000000	Теплякова Ирина Владимировна	Теплякова	Ирина	Владимировна	\N	ортодонт	\N	\N	\N	8 911 083 6456	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.876	\N
cmnnoyhrb00e3tjxwcedg8iwc	cltenantdefault0000000000	Терентьев	Терентьев	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.991	\N
cmnnoygwn009ktjxwqv0lo6bq	cltenantdefault0000000000	Терентьева Екатерина Владимировна	Терентьева	Екатерина	Владимировна	\N	ортодонт, гнатолог	из MyOrt	\N	\N	8 921 334 3363	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.887	\N
cmnnoyhhv00catjxww1on44ha	cltenantdefault0000000000	Тертычная Ирина	Тертычная	Ирина	\N	\N	\N	\N	\N	\N	79062719037	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.652	\N
cmnnoyhg700c0tjxwoyqevfrc	cltenantdefault0000000000	Тетеркина Валерия Александровна	Тетеркина	Валерия	Александровна	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.592	\N
cmnnoygwy009ltjxwiel4vpvw	cltenantdefault0000000000	Течиев Заурбек Русланович	Течиев	Заурбек	Русланович	\N	ортодонт	\N	t.zaur15rus@mail.ru	\N	8 911 126 4145	Telegram	techiev_zaurbek	\N	\N	f	f	\N	2026-04-06 21:17:24.899	\N
cmnnoygx9009mtjxw9v2eiblk	cltenantdefault0000000000	Тибилов Бимболат Бимболат Олегович	Тибилов Бимболат	Бимболат	Олегович	\N	ортодонт	\N	\N	\N	8 909 476 6031	Telegram	doctibilov	\N	\N	f	f	\N	2026-04-06 21:17:24.91	\N
cmnnoygxg009ntjxwcps5r63c	cltenantdefault0000000000	Тимербулатова Карина	Тимербулатова	Карина	\N	\N	\N	\N	\N	\N	8 937 161 1861	Telegram	tkarinaar	\N	\N	f	f	\N	2026-04-06 21:17:24.917	\N
cmnnoygxt009ptjxwt9p7qmxs	cltenantdefault0000000000	Тихомиров Илья	Тихомиров	Илья	\N	\N	техник	\N	\N	\N	\N	Telegram	mownojesko	\N	\N	f	f	\N	2026-04-06 21:17:24.929	\N
cmnnoyhqw00e0tjxwfmsf6t21	cltenantdefault0000000000	Тонян	Тонян	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.976	\N
cmnnoyhmc00d4tjxw7ib2flnf	cltenantdefault0000000000	Торосян	Торосян	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.813	\N
cmnnoyhs300e9tjxwbl4po1xz	cltenantdefault0000000000	Тотиков	Тотиков	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.019	\N
cmnnoygxz009qtjxwwdbq20wd	cltenantdefault0000000000	Трегубова Галина Ивановна	Трегубова	Галина	Ивановна	\N	\N	\N	\N	\N	8 912 815 1948	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.936	\N
cmnnoyi0w00g6tjxwvzg5mbwm	cltenantdefault0000000000	Трезубов	Трезубов	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.336	\N
cmnnoyhp000dotjxwbl6drqxk	cltenantdefault0000000000	Третьякова	Третьякова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.909	\N
cmnnoygy7009rtjxwd0qcxm8a	cltenantdefault0000000000	Трифонов Михаил Юрьевич	Трифонов	Михаил	Юрьевич	\N	\N	\N	\N	\N	8 960 246 4414	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.943	\N
cmnnoyhav00b4tjxw4un5pl2a	cltenantdefault0000000000	Трубочкина Наталья Васильевна	Трубочкина	Наталья	Васильевна	\N	\N	\N	\N	\N	+7 911 236-83-68	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.399	\N
cmnnoyhet00brtjxw29s2rzjh	cltenantdefault0000000000	Туаева	Туаева	\N	\N	\N	\N	\N	\N	\N	\N	Telegram	i_alanovna	\N	\N	f	f	\N	2026-04-06 21:17:25.541	\N
cmnnoygyd009stjxwoqomlxzv	cltenantdefault0000000000	Турченко Кристина Викторовна	Турченко	Кристина	Викторовна	\N	ортодонт	\N	\N	\N	8 993 219 6301\n8 931 224 8595	Telegram	kristtur	\N	\N	f	f	\N	2026-04-06 21:17:24.95	\N
cmnnoyhih00cetjxwr4xx0fpd	cltenantdefault0000000000	Тыщенко	Тыщенко	\N	\N	\N	\N	\N	\N	\N	9312649866	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.674	\N
cmnnoygyk009ttjxwyvnio5sa	cltenantdefault0000000000	Уварова Арина Вячеславовна	Уварова	Арина	Вячеславовна	\N	ортодонт	\N	\N	\N	8 921 182 9103	Telegram	arishauvarova	2025-12-15 12:00:00	\N	f	f	\N	2026-04-06 21:17:24.957	\N
cmnnoyhtj00ektjxwlho5bpqp	cltenantdefault0000000000	Урсуленко Нина Владимировна	Урсуленко	Нина	Владимировна	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.071	\N
cmnnoygyu009utjxwmre9p43t	cltenantdefault0000000000	Усатова Анастасия Сергеевна	Усатова	Анастасия	Сергеевна	\N	\N	доктор из инсты	\N	\N	8 953 364 2505	Telegram	a_usatov	2025-02-25 12:00:00	\N	f	f	\N	2026-04-06 21:17:24.967	\N
cmnnoyhh600c6tjxwro8j2vq9	cltenantdefault0000000000	Усачев Антон Юрьевич	Усачев	Антон	Юрьевич	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.627	\N
cmnnoygz1009vtjxwbks2lybo	cltenantdefault0000000000	Успенская Ольга Юрьевна	Успенская	Ольга	Юрьевна	\N	ортопед	\N	\N	\N	8 911 788 9049	Telegram	OlgaUspenskaia	\N	\N	f	f	\N	2026-04-06 21:17:24.974	\N
cmnnoygz9009wtjxwst98zds1	cltenantdefault0000000000	Федорова Анастасия Вадимовна	Федорова	Анастасия	Вадимовна	\N	\N	\N	\N	\N	8 921 597 0237	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:24.981	\N
cmnnoyfds004otjxw2kdopvxi	cltenantdefault0000000000	Федорова Анастасия Олеговна	Федорова	Анастасия	Олеговна	\N	ортодонт	\N	\N	\N	8 921 959 2513	Telegram	AnastasiiiaFedorova	\N	\N	f	f	\N	2026-04-06 21:17:22.913	\N
cmnnoyhqh00dxtjxwqohmkt9x	cltenantdefault0000000000	Федотова	Федотова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.961	\N
cmnnoyhgu00c4tjxwnek21mup	cltenantdefault0000000000	Фейзуханов	Фейзуханов	\N	\N	\N	\N	\N	\N	\N	89516401008	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.615	\N
cmnnoygzu009xtjxwm6qascts	cltenantdefault0000000000	Ференци Линда Адамовна	Ференци	Линда	Адамовна	\N	ортопед	\N	\N	\N	8 900 633 4300	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.003	\N
cmnnoyh05009ytjxwngx4uh1m	cltenantdefault0000000000	Филизат Анастасия Сергеевна	Филизат	Анастасия	Сергеевна	\N	\N	\N	\N	\N	8 931 234 4841	Telegram	miniastice	\N	\N	f	f	\N	2026-04-06 21:17:25.013	\N
cmnnoyh0c009ztjxw5x43unx7	cltenantdefault0000000000	Филиппов Рафаэль Валерьевич	Филиппов	Рафаэль	Валерьевич	\N	хирург	от Ромы	\N	\N	8 911 112 26 66	Telegram	MisterX89	\N	\N	f	f	\N	2026-04-06 21:17:25.02	\N
cmnnoyh0m00a0tjxwbqvalu21	cltenantdefault0000000000	Филиппова Алина Владиславовна	Филиппова	Алина	Владиславовна	\N	\N	\N	\N	\N	8 931 576 4307	Telegram	ortho_av	\N	\N	f	f	\N	2026-04-06 21:17:25.031	\N
cmnnoyht800eitjxwxqd2b9qy	cltenantdefault0000000000	Фонарев Евгений Михайлович	Фонарев	Евгений	Михайлович	\N	\N	\N	\N	\N	7 965 797-66-96	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.06	\N
cmnnoyh6y00artjxw5pfujc99	cltenantdefault0000000000	Шуваева Юлия Владимировна	Шуваева	Юлия	Владимировна	\N	ортодонт	\N	\N	\N	8 921 962 2517	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.259	\N
cmnnoyh0x00a1tjxwlwlrbbrw	cltenantdefault0000000000	Фридман (Резниченко) Анна Станиславовна	Фридман (Резниченко)	Анна	Станиславовна	Резниченко	ортодонт	\N	\N	\N	8 928 753 7913	Telegram	annafridmanortho	\N	\N	f	f	\N	2026-04-06 21:17:25.042	\N
cmnnoyho600dhtjxw9j1uj2if	cltenantdefault0000000000	Ханайченко	Ханайченко	\N	\N	\N	\N	\N	\N	\N	89214093555	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.879	\N
cmnnoyh1700a2tjxwo2fosmxa	cltenantdefault0000000000	Харламов Дмитрий Олегович	Харламов	Дмитрий	Олегович	\N	\N	\N	\N	\N	8 999 026 3522	Telegram	dmtxx	\N	\N	f	f	\N	2026-04-06 21:17:25.052	\N
cmnnoyh1e00a3tjxww50fa75p	cltenantdefault0000000000	Хашкулов Алим Русланович	Хашкулов	Алим	Русланович	\N	ортопед	\N	\N	\N	8 921 757 9678	Telegram	ammatur	\N	\N	f	f	\N	2026-04-06 21:17:25.058	\N
cmnnoyhnd00dbtjxw3n571q2f	cltenantdefault0000000000	Хвалевич	Хвалевич	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.849	\N
cmnnoyh1p00a4tjxwryytuizu	cltenantdefault0000000000	Хворостенко Екатерина Александровна	Хворостенко	Екатерина	Александровна	\N	\N	\N	\N	\N	8 916 946 1333	Telegram	ekaterina_khorostenko	\N	\N	f	f	\N	2026-04-06 21:17:25.069	\N
cmnnoyh1v00a5tjxwhgolt404	cltenantdefault0000000000	Хорева Елена	Хорева	Елена	\N	\N	ортодонт	\N	\N	\N	8 961 247 6018	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.075	\N
cmnnoyhz200fttjxwbazsgj6v	cltenantdefault0000000000	Хохлова Анна Робертовна	Хохлова	Анна	Робертовна	\N	\N	\N	\N	\N	89117613088	Telegram	dr_annarobertovna	\N	\N	f	f	\N	2026-04-06 21:17:26.27	\N
cmnnoyh2700a6tjxw04mneljr	cltenantdefault0000000000	Худоногова Елена	Худоногова	Елена	\N	\N	ортодонт	\N	\N	\N	8 921 962 0321	\N	\N	2025-02-03 12:00:00	\N	f	f	\N	2026-04-06 21:17:25.087	\N
cmnnoyhk300cptjxwqu3bgv2e	cltenantdefault0000000000	Хуторная Елизавета Игоревна	Хуторная	Елизавета	Игоревна	\N	\N	\N	\N	\N	8-960-926-60-47	Telegram	liesekhutornaya	\N	\N	f	f	\N	2026-04-06 21:17:25.731	\N
cmnnoyh2f00a7tjxwvcr3hzlk	cltenantdefault0000000000	Цалко Игорь	Цалко	Игорь	\N	\N	\N	\N	\N	\N	8 921 965 5841	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.095	\N
cmnnoyh2k00a8tjxwn5e328p2	cltenantdefault0000000000	Цесарская (Таран) Лидия	Цесарская (Таран)	Лидия	\N	Таран	\N	\N	\N	\N	\N	Telegram	tsesarskaya_liliya	\N	\N	f	f	\N	2026-04-06 21:17:25.101	\N
cmnnoyh2p00a9tjxw0g0ss7gx	cltenantdefault0000000000	Цуранов	Цуранов	\N	\N	\N	\N	\N	\N	\N	8 950 003 8465	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.106	\N
cmnnoyho100dgtjxw3uzrkk3x	cltenantdefault0000000000	Частило Виталий Александрович	Частило	Виталий	Александрович	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.874	\N
cmnnoyh3000aatjxwij0v44w1	cltenantdefault0000000000	Чеминава Ирина Ревдиковна	Чеминава	Ирина	Ревдиковна	\N	\N	\N	\N	\N	8 921 959 0481	Telegram	ira_irina_irina	\N	\N	f	f	\N	2026-04-06 21:17:25.116	\N
cmnnoyh3b00abtjxwaqf4bs3o	cltenantdefault0000000000	Чепелева Мария	Чепелева	Мария	\N	\N	ортодонт	\N	\N	\N	8 929 272 3998	Telegram	chepeleva_maria	2025-08-22 12:00:00	\N	f	f	\N	2026-04-06 21:17:25.127	\N
cmnnoyhvh00eytjxwjg4fs4yb	cltenantdefault0000000000	Черненко	Черненко	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.142	\N
cmnnoyh3m00actjxwbheq4m2b	cltenantdefault0000000000	Чернова Олеся	Чернова	Олеся	\N	\N	\N	\N	\N	\N	8 981 852 13 00	Telegram	olesyach07	\N	\N	f	f	\N	2026-04-06 21:17:25.138	\N
cmnnoyhsr00eftjxw7vki5h14	cltenantdefault0000000000	Чернявская	Чернявская	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.043	\N
cmnnoyhx600fdtjxwd3bfhhbm	cltenantdefault0000000000	Чернявский	Чернявский	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.202	\N
cmnnoyh3s00adtjxw6fczlu5t	cltenantdefault0000000000	Черняев Владимир Сергеевич	Черняев	Владимир	Сергеевич	\N	\N	\N	\N	\N	8 921 903 89 33	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.145	\N
cmnnoyh4400aetjxwa3o78yo9	cltenantdefault0000000000	Черняева Светлана Алексеевна	Черняева	Светлана	Алексеевна	\N	ортодонт	\N	\N	\N	8 921 331 8507	Telegram	Svetlanochka3003	\N	\N	f	f	\N	2026-04-06 21:17:25.156	\N
cmnnoyh4g00aftjxww2txfg4p	cltenantdefault0000000000	Чирко Инна Сергеевна	Чирко	Инна	Сергеевна	\N	\N	\N	\N	\N	8 931 313 2256	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.168	\N
cmnnoyh4r00agtjxwn9a4cd5k	cltenantdefault0000000000	Чиркова Дарья Денисовна	Чиркова	Дарья	Денисовна	\N	ортодонт	Воронеж	\N	\N	\N	Telegram	dr_chirkova_ds	2025-03-29 12:00:00	\N	f	f	\N	2026-04-06 21:17:25.179	\N
cmnnoyhf800butjxwmo3bgq7s	cltenantdefault0000000000	Чобанян	Чобанян	\N	\N	\N	\N	\N	\N	\N	7 950 010 8833	Telegram	maswyyn_18	\N	\N	f	f	\N	2026-04-06 21:17:25.556	\N
cmnnoyhdw00bltjxws4who59x	cltenantdefault0000000000	Чуприна Дарина	Чуприна	Дарина	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.508	\N
cmnnoyh4x00ahtjxwdfv1ckhq	cltenantdefault0000000000	Шабунина Валентина Васильевна	Шабунина	Валентина	Васильевна	\N	\N	\N	\N	\N	8 905 201 6640	Telegram	mishkakoalla	\N	\N	f	f	\N	2026-04-06 21:17:25.186	\N
cmnnoyh5500aitjxwtzs1l3l2	cltenantdefault0000000000	Шаврова Кристина О	Шаврова	Кристина	О	\N	ортодонт	\N	\N	\N	8 914 878 6393	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.193	\N
cmnnoyh5g00ajtjxwp10tp1ps	cltenantdefault0000000000	Шапкун Полина	Шапкун	Полина	\N	\N	\N	\N	\N	\N	8 911 097 9254	Telegram	Relingster	\N	\N	f	f	\N	2026-04-06 21:17:25.204	\N
cmnnoyhbn00b8tjxwuroioyv8	cltenantdefault0000000000	Шаповалова Валерия Александровна	Шаповалова	Валерия	Александровна	\N	\N	\N	\N	\N	+ 7 911 254 6352	Telegram	lerroiiii	\N	\N	f	f	\N	2026-04-06 21:17:25.427	\N
cmnnoyh5o00aktjxwsdnmjv5q	cltenantdefault0000000000	Шария	Шария	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.213	\N
cmnnoyh5v00altjxwcwqa6niz	cltenantdefault0000000000	Шатилов Игорь Вячеславович	Шатилов	Игорь	Вячеславович	\N	\N	\N	shatilov@credus.su	\N	8 911 328 8733	Telegram	kopcile	\N	\N	f	f	\N	2026-04-06 21:17:25.219	\N
cmnnoyhsv00egtjxwrd0q8irv	cltenantdefault0000000000	Шатохина	Шатохина	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.048	\N
cmnnoyh6600amtjxwdga6ob00	cltenantdefault0000000000	Шебатина Анастасия	Шебатина	Анастасия	\N	\N	\N	\N	\N	\N	8 911 709 9579	Telegram	Anastasia_Shebatina	\N	\N	f	f	\N	2026-04-06 21:17:25.23	\N
cmnnoyhr700e2tjxwof3q2rt0	cltenantdefault0000000000	Шепель	Шепель	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.987	\N
cmnnoyh6c00antjxwwdafsxqp	cltenantdefault0000000000	Шестиперов Артем	Шестиперов	Артем	\N	\N	\N	\N	\N	\N	8 911 987 3630	Telegram	ArtemShestiperov	\N	\N	f	f	\N	2026-04-06 21:17:25.237	\N
cmnnoyh6g00aotjxwz1sngxxv	cltenantdefault0000000000	Шипулина	Шипулина	\N	\N	\N	\N	\N	\N	\N	\N	Telegram	Mari_riri	\N	\N	f	f	\N	2026-04-06 21:17:25.241	\N
cmnnoyh6m00aptjxw7yctrqn7	cltenantdefault0000000000	Ширшов Денис Юрьевич	Ширшов	Денис	Юрьевич	\N	\N	\N	\N	\N	8 911 763 9512	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.247	\N
cmnnoyhsm00eetjxwwddvwr2g	cltenantdefault0000000000	Ширяева	Ширяева	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.039	\N
cmnnoyhuc00eqtjxwxavqe3fm	cltenantdefault0000000000	Шпак	Шпак	\N	\N	\N	\N	\N	\N	\N	79602382565	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.101	\N
cmnnoyh6s00aqtjxwf4wioizs	cltenantdefault0000000000	Шуба	Шуба	\N	\N	\N	хирург	\N	\N	\N	8 921 575 0484	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.253	\N
cmnnoyhy400fmtjxwhwsgpb1r	cltenantdefault0000000000	Шустова	Шустова	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.237	\N
cmnnoyhtd00ejtjxw7gmfcnvf	cltenantdefault0000000000	Шухалова Владлена Андреевна	Шухалова	Владлена	Андреевна	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:26.066	\N
cmnnoyh7600astjxwq8oaqfu7	cltenantdefault0000000000	Щибря Андрей Владимирович	Щибря	Андрей	Владимирович	\N	ортопед, хирург	\N	\N	\N	8 951 667 5050	Telegram	shchibria	\N	\N	f	f	\N	2026-04-06 21:17:25.267	\N
cmnnoyh7j00attjxwzq6k87is	cltenantdefault0000000000	Эмдин Леонид Михайлович	Эмдин	Леонид	Михайлович	\N	ортопед	\N	dr.emdin@me.com	\N	8 931 244 9186	Telegram	leon_leonid_emdin	\N	\N	f	f	\N	2026-04-06 21:17:25.279	\N
cmnnoyhgj00c2tjxwxr4iqib9	cltenantdefault0000000000	Энгиноев Альви Тамерланович	Энгиноев	Альви	Тамерланович	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.604	\N
cmnnoyh7w00autjxw8gq5j2lw	cltenantdefault0000000000	Эрдман Альбина Эриковна	Эрдман	Альбина	Эриковна	\N	ортодонт	\N	\N	\N	8 911 833 2548	Telegram	AlbinaErdman	\N	\N	f	f	\N	2026-04-06 21:17:25.293	\N
cmnnoyh8700avtjxwrhn0ihvl	cltenantdefault0000000000	Эрцинь Юлия Леоновна	Эрцинь	Юлия	Леоновна	Леонова	ортодонт	\N	\N	\N	8 981 842 4597	Telegram	juliaertsin	\N	\N	f	f	\N	2026-04-06 21:17:25.304	\N
cmnnoyh8g00awtjxwqaopevpw	cltenantdefault0000000000	Юзлибаева	Юзлибаева	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.313	\N
cmnnoyhcu00bftjxwwl7z1pu4	cltenantdefault0000000000	Юркевич	Юркевич	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.47	\N
cmnnoyh8q00axtjxwyum3yh0v	cltenantdefault0000000000	Юферова Кира Игоревна	Юферова	Кира	Игоревна	\N	\N	\N	\N	\N	\N	Telegram	Yuferova	\N	\N	f	f	\N	2026-04-06 21:17:25.322	\N
cmnnoyhoe00djtjxw3kh4qobo	cltenantdefault0000000000	Якобчук	Якобчук	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.887	\N
cmnnoyh9400aytjxwi62rjksb	cltenantdefault0000000000	Яковлева Анастасия Дмитреевна	Яковлева	Анастасия	Дмитреевна	\N	ортодонт	\N	anastasia.yakvlv@yandex.ru	\N	8 900 560 0954	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.337	\N
cmnnoyh9g00aztjxw7z4z68ud	cltenantdefault0000000000	Ялышева Диана Рашитовна	Ялышева	Диана	Рашитовна	\N	ортодонт	\N	\N	\N	8 981 990 4777	\N	\N	\N	\N	f	f	\N	2026-04-06 21:17:25.349	\N
cmnnoyh9q00b0tjxw11mff0d8	cltenantdefault0000000000	Ярмолинский Илья Борисович	Ярмолинский	Илья	Борисович	\N	ортопед	\N	il787878@mail.ru	\N	\N	Telegram	ilya787878	\N	\N	f	f	\N	2026-04-06 21:17:25.359	\N
sys-placeholder-doctor-reimport	cltenantdefault0000000000	— Врач не задан (заказы после сброса справочника)	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-06 21:01:57.986	\N
cmnz8rm0v000btjgssr5zvbn7	cltenantdefault0000000000	ТЕСТОВ	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-14 23:17:25.183	\N
cmnz8rnzg000ftjgsak9jw7yx	cltenantdefault0000000000	ТЕСТОВ	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	f	\N	2026-04-14 23:17:27.724	\N
\.


--
-- Data for Name: DoctorClinicLinkSuppression; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DoctorClinicLinkSuppression" ("doctorId", "clinicId", "createdAt") FROM stdin;
\.


--
-- Data for Name: DoctorOnClinic; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DoctorOnClinic" ("doctorId", "clinicId") FROM stdin;
cmnnoyfag0047tjxw26labemd	cmnnlv6l7000btjogxzxfdw1w
cmnnoyefu0000tjxw1r3hfcj7	cmnokksp6000dtj50od7c0e07
cmnnoyegi0001tjxwlnb75v4h	cmnokksp6000dtj50od7c0e07
cmnnoygs80094tjxwn4t8mm8h	cmnnlv8yp00dztjogjbgbuihx
cmnnoygs80094tjxwn4t8mm8h	cmnnlv6yz002htjogsz2twydz
cmnnoygs80094tjxwn4t8mm8h	cmnnlv80c008otjognik02ttj
cmnnoyfz3006ntjxwbhjpo2ha	cmnokktgh001ntj50mf85yoni
cmnnoyfz3006ntjxwbhjpo2ha	cmnnn6gyl0072tj80k3fovvph
seed-doc-ivanov	seed-clinic-klinikaklik
seed-doc-sergeeva	seed-clinic-klinikaklik
cmnnoyegi0001tjxwlnb75v4h	cmnnlv6im0000tjogesc6vytl
cmnz8rm0v000btjgssr5zvbn7	cmnz8rm0k000atjgsxhsfe1dg
cmnz8rnzg000ftjgsak9jw7yx	cmnz8rnz9000etjgsibca7uge
cmnnoyefu0000tjxw1r3hfcj7	cmnnlv6t8001mtjogkr06heje
cmnnoyf9r0043tjxw5hnrxr5j	cmnnlv6uo001vtjogxi0a6tii
cmnnoygew0080tjxwpr7v2kkn	cmnnlv7xx008btjoggqmvawg6
cmnnoyh7600astjxwq8oaqfu7	cmnnlv71t002ztjogk99z3jwh
cmnnoyh3000aatjxwij0v44w1	cmnnlv8c800ahtjogey95sox0
cmnnoyfsl0064tjxw01348f5l	cmnnlv75s003ptjogtva5nzil
cmnnoyfgn004ytjxww3hn4eqe	cmnnn6fbf0059tj801igftuj2
cmnnoyg3s0071tjxw98sn69dq	cmnnlv7ko006ftjogcp6pir7z
cmnnoyfwj006htjxwholb1gtd	cmnnlv7fe005htjogajn98ihj
cmnnoyeyp002atjxw0ioneel7	cmnnn6fsf005stj80dqsli9lh
\.


--
-- Data for Name: InventoryItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."InventoryItem" (id, "warehouseId", sku, name, unit, manufacturer, "unitsPerSupply", "referenceUnitPriceRub", notes, "isActive", "sortOrder", "createdAt", "updatedAt") FROM stdin;
cmoabj0r9000itjfw3xprchgp	cmoabi9pz000gtjfw4hm18cbd	D01S	Смола	1	Resione	16	4000	\N	t	0	2026-04-22 17:20:11.158	2026-04-22 17:20:11.158
\.


--
-- Data for Name: KaitenCardType; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."KaitenCardType" (id, "tenantId", name, "externalTypeId", "sortOrder", "isActive") FROM stdin;
cmnrrut2y0000tj2skbld7b8d	cltenantdefault0000000000	Временные	440727	10	t
cmnrrut3c0001tj2su2qrrejy	cltenantdefault0000000000	МиоСплинт	546092	20	t
cmnrrut3s0002tj2sk6928kbs	cltenantdefault0000000000	Модели	543506	30	t
cmnrrut440003tj2ssrjsrx25	cltenantdefault0000000000	Накладки	440723	40	t
cmnrrut4l0004tj2sic2tldo4	cltenantdefault0000000000	Накладки МРТ	440724	50	t
cmnrrut530005tj2sn1es495c	cltenantdefault0000000000	Постоянные	453505	60	t
cmnrrut8o0006tj2skjaa5lnx	cltenantdefault0000000000	Сплинт	440721	70	t
cmnrrut950007tj2swyec0tlj	cltenantdefault0000000000	Сплинт МРТ	440722	80	t
cmoa3ej690000tjbst1px1hjz	cltenantdefault0000000000	ОртоАппараты	644603	60	t
cmobkq2os00eetjq0iczk15mz	cltenantdefault0000000000	ОртоАппараты х Хирургия	649642	0	t
cmobmkc0z013xtjq0yyfffwmy	cltenantdefault0000000000	Хирургия	649632	0	t
\.


--
-- Data for Name: Material; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Material" (id, name) FROM stdin;
seed-mat-zro2	Диоксид циркония
\.


--
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Order" (id, "tenantId", "orderNumber", "clinicId", "doctorId", "patientName", "appointmentDate", "dueDate", "dueToAdminsAt", "workReceivedAt", status, notes, "clientOrderText", "isUrgent", "urgentCoefficient", "labWorkStatus", "legalEntity", payment, "excludeFromReconciliation", "excludeFromReconciliationUntil", shade, "hasScans", "hasCt", "hasMri", "hasPhoto", "additionalSourceNotes", "quickOrder", prosthetics, "kaitenDecideLater", "kaitenCardTypeId", "kaitenTrackLane", "kaitenAdminDueHasTime", "kaitenCardTitleLabel", "kaitenCardId", "demoKanbanColumn", "kaitenSyncError", "kaitenSyncedAt", "kaitenColumnTitle", "kaitenCardSortOrder", "kaitenCardTitleMirror", "kaitenCardDescriptionMirror", "kaitenBlocked", "kaitenBlockReason", "invoiceIssued", "invoiceNumber", "invoicePaperDocs", "invoiceSentToEdo", "invoiceEdoSigned", "invoicePrinted", "narjadPrinted", "adminShippedOtpr", "shippedDescription", "invoiceParsedLines", "invoiceParsedTotalRub", "invoiceParsedSummaryText", "invoicePaymentNotes", "orderPriceListKind", "orderPriceListNote", "compositionDiscountPercent", "continuesFromOrderId", "prostheticsOrdered", "correctionTrack", "registeredByLabel", "courierId", "courierPickupId", "courierDeliveryId", "invoiceAttachmentId", "archivedAt", "createdAt", "updatedAt") FROM stdin;
cmoa58dqt0005tjyoexrs25v5	cltenantdefault0000000000	2604-002	cmnokksp6000dtj50od7c0e07	cmnnoyegi0001tjxwlnb75v4h	ТЕСТ	2026-04-26 09:00:00	2026-04-25 09:00:00	2026-04-26 09:00:00	\N	REVIEW	\N	\N	t	1.2	TO_SCAN	\N	СВЕРКА	f	\N	\N	f	f	f	f	\N	{"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}	\N	f	cmnrrut8o0006tj2skjaa5lnx	ORTHODONTICS	t	ТЕСТ	63865388	\N	\N	2026-04-22 15:23:29.13	Согласование	1	НОВЫЙ ДОК · НОВАЯ КЛИНИКА\n2604-002 Тест\nАбдулабеков Г.А. ТЕСТ 25.04 12:00	\N	f	\N	f	\N	f	f	f	t	f	f	\N	\N	\N	\N	\N	\N	\N	0	\N	f	\N	@vsevolodsokolov	\N	\N	\N	\N	\N	2026-04-22 14:23:57.077	2026-04-22 17:13:22.342
cmoblf0gi013qtjq0smyqlre0	cltenantdefault0000000000	2604-004	cmnokksp6000dtj50od7c0e07	cmnnoyegi0001tjxwlnb75v4h	Соколов Всеволод Владимирович	2026-04-25 09:00:00	2026-04-25 09:00:00	2026-04-25 09:00:00	\N	REVIEW	\N	\N	f	\N	TO_SCAN	\N	СВЕРКА	f	\N	\N	f	f	f	f	\N	{"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}	\N	f	cmnrrut950007tj2swyec0tlj	ORTHOPEDICS	t	тест	63913458	\N	\N	2026-04-23 16:40:59.314	К исполнению	930.3926933197512	2604-005 Соколов В.В.\nАбдулабеков Г.А. тест 25.04 12:00	\N	f	\N	f	\N	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	0	\N	f	\N	@vsevolodsokolov	\N	\N	\N	\N	\N	2026-04-23 14:44:46.482	2026-04-24 22:56:36.942
cmocqbyc50d5a6z017fug0102	cltenantdefault0000000000	2604-363	cmnnlv6uo001vtjogxi0a6tii	cmnnoyf9r0043tjxw5hnrxr5j	Горбунова Арина Алексеевна	2026-05-15 10:00:00	2026-05-13 06:00:00	2026-05-15 10:00:00	2026-04-24 07:00:00	REVIEW	\N	"Горбунова Арина Алексеевна\nхирургический шаблон для аппарата быстрого небного расширения с опорой на 2 микровинта\n\nдата сдачи: 15.05.2026, в 13:00, атрибьют мед, чкаловский пр-кт 50\nврач: Кислова ЮЛ, Шпак АС"	f	\N	TO_EXECUTION	ООО	СВЕРКА	f	\N	\N	t	t	f	f	\N	{"v": 2, "tiles": [], "continueWork": null}	\N	f	cmoa3ej690000tjbst1px1hjz	ORTHODONTICS	t	Расширяющий	63940239	\N	\N	2026-04-24 09:50:17.839	Согласование	1713.218431931694	2604-363 Горбунова А.А.\nКислова Ю.Л. Расширяющий 13.05 09:00	Заказ от клиента:\n"Горбунова Арина Алексеевна\nхирургический шаблон для аппарата быстрого небного расширения с опорой на 2 микровинта\n\nдата сдачи: 15.05.2026, в 13:00, атрибьют мед, чкаловский пр-кт 50\nврач: Кислова ЮЛ, Шпак АС"	f	\N	f	\N	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	0	\N	f	\N	ТестСрм	\N	\N	\N	\N	\N	2026-04-24 09:50:08.021	2026-04-29 10:14:41.22
cmocqzu730g356z01vwxqfyib	cltenantdefault0000000000	2604-364	cmnnlv7xx008btjoggqmvawg6	cmnnoygew0080tjxwpr7v2kkn	Мочалин Д.Е.	2026-05-07 07:00:00	2026-05-06 06:00:00	2026-05-07 07:00:00	2026-04-24 08:00:00	REVIEW	\N	Врач: Пушняков И.В.\nПац: Мочалин Д.Е.\nИзготовить небный дистактор. Границу дистрактора расположить отступив 2 мм от шеек зубов к 07.05.2026 10:00 (Медалл)"	f	\N	TO_EXECUTION	ООО	СВЕРКА	f	\N	\N	f	f	f	f	\N	{"v": 2, "tiles": [], "continueWork": null}	null	f	cmoa3ej690000tjbst1px1hjz	ORTHODONTICS	t	Дебный Дистактор	63941355	\N	\N	2026-04-24 10:09:59.748	Мануал	5675.468809528376	2604-364 Мочалин Д.Е.\nПушняков И.В. Небный Дистактор 06.05 09:00	Заказ от клиента:\nВрач: Пушняков И.В.\nПац: Мочалин Д.Е.\nИзготовить небный дистактор. Границу дистрактора расположить отступив 2 мм от шеек зубов к 07.05.2026 10:00 (Медалл)"	f	\N	f	\N	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	0	\N	f	ORTHODONTICS	ТестСрм	\N	\N	\N	\N	\N	2026-04-24 10:08:42.399	2026-04-29 09:57:53.98
cmocr1apw0gku6z01zvyczcis	cltenantdefault0000000000	ARCH:cmocr1apw0gku6z01zvyczcis	cmnnlv7xx008btjoggqmvawg6	cmnnoygew0080tjxwpr7v2kkn	Мочалин Д.Е.	2026-05-07 07:00:00	2026-05-06 06:00:00	2026-05-07 07:00:00	2026-04-24 08:00:00	REVIEW	\N	Врач: Пушняков И.В.\nПац: Мочалин Д.Е.\nИзготовить небный дистактор. Границу дистрактора расположить отступив 2 мм от шеек зубов к 07.05.2026 10:00 (Медалл)"	f	\N	TO_EXECUTION	ООО	СВЕРКА	f	\N	\N	f	f	f	f	\N	{"v": 2, "tiles": [], "continueWork": null}	\N	f	cmoa3ej690000tjbst1px1hjz	ORTHODONTICS	t	Дебный Дистактор	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	0	\N	f	ORTHODONTICS	ТестСрм	\N	\N	\N	\N	2026-04-24 10:18:41.227	2026-04-24 10:09:50.468	2026-04-24 10:18:41.229
cmoab8aif0005tjfwjg0z14gy	cltenantdefault0000000000	2604-003	cmnokksp6000dtj50od7c0e07	cmnnoyegi0001tjxwlnb75v4h	Соколов Всеволод Владимирович	2026-04-24 09:00:00	2026-04-26 09:00:00	2026-04-24 09:00:00	\N	REVIEW	\N	\N	t	1.2	TO_SCAN	\N	СВЕРКА	f	\N	\N	f	f	f	f	\N	{"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}	null	f	cmnrrut2y0000tj2skbld7b8d	ORTHOPEDICS	t	ТЕСТ	63870276	\N	\N	2026-04-24 16:45:49.935	Согласование	1	НОВЫЙ ДОК · НОВАЯ КЛИНИКА\n2604-003 Соколов В.В.\nАбдулабеков Г.А. ТЕСТ КЭФ 1,2 26.04 12:00	\N	f	\N	t	№733 от 21 апреля 2026	f	f	f	t	f	f	\N	[{"qty": 1, "code": "-1001", "name": "Сплинт сложный", "lineTotalRub": 18095}, {"qty": 1, "code": "-2008", "name": "Просмотр исследования КЛКТ/МСКТ", "lineTotalRub": 3333}]	22500	-1001 · Сплинт сложный\n-2008 · Просмотр исследования КЛКТ/МСКТ	\N	\N	\N	0	\N	f	\N	@vsevolodsokolov	\N	\N	\N	c35c9ede-8435-4fc4-a703-44de2591498d	\N	2026-04-22 17:11:50.583	2026-04-24 22:24:26.564
cmocsbpy20k5k6z0118yjtte8	cltenantdefault0000000000	2604-366	cmnnlv71t002ztjogk99z3jwh	cmnnoyh7600astjxwq8oaqfu7	Булатова Мария Сергеевна	2026-05-12 06:00:00	2026-05-08 06:00:00	2026-05-12 06:00:00	2026-04-24 09:00:00	REVIEW	\N	КликЛАБ\nЗаказчик: АйсКлиник\nФИО и возраст пациента: Булатова Мария Сергеевна\nФИО лечащего врача: Щибря А. В.	f	\N	TO_EXECUTION	ООО	Ожидает оплаты	f	\N	\N	f	f	f	f	\N	{"v": 2, "tiles": [], "continueWork": null}	null	f	cmnrrut530005tj2sn1es495c	ORTHOPEDICS	t	Ортопедия ДЦ	63943832	\N	\N	2026-04-27 16:42:29.907	Мануал	9.445849431897276	2604-366 Булатова М.С.\nЩибря А.В. Ортопедия ДЦ 08.05 09:00	Заказ от клиента:\nКликЛАБ\nЗаказчик: АйсКлиник\nФИО и возраст пациента: Булатова Мария Сергеевна\nФИО лечащего врача: Щибря А. В.	f	\N	f	\N	f	f	f	f	f	f	\N	\N	\N	\N	\N	\N	\N	0	\N	f	\N	ТестСрм	\N	\N	\N	\N	\N	2026-04-24 10:45:56.378	2026-04-29 10:01:04.414
cmoa4ja9a0001tjyo19e90aqc	cltenantdefault0000000000	ARCH:cmoa4ja9a0001tjyo19e90aqc	cmnokksp6000dtj50od7c0e07	cmnnoyegi0001tjxwlnb75v4h	Соколов Всеволод Владимирович	2026-04-25 09:00:00	2026-04-23 09:00:00	2026-04-25 09:00:00	\N	REVIEW	\N	\N	f	\N	TO_SCAN	\N	СВЕРКА	f	\N	\N	f	f	f	f	\N	{"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}	\N	t	\N	\N	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	t	№733 от 21 апреля 2026	f	f	f	f	f	f	\N	[{"qty": 1, "code": "-1001", "name": "Сплинт сложный", "lineTotalRub": 18095}, {"qty": 1, "code": "-2008", "name": "Просмотр исследования КЛКТ/МСКТ", "lineTotalRub": 3333}]	22500	-1001 · Сплинт сложный\n-2008 · Просмотр исследования КЛКТ/МСКТ	\N	\N	\N	0	\N	f	\N	@vsevolodsokolov	\N	\N	\N	0c677ae5-7aa4-402d-8461-75ab2dcf69d9	2026-04-23 16:46:39.782	2026-04-22 14:04:26.158	2026-04-23 16:46:39.783
\.


--
-- Data for Name: OrderAttachment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OrderAttachment" (id, "orderId", "fileName", "mimeType", size, data, "diskRelPath", "uploadedToKaitenAt", "kaitenFileId", "createdAt") FROM stdin;
c35c9ede-8435-4fc4-a703-44de2591498d	cmoab8aif0005tjfwjg0z14gy	Счет покупателю № 733 от 21 апреля 2026 г.pdf	application/pdf	71787	\\x	orders/cmoab8aif0005tjfwjg0z14gy/c35c9ede-8435-4fc4-a703-44de2591498d	\N	\N	2026-04-22 23:39:11.032
0c677ae5-7aa4-402d-8461-75ab2dcf69d9	cmoa4ja9a0001tjyo19e90aqc	Счет покупателю № 733 от 21 апреля 2026 г.pdf	application/pdf	71787	\\x	orders/cmoa4ja9a0001tjyo19e90aqc/0c677ae5-7aa4-402d-8461-75ab2dcf69d9	\N	\N	2026-04-22 23:50:14.86
5e3f78cb-e4b0-4456-ba87-508d76209a5d	cmoblf0gi013qtjq0smyqlre0	Фридман -Романов.dentalCADscreenshot.png	image/png	648308	\\x	orders/cmoblf0gi013qtjq0smyqlre0/5e3f78cb-e4b0-4456-ba87-508d76209a5d	2026-04-23 14:44:48.543	57703463	2026-04-23 14:44:48.002
2e92081a-9fa7-41bb-88fc-cbde7fd9dd7f	cmoblf0gi013qtjq0smyqlre0	Фридман -Романов.dentalCADscreenshot.png	image/png	648308	\\x	orders/cmoblf0gi013qtjq0smyqlre0/2e92081a-9fa7-41bb-88fc-cbde7fd9dd7f	2026-04-23 15:25:13.084	57705446	2026-04-23 15:25:12.649
72da24b7-66d7-4553-b791-21987de1ec56	cmocqbyc50d5a6z017fug0102	image.png	image/png	41388	\\x	orders/cmocqbyc50d5a6z017fug0102/72da24b7-66d7-4553-b791-21987de1ec56	2026-04-24 09:50:18.554	57742065	2026-04-24 09:50:18.249
a28c493c-0c2e-464b-83a7-4608d26025b0	cmocqzu730g356z01vwxqfyib	image.png	image/png	33859	\\x	orders/cmocqzu730g356z01vwxqfyib/a28c493c-0c2e-464b-83a7-4608d26025b0	2026-04-24 10:19:31.933	57743944	2026-04-24 10:19:31.583
fcaa02a1-ac8f-4563-affd-01cc5ce354f3	cmocqzu730g356z01vwxqfyib	image.png	image/png	33859	\\x	orders/cmocqzu730g356z01vwxqfyib/fcaa02a1-ac8f-4563-affd-01cc5ce354f3	2026-04-24 10:19:32.007	57743945	2026-04-24 10:19:31.634
eb866e8f-7551-460c-a2b0-fc35d640d65c	cmocqzu730g356z01vwxqfyib	image.png	image/png	33859	\\x	orders/cmocqzu730g356z01vwxqfyib/eb866e8f-7551-460c-a2b0-fc35d640d65c	2026-04-24 10:19:38.254	57743951	2026-04-24 10:19:37.77
6b59be89-9586-40a8-a6aa-b20f621ecc40	cmocsbpy20k5k6z0118yjtte8	image.png	image/png	134058	\\x	orders/cmocsbpy20k5k6z0118yjtte8/6b59be89-9586-40a8-a6aa-b20f621ecc40	2026-04-24 10:46:38.372	57746459	2026-04-24 10:46:37.776
be34abf0-6e28-4a25-9191-90ef1cff3ddd	cmocsbpy20k5k6z0118yjtte8	image.png	image/png	14617	\\x	orders/cmocsbpy20k5k6z0118yjtte8/be34abf0-6e28-4a25-9191-90ef1cff3ddd	2026-04-24 10:46:38.314	57746458	2026-04-24 10:46:37.939
\.


--
-- Data for Name: OrderChatCorrection; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OrderChatCorrection" (id, "orderId", source, text, "kaitenCommentId", "createdAt", "resolvedAt", "resolvedByUserId", "rejectedAt", "rejectedByUserId") FROM stdin;
cmoaptkji0001tjokqcrlqvdb	cmoab8aif0005tjfwjg0z14gy	KAITEN	тест1	\N	2026-04-23 00:00:17.981	2026-04-23 00:19:30.392	cmnyoc1f80003tjtcx3nop3kq	\N	\N
cmoaptld60003tjok5njec3s9	cmoab8aif0005tjfwjg0z14gy	KAITEN	тест1	\N	2026-04-23 00:00:19.05	2026-04-23 00:19:31.69	cmnyoc1f80003tjtcx3nop3kq	\N	\N
cmoaqfqwk0001tjj8tx4w3i4f	cmoab8aif0005tjfwjg0z14gy	KAITEN	тест	81066874	2026-04-23 00:17:32.657	2026-04-23 00:19:32.915	cmnyoc1f80003tjtcx3nop3kq	\N	\N
cmoaqfqww0003tjj8axe4nl79	cmoab8aif0005tjfwjg0z14gy	KAITEN	тест1	81066908	2026-04-23 00:17:32.672	2026-04-23 00:19:34.096	cmnyoc1f80003tjtcx3nop3kq	\N	\N
cmoaqfqx00005tjj8mmvnvo36	cmoab8aif0005tjfwjg0z14gy	KAITEN	тест1	81066918	2026-04-23 00:17:32.677	2026-04-23 00:19:49.588	cmnyoc1f80003tjtcx3nop3kq	\N	\N
cmobak299014ptjj8r7gs4pgn	cmoab8aif0005tjfwjg0z14gy	KAITEN	тест3	81096911	2026-04-23 09:40:46.317	\N	\N	2026-04-23 09:57:44.703	cmnyoc1f80003tjtcx3nop3kq
cmobce8rt001ttjws1i9gpsgr	cmoab8aif0005tjfwjg0z14gy	KAITEN	СПЛИТНЕЦ	81102623	2026-04-23 10:32:14.057	2026-04-23 10:33:01.578	cmnyoc1f80003tjtcx3nop3kq	\N	\N
cmobi9817006ttjx0z1jml5wd	cmoab8aif0005tjfwjg0z14gy	KAITEN	тест4	81122055	2026-04-23 13:16:17.515	\N	\N	2026-04-23 13:16:48.307	cmnyoc1f80003tjtcx3nop3kq
cmobiaj89009jtjx004zen5j7	cmoab8aif0005tjfwjg0z14gy	KAITEN	тест5	81122190	2026-04-23 13:17:18.681	2026-04-23 13:17:54.368	cmnyoc1f80003tjtcx3nop3kq	\N	\N
cmobmpygi013ztjq0voxwjon7	cmoblf0gi013qtjq0smyqlre0	KAITEN	йо	81133555	2026-04-23 15:21:16.723	2026-04-23 15:21:33.251	cmnyoc1f80003tjtcx3nop3kq	\N	\N
cmobpi9et00b06z01bm51x74c	cmoblf0gi013qtjq0smyqlre0	KAITEN	! 1111111111	81136770	2026-04-23 16:39:16.517	2026-04-23 16:39:21.388	cmnyoc1f80003tjtcx3nop3kq	\N	\N
cmobpit4500di6z01afgqedqf	cmoblf0gi013qtjq0smyqlre0	KAITEN	! 11111	81136780	2026-04-23 16:39:42.053	2026-04-23 16:39:47.766	cmnyoc1f80003tjtcx3nop3kq	\N	\N
cmobpjz5x00n66z01vl7cq0tj	cmoblf0gi013qtjq0smyqlre0	KAITEN	hjhl	81136801	2026-04-23 16:40:36.55	\N	\N	2026-04-23 16:40:59.17	cmnyoc1f80003tjtcx3nop3kq
cmobxt06903686z01y5qnbjgz	cmoblf0gi013qtjq0smyqlre0	KAITEN	! 999	81139483	2026-04-23 20:31:34.69	\N	\N	\N	\N
cmobysonn03io6z01a09nlykp	cmoblf0gi013qtjq0smyqlre0	KAITEN	! не то сделал\nа сделал это\nеще то	81139786	2026-04-23 20:59:19.379	\N	\N	\N	\N
cmod4i9xm000f6z01mptlal1e	cmoab8aif0005tjfwjg0z14gy	KAITEN	! hhhh	81197278	2026-04-24 16:26:57.61	\N	\N	\N	\N
cmoh216wl0001tjlo5wtr0nzm	cmocsbpy20k5k6z0118yjtte8	KAITEN	тест	81263568	2026-04-27 10:28:46.004	2026-04-27 10:28:50.135	cmnyoc1f80003tjtcx3nop3kq	\N	\N
\.


--
-- Data for Name: OrderConstruction; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OrderConstruction" (id, "orderId", category, "constructionTypeId", "priceListItemId", "materialId", shade, "teethFdi", "bridgeFromFdi", "bridgeToFdi", arch, quantity, "unitPrice", "lineDiscountPercent", "sortOrder", "createdAt") FROM stdin;
cmocqbyc50d5b6z01p0d7fzi9	cmocqbyc50d5a6z017fug0102	PRICE_LIST	\N	cmnrmudj1001utjaw1avw1bol	\N	\N	\N	\N	\N	\N	1	30000	0	0	2026-04-24 09:50:08.021
cmocr1apw0gkv6z01kdi9ohie	cmocr1apw0gku6z01zvyczcis	PRICE_LIST	\N	cmnrmudjz0027tjawnsx7att4	\N	\N	\N	\N	\N	\N	1	8500	0	0	2026-04-24 10:09:50.468
cmocre5el0im26z01bd4hf5fn	cmocqzu730g356z01vwxqfyib	PRICE_LIST	\N	cmnrmudjz0027tjawnsx7att4	\N	\N	\N	\N	\N	\N	1	8500	0	0	2026-04-24 10:19:50.109
cmojvpkp60029tjwonel3sxnm	cmocsbpy20k5k6z0118yjtte8	PRICE_LIST	\N	cmnrmudfl000mtjawqbrztq7j	\N	\N	\N	\N	\N	\N	1	13500	0	0	2026-04-29 09:55:04.84
\.


--
-- Data for Name: OrderCustomTag; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OrderCustomTag" (id, "orderId", label) FROM stdin;
\.


--
-- Data for Name: OrderNumberSettings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OrderNumberSettings" (id, "postingYearMonth", "nextSequenceFloor", "updatedAt") FROM stdin;
cltenantdefault0000000000	2604	\N	2026-04-09 15:20:56.83
\.


--
-- Data for Name: OrderProstheticsRequest; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OrderProstheticsRequest" (id, "orderId", source, text, "kaitenCommentId", "createdAt", "resolvedAt", "resolvedByUserId", "rejectedAt", "rejectedByUserId") FROM stdin;
cmod4i9xw000h6z01nexp6emg	cmoab8aif0005tjfwjg0z14gy	KAITEN	атлтлва	81197312	2026-04-24 16:26:57.62	\N	\N	\N	\N
cmod4icef001d6z01uqbicvo8	cmoblf0gi013qtjq0smyqlre0	KAITEN	? 8888	81139457	2026-04-24 16:27:00.807	\N	\N	\N	\N
cmod4icem001f6z01ljrlyofv	cmoblf0gi013qtjq0smyqlre0	KAITEN	? 888	81139482	2026-04-24 16:27:00.814	\N	\N	\N	\N
cmod4icez001h6z01u59ygt43	cmoblf0gi013qtjq0smyqlre0	KAITEN	такое то основание\nеще основание\nче то еще\nаналоги	81139726	2026-04-24 16:27:00.827	\N	\N	\N	\N
cmod4icf5001j6z01aw9h9m8u	cmoblf0gi013qtjq0smyqlre0	KAITEN	такое то основание\nеще основание\nче то еще\nаналоги	81139768	2026-04-24 16:27:00.834	\N	\N	\N	\N
cmod4icfb001l6z01yd26rc7c	cmoblf0gi013qtjq0smyqlre0	KAITEN	аааааа	81138263	2026-04-24 16:27:00.84	\N	\N	\N	\N
cmod4icfh001n6z01tr02e3t5	cmoblf0gi013qtjq0smyqlre0	KAITEN	? 7777	81138291	2026-04-24 16:27:00.845	\N	\N	\N	\N
cmohfdtai002btjc4iyh22ywu	cmocsbpy20k5k6z0118yjtte8	KAITEN	тест	81299120	2026-04-27 16:42:29.898	\N	\N	\N	\N
\.


--
-- Data for Name: OrderRevision; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."OrderRevision" (id, "orderId", "createdAt", "actorLabel", "actorUserId", summary, kind, snapshot) FROM stdin;
cmoa4jaat0003tjyo23lxn0zi	cmoa4ja9a0001tjyo19e90aqc	2026-04-22 14:04:26.213	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Наряд создан	CREATE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-23T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": null, "dueToAdminsAt": "2026-04-25T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "kaitenSyncedAt": null, "appointmentDate": "2026-04-25T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": null, "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": null, "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": null, "kaitenDecideLater": true, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": null, "prostheticsOrdered": false, "invoiceAttachmentId": null, "kaitenCardTitleLabel": null, "additionalSourceNotes": null, "kaitenAdminDueHasTime": true}, "prosthetics": null, "constructions": []}
cmoa58e7m0007tjyo2zwj6iy0	cmoa58dqt0005tjyoexrs25v5	2026-04-22 14:23:57.682	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Наряд создан	CREATE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-25T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "ТЕСТ", "kaitenCardId": 63865388, "dueToAdminsAt": "2026-04-26T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "kaitenSyncedAt": "2026-04-22T14:23:57.661Z", "appointmentDate": "2026-04-26T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHODONTICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut8o0006tj2skjaa5lnx", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "К исполнению", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": null, "prostheticsOrdered": false, "invoiceAttachmentId": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "kaitenAdminDueHasTime": true}, "prosthetics": null, "constructions": []}
cmoa7b52o0001tjhsezjxv3ts	cmoa58dqt0005tjyoexrs25v5	2026-04-22 15:22:05.041	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Синхронизация Кайтен, Колонка Kайтен (CRM)	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-25T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "ТЕСТ", "kaitenCardId": 63865388, "dueToAdminsAt": "2026-04-26T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "kaitenSyncedAt": "2026-04-22T15:22:05.020Z", "appointmentDate": "2026-04-26T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHODONTICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut8o0006tj2skjaa5lnx", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": null, "prostheticsOrdered": false, "invoiceAttachmentId": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "kaitenAdminDueHasTime": true}, "prosthetics": null, "constructions": []}
cmoa7bdxg0003tjhs8ca8aek9	cmoa58dqt0005tjyoexrs25v5	2026-04-22 15:22:16.516	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Синхронизация Кайтен, Колонка Kайтен (CRM)	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-25T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "ТЕСТ", "kaitenCardId": 63865388, "dueToAdminsAt": "2026-04-26T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "kaitenSyncedAt": "2026-04-22T15:22:16.500Z", "appointmentDate": "2026-04-26T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHODONTICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut8o0006tj2skjaa5lnx", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Производство", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": null, "prostheticsOrdered": false, "invoiceAttachmentId": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "kaitenAdminDueHasTime": true}, "prosthetics": null, "constructions": []}
cmoa7bxu10005tjhsszaaks2m	cmoa58dqt0005tjyoexrs25v5	2026-04-22 15:22:42.313	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Синхронизация Кайтен	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-25T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "ТЕСТ", "kaitenCardId": 63865388, "dueToAdminsAt": "2026-04-26T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "kaitenSyncedAt": "2026-04-22T15:22:42.295Z", "appointmentDate": "2026-04-26T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHODONTICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut8o0006tj2skjaa5lnx", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Производство", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": null, "prostheticsOrdered": false, "invoiceAttachmentId": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "kaitenAdminDueHasTime": true}, "prosthetics": null, "constructions": []}
cmoa7cxz60007tjhshyltg6ti	cmoa58dqt0005tjyoexrs25v5	2026-04-22 15:23:29.154	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Синхронизация Кайтен, Колонка Kайтен (CRM)	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-25T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "ТЕСТ", "kaitenCardId": 63865388, "dueToAdminsAt": "2026-04-26T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "kaitenSyncedAt": "2026-04-22T15:23:29.130Z", "appointmentDate": "2026-04-26T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHODONTICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut8o0006tj2skjaa5lnx", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": null, "prostheticsOrdered": false, "invoiceAttachmentId": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "kaitenAdminDueHasTime": true}, "prosthetics": null, "constructions": []}
cmoaapa6o0001tjfwtz7e95d7	cmoa58dqt0005tjyoexrs25v5	2026-04-22 16:57:03.696	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Срочность	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-25T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": true, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "ТЕСТ", "kaitenCardId": 63865388, "dueToAdminsAt": "2026-04-26T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-22T15:23:29.130Z", "appointmentDate": "2026-04-26T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHODONTICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut8o0006tj2skjaa5lnx", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": null, "prostheticsOrdered": false, "invoiceAttachmentId": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "kaitenAdminDueHasTime": true}, "prosthetics": null, "constructions": []}
cmoaapffk0003tjfw41tpnxzd	cmoa58dqt0005tjyoexrs25v5	2026-04-22 16:57:10.497	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Счёт распечатан	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-25T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": true, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "ТЕСТ", "kaitenCardId": 63865388, "dueToAdminsAt": "2026-04-26T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": true, "kaitenSyncedAt": "2026-04-22T15:23:29.130Z", "appointmentDate": "2026-04-26T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHODONTICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut8o0006tj2skjaa5lnx", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": null, "prostheticsOrdered": false, "invoiceAttachmentId": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "kaitenAdminDueHasTime": true}, "prosthetics": null, "constructions": []}
cmoab8ass0007tjfwxpo1dmnh	cmoab8aif0005tjfwjg0z14gy	2026-04-22 17:11:50.956	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Наряд создан	CREATE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-26T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63870276, "dueToAdminsAt": "2026-04-24T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-22T17:11:50.937Z", "appointmentDate": "2026-04-24T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut2y0000tj2skbld7b8d", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "К исполнению", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": null, "prostheticsOrdered": false, "invoiceAttachmentId": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "kaitenAdminDueHasTime": true}, "prosthetics": null, "constructions": []}
cmoab8u5p0009tjfw2s3l6snx	cmoab8aif0005tjfwjg0z14gy	2026-04-22 17:12:16.045	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Срочность, Коэф. срочности	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-26T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": true, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63870276, "dueToAdminsAt": "2026-04-24T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-22T17:11:50.937Z", "appointmentDate": "2026-04-24T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut2y0000tj2skbld7b8d", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "К исполнению", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": 1.2, "prostheticsOrdered": false, "invoiceAttachmentId": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "kaitenAdminDueHasTime": true}, "prosthetics": null, "constructions": []}
cmoaba5ow000btjfw9v9yk5mg	cmoa58dqt0005tjyoexrs25v5	2026-04-22 17:13:17.648	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Срочность	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-25T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "ТЕСТ", "kaitenCardId": 63865388, "dueToAdminsAt": "2026-04-26T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": true, "kaitenSyncedAt": "2026-04-22T15:23:29.130Z", "appointmentDate": "2026-04-26T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHODONTICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut8o0006tj2skjaa5lnx", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": null, "prostheticsOrdered": false, "invoiceAttachmentId": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "kaitenAdminDueHasTime": true}, "prosthetics": null, "constructions": []}
cmoaba9by000dtjfwarbzrge5	cmoa58dqt0005tjyoexrs25v5	2026-04-22 17:13:22.367	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Срочность, Коэф. срочности	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-25T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": true, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "ТЕСТ", "kaitenCardId": 63865388, "dueToAdminsAt": "2026-04-26T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": true, "kaitenSyncedAt": "2026-04-22T15:23:29.130Z", "appointmentDate": "2026-04-26T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHODONTICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut8o0006tj2skjaa5lnx", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": 1.2, "prostheticsOrdered": false, "invoiceAttachmentId": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "kaitenAdminDueHasTime": true}, "prosthetics": null, "constructions": []}
cmoabavoc000ftjfwq4arzn93	cmoab8aif0005tjfwjg0z14gy	2026-04-22 17:13:51.324	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Синхронизация Кайтен, Колонка Kайтен (CRM)	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-26T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": true, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63870276, "dueToAdminsAt": "2026-04-24T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-22T17:13:51.302Z", "appointmentDate": "2026-04-24T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut2y0000tj2skbld7b8d", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": 1.2, "prostheticsOrdered": false, "invoiceAttachmentId": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "kaitenAdminDueHasTime": true}, "prosthetics": null, "constructions": []}
cmoadr9t8000stjfwmf43mkba	cmoab8aif0005tjfwjg0z14gy	2026-04-22 18:22:35.372	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Коэф. срочности	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-26T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": true, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63870276, "dueToAdminsAt": "2026-04-24T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-22T17:13:51.302Z", "appointmentDate": "2026-04-24T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut2y0000tj2skbld7b8d", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": null, "prostheticsOrdered": false, "invoiceAttachmentId": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "kaitenAdminDueHasTime": true}, "prosthetics": null, "constructions": []}
cmoadrdi8000utjfw4m16ainr	cmoab8aif0005tjfwjg0z14gy	2026-04-22 18:22:40.16	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Срочность	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-26T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63870276, "dueToAdminsAt": "2026-04-24T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-22T17:13:51.302Z", "appointmentDate": "2026-04-24T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut2y0000tj2skbld7b8d", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": null, "prostheticsOrdered": false, "invoiceAttachmentId": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "kaitenAdminDueHasTime": true}, "prosthetics": null, "constructions": []}
cmoadrltg000wtjfwmv9mu5kn	cmoab8aif0005tjfwjg0z14gy	2026-04-22 18:22:50.933	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Срочность, Коэф. срочности	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-26T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": true, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63870276, "dueToAdminsAt": "2026-04-24T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-22T17:13:51.302Z", "appointmentDate": "2026-04-24T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut2y0000tj2skbld7b8d", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": 1.2, "prostheticsOrdered": false, "invoiceAttachmentId": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "kaitenAdminDueHasTime": true}, "prosthetics": null, "constructions": []}
cmoadsksu000ytjfwvy4odcki	cmoab8aif0005tjfwjg0z14gy	2026-04-22 18:23:36.271	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Синхронизация Кайтен	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-26T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": true, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63870276, "dueToAdminsAt": "2026-04-24T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-22T18:23:36.249Z", "appointmentDate": "2026-04-24T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut2y0000tj2skbld7b8d", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": 1.2, "prostheticsOrdered": false, "invoiceAttachmentId": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "kaitenAdminDueHasTime": true}, "prosthetics": null, "constructions": []}
cmoadu1lm0010tjfw1k5auie9	cmoab8aif0005tjfwjg0z14gy	2026-04-22 18:24:44.699	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Коэф. срочности, Синхронизация Кайтен	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-26T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": true, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63870276, "dueToAdminsAt": "2026-04-24T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-22T18:24:19.781Z", "appointmentDate": "2026-04-24T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut2y0000tj2skbld7b8d", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": 2, "prostheticsOrdered": false, "invoiceAttachmentId": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "kaitenAdminDueHasTime": true}, "prosthetics": null, "constructions": []}
cmoalk6v10001tjqk8n7xdsfv	cmoab8aif0005tjfwjg0z14gy	2026-04-22 22:01:01.885	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Срок лабораторный, Счёт выставлен, Номер счёта, shippedDescription, invoiceParsedLines, invoiceParsedTotalRub, invoiceParsedSummaryText, invoicePaymentNotes, orderPriceListKind, orderPriceListNote, Файл счёта	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": null, "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": true, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63870276, "dueToAdminsAt": "2026-04-24T09:00:00.000Z", "invoiceIssued": true, "invoiceNumber": "№733 от 21 апреля 2026", "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-22T18:24:19.781Z", "appointmentDate": "2026-04-24T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut2y0000tj2skbld7b8d", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": 2, "invoiceParsedLines": null, "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": "b191e597-47e6-41ef-84cf-b0fcb4d270a7", "invoicePaymentNotes": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "invoiceParsedTotalRub": null, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": null}, "prosthetics": null, "constructions": []}
cmoalk8z00003tjqkxfay3s0z	cmoab8aif0005tjfwjg0z14gy	2026-04-22 22:01:04.62	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Срок лабораторный	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-26T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": true, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63870276, "dueToAdminsAt": "2026-04-24T09:00:00.000Z", "invoiceIssued": true, "invoiceNumber": "№733 от 21 апреля 2026", "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-22T18:24:19.781Z", "appointmentDate": "2026-04-24T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut2y0000tj2skbld7b8d", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": 2, "invoiceParsedLines": null, "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": "b191e597-47e6-41ef-84cf-b0fcb4d270a7", "invoicePaymentNotes": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "invoiceParsedTotalRub": null, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": null}, "prosthetics": null, "constructions": []}
cmoalk96x0005tjqk2wbfed9h	cmoab8aif0005tjfwjg0z14gy	2026-04-22 22:01:04.905	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Сохранено без изменений содержимого	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-26T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": true, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63870276, "dueToAdminsAt": "2026-04-24T09:00:00.000Z", "invoiceIssued": true, "invoiceNumber": "№733 от 21 апреля 2026", "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-22T18:24:19.781Z", "appointmentDate": "2026-04-24T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut2y0000tj2skbld7b8d", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": 2, "invoiceParsedLines": null, "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": "b191e597-47e6-41ef-84cf-b0fcb4d270a7", "invoicePaymentNotes": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "invoiceParsedTotalRub": null, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": null}, "prosthetics": null, "constructions": []}
cmoall9bf0007tjqkslos6em4	cmoab8aif0005tjfwjg0z14gy	2026-04-22 22:01:51.723	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Счёт выставлен, Файл счёта	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-26T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": true, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63870276, "dueToAdminsAt": "2026-04-24T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": "№733 от 21 апреля 2026", "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-22T18:24:19.781Z", "appointmentDate": "2026-04-24T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut2y0000tj2skbld7b8d", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": 2, "invoiceParsedLines": null, "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": null, "invoicePaymentNotes": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "invoiceParsedTotalRub": null, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": null}, "prosthetics": null, "constructions": []}
cmobcd50d000ptjwsmc0c2inx	cmoab8aif0005tjfwjg0z14gy	2026-04-23 10:31:22.526	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Счёт выставлен, Счёт распечатан, Строки счёта (разбор), Сумма по счёту (разбор), Текст «ВЫСТАВЛЕНО», Файл счёта, Синхронизация Кайтен	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-26T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": true, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63870276, "dueToAdminsAt": "2026-04-24T09:00:00.000Z", "invoiceIssued": true, "invoiceNumber": "№733 от 21 апреля 2026", "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": true, "kaitenSyncedAt": "2026-04-23T09:57:45.018Z", "appointmentDate": "2026-04-24T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut2y0000tj2skbld7b8d", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": 2, "invoiceParsedLines": [{"qty": 1, "code": "-1001", "name": "Сплинт сложный", "lineTotalRub": 18095}, {"qty": 1, "code": "-2008", "name": "Просмотр исследования КЛКТ/МСКТ", "lineTotalRub": 3333}], "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": "c35c9ede-8435-4fc4-a703-44de2591498d", "invoicePaymentNotes": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "invoiceParsedTotalRub": 22500, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": "-1001 · Сплинт сложный\\n-2008 · Просмотр исследования КЛКТ/МСКТ"}, "prosthetics": null, "constructions": []}
cmobh8f1h001ftjx0duddjjx1	cmoab8aif0005tjfwjg0z14gy	2026-04-23 12:47:40.325	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Срочность, Коэф. срочности, Синхронизация Кайтен	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-26T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63870276, "dueToAdminsAt": "2026-04-24T09:00:00.000Z", "invoiceIssued": true, "invoiceNumber": "№733 от 21 апреля 2026", "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": true, "kaitenSyncedAt": "2026-04-23T10:33:01.761Z", "appointmentDate": "2026-04-24T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut2y0000tj2skbld7b8d", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": null, "invoiceParsedLines": [{"qty": 1, "code": "-1001", "name": "Сплинт сложный", "lineTotalRub": 18095}, {"qty": 1, "code": "-2008", "name": "Просмотр исследования КЛКТ/МСКТ", "lineTotalRub": 3333}], "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": "c35c9ede-8435-4fc4-a703-44de2591498d", "invoicePaymentNotes": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "invoiceParsedTotalRub": 22500, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": "-1001 · Сплинт сложный\\n-2008 · Просмотр исследования КЛКТ/МСКТ"}, "prosthetics": null, "constructions": []}
cmobh8zi4001htjx02x37l9go	cmoab8aif0005tjfwjg0z14gy	2026-04-23 12:48:06.844	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Срочность, Коэф. срочности	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-26T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": true, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63870276, "dueToAdminsAt": "2026-04-24T09:00:00.000Z", "invoiceIssued": true, "invoiceNumber": "№733 от 21 апреля 2026", "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": true, "kaitenSyncedAt": "2026-04-23T10:33:01.761Z", "appointmentDate": "2026-04-24T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut2y0000tj2skbld7b8d", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": 1.2, "invoiceParsedLines": [{"qty": 1, "code": "-1001", "name": "Сплинт сложный", "lineTotalRub": 18095}, {"qty": 1, "code": "-2008", "name": "Просмотр исследования КЛКТ/МСКТ", "lineTotalRub": 3333}], "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": "c35c9ede-8435-4fc4-a703-44de2591498d", "invoicePaymentNotes": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "invoiceParsedTotalRub": 22500, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": "-1001 · Сплинт сложный\\n-2008 · Просмотр исследования КЛКТ/МСКТ"}, "prosthetics": null, "constructions": []}
cmoblf0tf013stjq0i5rcauby	cmoblf0gi013qtjq0smyqlre0	2026-04-23 14:44:46.947	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Наряд создан	CREATE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-25T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63913458, "dueToAdminsAt": "2026-04-25T09:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-23T14:44:46.924Z", "appointmentDate": "2026-04-25T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut950007tj2swyec0tlj", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "К исполнению", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": null, "invoiceParsedLines": null, "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": null, "invoicePaymentNotes": null, "kaitenCardTitleLabel": "тест", "additionalSourceNotes": null, "invoiceParsedTotalRub": null, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": null}, "prosthetics": null, "constructions": []}
cmocqc5xi0d896z01e36yeqla	cmocqbyc50d5a6z017fug0102	2026-04-24 09:50:17.862	ТестСрм	cmobpf6bx004g6z01kxto9y8a	Наряд создан	CREATE	{"v": 1, "order": {"hasCt": true, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-05-13T06:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnnlv6uo001vtjogxi0a6tii", "doctorId": "cmnnoyf9r0043tjxw5hnrxr5j", "hasPhoto": false, "hasScans": true, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [], "continueWork": null}, "legalEntity": "ООО", "patientName": "Горбунова Арина Алексеевна", "kaitenCardId": 63940239, "dueToAdminsAt": "2026-05-15T10:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_EXECUTION", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-24T09:50:17.839Z", "appointmentDate": "2026-05-15T10:00:00.000Z", "clientOrderText": "\\"Горбунова Арина Алексеевна\\nхирургический шаблон для аппарата быстрого небного расширения с опорой на 2 микровинта\\n\\nдата сдачи: 15.05.2026, в 13:00, атрибьют мед, чкаловский пр-кт 50\\nврач: Кислова ЮЛ, Шпак АС\\"", "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHODONTICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmoa3ej690000tjbst1px1hjz", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "К исполнению", "kaitenDecideLater": false, "registeredByLabel": "ТестСрм", "urgentCoefficient": null, "invoiceParsedLines": null, "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": null, "invoicePaymentNotes": null, "kaitenCardTitleLabel": "Расширяющий", "additionalSourceNotes": null, "invoiceParsedTotalRub": null, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": null}, "prosthetics": null, "constructions": [{"arch": null, "shade": null, "category": "PRICE_LIST", "quantity": 1, "teethFdi": null, "unitPrice": 30000, "materialId": null, "bridgeToFdi": null, "bridgeFromFdi": null, "priceListItemId": "cmnrmudj1001utjaw1avw1bol", "constructionTypeId": null}]}
cmocqcnfi0de36z01m9u96cbz	cmocqbyc50d5a6z017fug0102	2026-04-24 09:50:40.543	ТестСрм	cmobpf6bx004g6z01kxto9y8a	Сохранено без изменений содержимого	SAVE	{"v": 1, "order": {"hasCt": true, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-05-13T06:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnnlv6uo001vtjogxi0a6tii", "doctorId": "cmnnoyf9r0043tjxw5hnrxr5j", "hasPhoto": false, "hasScans": true, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [], "continueWork": null}, "legalEntity": "ООО", "patientName": "Горбунова Арина Алексеевна", "kaitenCardId": 63940239, "dueToAdminsAt": "2026-05-15T10:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_EXECUTION", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-24T09:50:17.839Z", "appointmentDate": "2026-05-15T10:00:00.000Z", "clientOrderText": "\\"Горбунова Арина Алексеевна\\nхирургический шаблон для аппарата быстрого небного расширения с опорой на 2 микровинта\\n\\nдата сдачи: 15.05.2026, в 13:00, атрибьют мед, чкаловский пр-кт 50\\nврач: Кислова ЮЛ, Шпак АС\\"", "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHODONTICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmoa3ej690000tjbst1px1hjz", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "К исполнению", "kaitenDecideLater": false, "registeredByLabel": "ТестСрм", "urgentCoefficient": null, "invoiceParsedLines": null, "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": null, "invoicePaymentNotes": null, "kaitenCardTitleLabel": "Расширяющий", "additionalSourceNotes": null, "invoiceParsedTotalRub": null, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": null}, "prosthetics": null, "constructions": [{"arch": null, "shade": null, "category": "PRICE_LIST", "quantity": 1, "teethFdi": null, "unitPrice": 30000, "materialId": null, "bridgeToFdi": null, "bridgeFromFdi": null, "priceListItemId": "cmnrmudj1001utjaw1avw1bol", "constructionTypeId": null}]}
cmocr1hw60gqx6z01xtozsf68	cmocqzu730g356z01vwxqfyib	2026-04-24 10:09:59.766	ТестСрм	cmobpf6bx004g6z01kxto9y8a	Наряд создан	CREATE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-05-06T06:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnnlv7xx008btjoggqmvawg6", "doctorId": "cmnnoygew0080tjxwpr7v2kkn", "hasPhoto": false, "hasScans": false, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [], "continueWork": null}, "legalEntity": "ООО", "patientName": "Мочалин Д.Е.", "kaitenCardId": 63941355, "dueToAdminsAt": "2026-05-07T07:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_EXECUTION", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-24T10:09:59.748Z", "appointmentDate": "2026-05-07T07:00:00.000Z", "clientOrderText": "Врач: Пушняков И.В.\\nПац: Мочалин Д.Е.\\nИзготовить небный дистактор. Границу дистрактора расположить отступив 2 мм от шеек зубов к 07.05.2026 10:00 (Медалл)\\"", "correctionTrack": "ORTHODONTICS", "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHODONTICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmoa3ej690000tjbst1px1hjz", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "К исполнению", "kaitenDecideLater": false, "registeredByLabel": "ТестСрм", "urgentCoefficient": null, "invoiceParsedLines": null, "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": null, "invoicePaymentNotes": null, "kaitenCardTitleLabel": "Дебный Дистактор", "additionalSourceNotes": null, "invoiceParsedTotalRub": null, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": null}, "prosthetics": null, "constructions": [{"arch": null, "shade": null, "category": "PRICE_LIST", "quantity": 1, "teethFdi": null, "unitPrice": 8500, "materialId": null, "bridgeToFdi": null, "bridgeFromFdi": null, "priceListItemId": "cmnrmudjz0027tjawnsx7att4", "constructionTypeId": null}]}
cmocr4op50hb16z018t0ne1fr	cmocr1apw0gku6z01zvyczcis	2026-04-24 10:12:28.554	ТестСрм	cmobpf6bx004g6z01kxto9y8a	Наряд создан	CREATE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-05-06T06:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnnlv7xx008btjoggqmvawg6", "doctorId": "cmnnoygew0080tjxwpr7v2kkn", "hasPhoto": false, "hasScans": false, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [], "continueWork": null}, "legalEntity": "ООО", "patientName": "Мочалин Д.Е.", "kaitenCardId": 63941407, "dueToAdminsAt": "2026-05-07T07:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_EXECUTION", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-24T10:12:28.518Z", "appointmentDate": "2026-05-07T07:00:00.000Z", "clientOrderText": "Врач: Пушняков И.В.\\nПац: Мочалин Д.Е.\\nИзготовить небный дистактор. Границу дистрактора расположить отступив 2 мм от шеек зубов к 07.05.2026 10:00 (Медалл)\\"", "correctionTrack": "ORTHODONTICS", "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHODONTICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmoa3ej690000tjbst1px1hjz", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "К исполнению", "kaitenDecideLater": false, "registeredByLabel": "ТестСрм", "urgentCoefficient": null, "invoiceParsedLines": null, "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": null, "invoicePaymentNotes": null, "kaitenCardTitleLabel": "Дебный Дистактор", "additionalSourceNotes": null, "invoiceParsedTotalRub": null, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": null}, "prosthetics": null, "constructions": [{"arch": null, "shade": null, "category": "PRICE_LIST", "quantity": 1, "teethFdi": null, "unitPrice": 8500, "materialId": null, "bridgeToFdi": null, "bridgeFromFdi": null, "priceListItemId": "cmnrmudjz0027tjawnsx7att4", "constructionTypeId": null}]}
cmocre5fa0im46z011z16fs5m	cmocqzu730g356z01vwxqfyib	2026-04-24 10:19:50.134	ТестСрм	cmobpf6bx004g6z01kxto9y8a	Сохранено без изменений содержимого	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-05-06T06:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnnlv7xx008btjoggqmvawg6", "doctorId": "cmnnoygew0080tjxwpr7v2kkn", "hasPhoto": false, "hasScans": false, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [], "continueWork": null}, "legalEntity": "ООО", "patientName": "Мочалин Д.Е.", "kaitenCardId": 63941355, "dueToAdminsAt": "2026-05-07T07:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_EXECUTION", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-24T10:09:59.748Z", "appointmentDate": "2026-05-07T07:00:00.000Z", "clientOrderText": "Врач: Пушняков И.В.\\nПац: Мочалин Д.Е.\\nИзготовить небный дистактор. Границу дистрактора расположить отступив 2 мм от шеек зубов к 07.05.2026 10:00 (Медалл)\\"", "correctionTrack": "ORTHODONTICS", "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHODONTICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmoa3ej690000tjbst1px1hjz", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "К исполнению", "kaitenDecideLater": false, "registeredByLabel": "ТестСрм", "urgentCoefficient": null, "invoiceParsedLines": null, "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": null, "invoicePaymentNotes": null, "kaitenCardTitleLabel": "Дебный Дистактор", "additionalSourceNotes": null, "invoiceParsedTotalRub": null, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": null}, "prosthetics": null, "constructions": [{"arch": null, "shade": null, "category": "PRICE_LIST", "quantity": 1, "teethFdi": null, "unitPrice": 8500, "materialId": null, "bridgeToFdi": null, "bridgeFromFdi": null, "priceListItemId": "cmnrmudjz0027tjawnsx7att4", "constructionTypeId": null}]}
cmocscl6v0kb76z015kl3rb1x	cmocsbpy20k5k6z0118yjtte8	2026-04-24 10:46:36.872	ТестСрм	cmobpf6bx004g6z01kxto9y8a	Наряд создан	CREATE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-05-08T06:00:00.000Z", "payment": null, "clinicId": "cmnnlv71t002ztjogk99z3jwh", "doctorId": "cmnnoyh7600astjxwq8oaqfu7", "hasPhoto": false, "hasScans": false, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [], "continueWork": null}, "legalEntity": "ООО", "patientName": "Булатова Мария Сергеевна", "kaitenCardId": 63943832, "dueToAdminsAt": "2026-05-12T06:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_EXECUTION", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-24T10:46:36.857Z", "appointmentDate": "2026-05-12T06:00:00.000Z", "clientOrderText": "КликЛАБ\\nЗаказчик: АйсКлиник\\nФИО и возраст пациента: Булатова Мария Сергеевна\\nФИО лечащего врача: Щибря А. В.", "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut530005tj2sn1es495c", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "К исполнению", "kaitenDecideLater": false, "registeredByLabel": "ТестСрм", "urgentCoefficient": null, "invoiceParsedLines": null, "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": null, "invoicePaymentNotes": null, "kaitenCardTitleLabel": "Ортопедия ДЦ", "additionalSourceNotes": null, "invoiceParsedTotalRub": null, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": null}, "prosthetics": null, "constructions": [{"arch": null, "shade": null, "category": "PRICE_LIST", "quantity": 1, "teethFdi": null, "unitPrice": 13500, "materialId": null, "bridgeToFdi": null, "bridgeFromFdi": null, "priceListItemId": "cmnrmudfl000mtjawqbrztq7j", "constructionTypeId": null}]}
cmocsl9d70kzj6z01kia1qoy3	cmocsbpy20k5k6z0118yjtte8	2026-04-24 10:53:21.451	ТестСрм	cmobpf6bx004g6z01kxto9y8a	Синхронизация Кайтен, Блокировка в Kайтен, Причина блокировки Kайтен	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-05-08T06:00:00.000Z", "payment": null, "clinicId": "cmnnlv71t002ztjogk99z3jwh", "doctorId": "cmnnoyh7600astjxwq8oaqfu7", "hasPhoto": false, "hasScans": false, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [], "continueWork": null}, "legalEntity": "ООО", "patientName": "Булатова Мария Сергеевна", "kaitenCardId": 63943832, "dueToAdminsAt": "2026-05-12T06:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": true, "labWorkStatus": "TO_EXECUTION", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-24T10:53:21.437Z", "appointmentDate": "2026-05-12T06:00:00.000Z", "clientOrderText": "КликЛАБ\\nЗаказчик: АйсКлиник\\nФИО и возраст пациента: Булатова Мария Сергеевна\\nФИО лечащего врача: Щибря А. В.", "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut530005tj2sn1es495c", "courierDeliveryId": null, "kaitenBlockReason": ";le bynw", "kaitenColumnTitle": "К исполнению", "kaitenDecideLater": false, "registeredByLabel": "ТестСрм", "urgentCoefficient": null, "invoiceParsedLines": null, "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": null, "invoicePaymentNotes": null, "kaitenCardTitleLabel": "Ортопедия ДЦ", "additionalSourceNotes": null, "invoiceParsedTotalRub": null, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": null}, "prosthetics": null, "constructions": [{"arch": null, "shade": null, "category": "PRICE_LIST", "quantity": 1, "teethFdi": null, "unitPrice": 13500, "materialId": null, "bridgeToFdi": null, "bridgeFromFdi": null, "priceListItemId": "cmnrmudfl000mtjawqbrztq7j", "constructionTypeId": null}]}
cmocsmw0h0l4n6z01jmayss90	cmocsbpy20k5k6z0118yjtte8	2026-04-24 10:54:37.458	ТестСрм	cmobpf6bx004g6z01kxto9y8a	Синхронизация Кайтен, Блокировка в Kайтен, Причина блокировки Kайтен	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-05-08T06:00:00.000Z", "payment": null, "clinicId": "cmnnlv71t002ztjogk99z3jwh", "doctorId": "cmnnoyh7600astjxwq8oaqfu7", "hasPhoto": false, "hasScans": false, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [], "continueWork": null}, "legalEntity": "ООО", "patientName": "Булатова Мария Сергеевна", "kaitenCardId": 63943832, "dueToAdminsAt": "2026-05-12T06:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_EXECUTION", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-24T10:54:37.442Z", "appointmentDate": "2026-05-12T06:00:00.000Z", "clientOrderText": "КликЛАБ\\nЗаказчик: АйсКлиник\\nФИО и возраст пациента: Булатова Мария Сергеевна\\nФИО лечащего врача: Щибря А. В.", "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut530005tj2sn1es495c", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "К исполнению", "kaitenDecideLater": false, "registeredByLabel": "ТестСрм", "urgentCoefficient": null, "invoiceParsedLines": null, "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": null, "invoicePaymentNotes": null, "kaitenCardTitleLabel": "Ортопедия ДЦ", "additionalSourceNotes": null, "invoiceParsedTotalRub": null, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": null}, "prosthetics": null, "constructions": [{"arch": null, "shade": null, "category": "PRICE_LIST", "quantity": 1, "teethFdi": null, "unitPrice": 13500, "materialId": null, "bridgeToFdi": null, "bridgeFromFdi": null, "priceListItemId": "cmnrmudfl000mtjawqbrztq7j", "constructionTypeId": null}]}
cmod4ipa600516z016btped9n	cmoab8aif0005tjfwjg0z14gy	2026-04-24 16:27:17.503	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Синхронизация Кайтен, Блокировка в Kайтен, Причина блокировки Kайтен	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-26T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": true, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63870276, "dueToAdminsAt": "2026-04-24T09:00:00.000Z", "invoiceIssued": true, "invoiceNumber": "№733 от 21 апреля 2026", "kaitenBlocked": true, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": true, "kaitenSyncedAt": "2026-04-24T16:27:17.477Z", "appointmentDate": "2026-04-24T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut2y0000tj2skbld7b8d", "courierDeliveryId": null, "kaitenBlockReason": "мваымв", "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": 1.2, "invoiceParsedLines": [{"qty": 1, "code": "-1001", "name": "Сплинт сложный", "lineTotalRub": 18095}, {"qty": 1, "code": "-2008", "name": "Просмотр исследования КЛКТ/МСКТ", "lineTotalRub": 3333}], "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": "c35c9ede-8435-4fc4-a703-44de2591498d", "invoicePaymentNotes": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "invoiceParsedTotalRub": 22500, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": "-1001 · Сплинт сложный\\n-2008 · Просмотр исследования КЛКТ/МСКТ"}, "prosthetics": null, "constructions": []}
cmod4itwo005l6z01ykxicom0	cmoab8aif0005tjfwjg0z14gy	2026-04-24 16:27:23.496	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Синхронизация Кайтен, Блокировка в Kайтен, Причина блокировки Kайтен	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-26T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": true, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63870276, "dueToAdminsAt": "2026-04-24T09:00:00.000Z", "invoiceIssued": true, "invoiceNumber": "№733 от 21 апреля 2026", "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": true, "kaitenSyncedAt": "2026-04-24T16:27:23.476Z", "appointmentDate": "2026-04-24T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut2y0000tj2skbld7b8d", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": 1.2, "invoiceParsedLines": [{"qty": 1, "code": "-1001", "name": "Сплинт сложный", "lineTotalRub": 18095}, {"qty": 1, "code": "-2008", "name": "Просмотр исследования КЛКТ/МСКТ", "lineTotalRub": 3333}], "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": "c35c9ede-8435-4fc4-a703-44de2591498d", "invoicePaymentNotes": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "invoiceParsedTotalRub": 22500, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": "-1001 · Сплинт сложный\\n-2008 · Просмотр исследования КЛКТ/МСКТ"}, "prosthetics": null, "constructions": []}
cmod5666o00a76z01aaf6f1j7	cmoab8aif0005tjfwjg0z14gy	2026-04-24 16:45:32.497	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Синхронизация Кайтен, Блокировка в Kайтен, Причина блокировки Kайтен	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-26T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": true, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63870276, "dueToAdminsAt": "2026-04-24T09:00:00.000Z", "invoiceIssued": true, "invoiceNumber": "№733 от 21 апреля 2026", "kaitenBlocked": true, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": true, "kaitenSyncedAt": "2026-04-24T16:45:32.466Z", "appointmentDate": "2026-04-24T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut2y0000tj2skbld7b8d", "courierDeliveryId": null, "kaitenBlockReason": "афка", "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": 1.2, "invoiceParsedLines": [{"qty": 1, "code": "-1001", "name": "Сплинт сложный", "lineTotalRub": 18095}, {"qty": 1, "code": "-2008", "name": "Просмотр исследования КЛКТ/МСКТ", "lineTotalRub": 3333}], "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": "c35c9ede-8435-4fc4-a703-44de2591498d", "invoicePaymentNotes": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "invoiceParsedTotalRub": 22500, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": "-1001 · Сплинт сложный\\n-2008 · Просмотр исследования КЛКТ/МСКТ"}, "prosthetics": null, "constructions": []}
cmod56jni00cx6z01v7g4sukj	cmoab8aif0005tjfwjg0z14gy	2026-04-24 16:45:49.951	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Синхронизация Кайтен, Блокировка в Kайтен, Причина блокировки Kайтен	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-04-26T09:00:00.000Z", "payment": "СВЕРКА", "clinicId": "cmnokksp6000dtj50od7c0e07", "doctorId": "cmnnoyegi0001tjxwlnb75v4h", "hasPhoto": false, "hasScans": false, "isUrgent": true, "courierId": null, "quickOrder": {"v": 2, "tiles": [{"id": "be9d3ce6-a58e-4fdb-8dab-c815d135b77b", "title": "мвяа", "options": [], "baseActive": false, "accentColor": "#8b5cf6", "basePriceSummary": "1001 · Сплинт сложный", "basePriceListItemId": "cmnrmudde0000tjawpkfacnp6"}], "continueWork": null}, "legalEntity": null, "patientName": "Соколов Всеволод Владимирович", "kaitenCardId": 63870276, "dueToAdminsAt": "2026-04-24T09:00:00.000Z", "invoiceIssued": true, "invoiceNumber": "№733 от 21 апреля 2026", "kaitenBlocked": false, "labWorkStatus": "TO_SCAN", "narjadPrinted": false, "invoicePrinted": true, "kaitenSyncedAt": "2026-04-24T16:45:49.935Z", "appointmentDate": "2026-04-24T09:00:00.000Z", "clientOrderText": null, "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut2y0000tj2skbld7b8d", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Согласование", "kaitenDecideLater": false, "registeredByLabel": "@vsevolodsokolov", "urgentCoefficient": 1.2, "invoiceParsedLines": [{"qty": 1, "code": "-1001", "name": "Сплинт сложный", "lineTotalRub": 18095}, {"qty": 1, "code": "-2008", "name": "Просмотр исследования КЛКТ/МСКТ", "lineTotalRub": 3333}], "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": "c35c9ede-8435-4fc4-a703-44de2591498d", "invoicePaymentNotes": null, "kaitenCardTitleLabel": "ТЕСТ", "additionalSourceNotes": null, "invoiceParsedTotalRub": 22500, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": "-1001 · Сплинт сложный\\n-2008 · Просмотр исследования КЛКТ/МСКТ"}, "prosthetics": null, "constructions": []}
cmojvpkqo002btjwoy0mt0tas	cmocsbpy20k5k6z0118yjtte8	2026-04-29 09:55:04.896	@vsevolodsokolov	cmnyoc1f80003tjtcx3nop3kq	Оплата, Синхронизация Кайтен, Колонка Kайтен (CRM)	SAVE	{"v": 1, "order": {"hasCt": false, "notes": null, "shade": null, "hasMri": false, "status": "REVIEW", "dueDate": "2026-05-08T06:00:00.000Z", "payment": "Ожидает оплаты", "clinicId": "cmnnlv71t002ztjogk99z3jwh", "doctorId": "cmnnoyh7600astjxwq8oaqfu7", "hasPhoto": false, "hasScans": false, "isUrgent": false, "courierId": null, "quickOrder": {"v": 2, "tiles": [], "continueWork": null}, "legalEntity": "ООО", "patientName": "Булатова Мария Сергеевна", "kaitenCardId": 63943832, "dueToAdminsAt": "2026-05-12T06:00:00.000Z", "invoiceIssued": false, "invoiceNumber": null, "kaitenBlocked": false, "labWorkStatus": "TO_EXECUTION", "narjadPrinted": false, "invoicePrinted": false, "kaitenSyncedAt": "2026-04-27T16:42:29.907Z", "appointmentDate": "2026-05-12T06:00:00.000Z", "clientOrderText": "КликЛАБ\\nЗаказчик: АйсКлиник\\nФИО и возраст пациента: Булатова Мария Сергеевна\\nФИО лечащего врача: Щибря А. В.", "correctionTrack": null, "courierPickupId": null, "kaitenSyncError": null, "kaitenTrackLane": "ORTHOPEDICS", "adminShippedOtpr": false, "invoiceEdoSigned": false, "invoicePaperDocs": false, "invoiceSentToEdo": false, "kaitenCardTypeId": "cmnrrut530005tj2sn1es495c", "courierDeliveryId": null, "kaitenBlockReason": null, "kaitenColumnTitle": "Мануал", "kaitenDecideLater": false, "registeredByLabel": "ТестСрм", "urgentCoefficient": null, "invoiceParsedLines": null, "orderPriceListKind": null, "orderPriceListNote": null, "prostheticsOrdered": false, "shippedDescription": null, "invoiceAttachmentId": null, "invoicePaymentNotes": null, "kaitenCardTitleLabel": "Ортопедия ДЦ", "additionalSourceNotes": null, "invoiceParsedTotalRub": null, "kaitenAdminDueHasTime": true, "invoiceParsedSummaryText": null}, "prosthetics": null, "constructions": [{"arch": null, "shade": null, "category": "PRICE_LIST", "quantity": 1, "teethFdi": null, "unitPrice": 13500, "materialId": null, "bridgeToFdi": null, "bridgeFromFdi": null, "priceListItemId": "cmnrmudfl000mtjawqbrztq7j", "constructionTypeId": null}]}
\.


--
-- Data for Name: PriceList; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PriceList" (id, name, "sortOrder", "createdAt", "updatedAt") FROM stdin;
pl_default_seed	Основной	0	2026-04-24 11:55:42	2026-04-24 11:55:42
\.


--
-- Data for Name: PriceListItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PriceListItem" (id, "priceListId", code, name, "sectionTitle", "subsectionTitle", "priceRub", "leadWorkingDays", description, "isActive", "sortOrder", "createdAt", "updatedAt") FROM stdin;
cmnrmudde0000tjawpkfacnp6	pl_default_seed	1001	Сплинт сложный	1. ПОДГОТОВКА К ПРОТЕЗИРОВАНИЮ/ОРТОДОНТИИ	1.1 Сплинты	19000	11	Полный цифровой протокол: цифровой вариатор; моделировка сплинта любых сложных конфигураций; сплинт фрезерованный/принтованный с обработкой (посадка на модели, полировка); 2 принтованные модели	t	1	2026-04-09 15:29:19.154	2026-04-09 15:29:19.154
cmnrmuddk0001tjawrafmj84s	pl_default_seed	1002	Сплинт Простой/мышечный депрограмматор (Койса)	1. ПОДГОТОВКА К ПРОТЕЗИРОВАНИЮ/ОРТОДОНТИИ	1.1 Сплинты	16000	8	Сплинт без вариатора, с обработкой	t	1	2026-04-09 15:29:19.16	2026-04-28 21:59:41.557
cmnrmuddo0002tjawn5c5yy4i	pl_default_seed	1201	Ортодонтические накладки композитные. Пакетное предложение. Сложные	1. ПОДГОТОВКА К ПРОТЕЗИРОВАНИЮ/ОРТОДОНТИИ	1.2 Накладки	19000	11	Цифровой вариатор;композитная накладка от 3 до 5 шт.;2 принтованные модели;1 пакет на пациента.	t	3	2026-04-09 15:29:19.165	2026-04-09 15:29:19.165
cmnrmuddt0003tjawt6aje9w4	pl_default_seed	1202	Накладка композитная	1. ПОДГОТОВКА К ПРОТЕЗИРОВАНИЮ/ОРТОДОНТИИ	1.2 Накладки	5500	4	Накладка композитная принт\\фрез — 1 шт.	t	6	2026-04-09 15:29:19.17	2026-04-28 21:59:41.583
cmnrmuddy0004tjawlm5pn02s	pl_default_seed	1203	Ортодонтические накладки композитные Сложные.  Пакетное предложение	1. ПОДГОТОВКА К ПРОТЕЗИРОВАНИЮ/ОРТОДОНТИИ	1.2 Накладки	19000	11	Вариатор, композитные накладки —от 3 до 5 шт. 1 пакет на пациента	t	4	2026-04-09 15:29:19.174	2026-04-28 21:59:41.576
cmnrmude20005tjawhanxqcd2	pl_default_seed	2000	Цифровой Вариатор	2. ЦИФРОВЫЕ УСЛУГИ*	\N	5500	4	Цифровое Перемещение ВНЧС	t	7	2026-04-09 15:29:19.178	2026-04-28 21:59:41.586
cmnrmude50006tjaw00fnzaxg	pl_default_seed	2001	Сплинт полный протокол	2. ЦИФРОВЫЕ УСЛУГИ*	\N	12500	6	Вариатор, моделировка сплинта любой сложной конфигурации. Предоставляются файлы для изготовления/печати	t	8	2026-04-09 15:29:19.182	2026-04-28 21:59:41.59
cmnrmude80007tjawztoku1hi	pl_default_seed	2002	Сплинт простой/мышечный депрограмматор (Койса)	2. ЦИФРОВЫЕ УСЛУГИ*	\N	8000	3	Выполняется без перемещения ВНЧС (вариатора). В услугу входит моделировка простого сплинта. Предоставляются файлы для изготовления/печати	t	9	2026-04-09 15:29:19.185	2026-04-28 21:59:41.593
cmnrmudec0008tjawe7hjgr8n	pl_default_seed	2003	Комплексная(тотальная) моделировка	2. ЦИФРОВЫЕ УСЛУГИ*	\N	67000	10	Планирование любой тотальной реабилитации, включен вариатор, коррекции. Модели и силиконовые ключи не включены. Адаптация к препарированию — дополнительная услуга	t	10	2026-04-09 15:29:19.188	2026-04-28 21:59:41.596
cmnrmudef0009tjawmvicnnsb	pl_default_seed	2004	Адаптация тотальной моделировки к рабочим сканам.	2. ЦИФРОВЫЕ УСЛУГИ*	\N	22000	5	Адаптация планирования для вашего керамиста.	t	11	2026-04-09 15:29:19.191	2026-04-28 21:59:41.6
cmnrmudei000atjaw7au41xbx	pl_default_seed	2005	Диагностика по КЛКТ для ортопедического/ортодонтического лечения	2. ЦИФРОВЫЕ УСЛУГИ*	\N	17500	6	Оценка КЛКТ,вариатор, оценка кривых, подгрузка плоскостей и предварительная( не подлежит адаптации) моделировка. Без моделей.	t	12	2026-04-09 15:29:19.195	2026-04-28 21:59:41.604
cmnrmudel000btjaw00mmf7mp	pl_default_seed	2006	Единица цифрового моделирования	2. ЦИФРОВЫЕ УСЛУГИ*	\N	3000	2	Цифровое моделирование                                                                                                модели и силиконовых ключей не включено	t	13	2026-04-09 15:29:19.197	2026-04-28 21:59:41.607
cmnrmudeo000ctjaw4d09mtdi	pl_default_seed	2007	Планирование тотальной реабилитации Всеволодом Соколовым	2. ЦИФРОВЫЕ УСЛУГИ*	\N	110000	14	Планирование любой тотальной реабилитации Всеволодом Соколовым лично. Временные конструкции, конструкции на имплантах, балках. Адаптация к препарированию.	t	14	2026-04-09 15:29:19.2	2026-04-28 21:59:41.611
cmnrmuder000dtjawer7rpmwg	pl_default_seed	2008	Просмотр исследованиия МРТ	2. ЦИФРОВЫЕ УСЛУГИ*	\N	3500	3	Просмотр и запись первичного видео-отчета по данным пациента.	t	16	2026-04-09 15:29:19.203	2026-04-28 21:59:41.62
cmnrmudeu000etjaw38i4kule	pl_default_seed	2009	Просмотр исследования МРТ	2. ЦИФРОВЫЕ УСЛУГИ	\N	3500	3	Просмотр и запись первичного видео-отчета по данным пациента.	t	15	2026-04-09 15:29:19.206	2026-04-09 15:29:19.206
cmnrmudex000ftjawr1i9tg67	pl_default_seed	3101	Временная коронка композитная	2. ЦИФРОВЫЕ УСЛУГИ*	3.1 Временные/композитные коронки и накладки	5500	6	Временная композитная коронка	t	17	2026-04-09 15:29:19.21	2026-04-28 21:59:41.624
cmnrmudf0000gtjawxjs526cr	pl_default_seed	3111	Временная коронка композитная на винтовой фиксации*	2. ЦИФРОВЫЕ УСЛУГИ*	3.1 Временные/композитные коронки и накладки	6500	6	Временная композитная коронка на винтовой фиксации\nБез учета стоимости протетических элементов	t	18	2026-04-09 15:29:19.212	2026-04-28 21:59:41.629
cmnrmudf4000htjawmpxwsuha	pl_default_seed	3102	Временная коронка принт/фрез*	2. ЦИФРОВЫЕ УСЛУГИ*	3.1 Временные/композитные коронки и накладки	5000	6	Временная PMMA коронка	t	19	2026-04-09 15:29:19.217	2026-04-28 21:59:41.633
cmnrmudf7000itjawwdh67ji4	pl_default_seed	3112	Временная коронка принт/фрез на винтовой фиксации*	2. ЦИФРОВЫЕ УСЛУГИ*	3.1 Временные/композитные коронки и накладки	5500	6	Временная коронка PMMA \nна винтовой фиксации\nБез учета стоимости протетических элементов	t	20	2026-04-09 15:29:19.22	2026-04-28 21:59:41.637
cmnrmudfb000jtjawzwdgsy0g	pl_default_seed	3103	Индивидуализация десны на PMMA сегмент	2. ЦИФРОВЫЕ УСЛУГИ*	3.1 Временные/композитные коронки и накладки	5500	2	«Розовая эстетика»	t	21	2026-04-09 15:29:19.224	2026-04-28 21:59:41.64
cmnrmudfe000ktjawn94adq8a	pl_default_seed	3104	Индивидуализация десны на PMMA 1 челюсть	2. ЦИФРОВЫЕ УСЛУГИ*	3.1 Временные/композитные коронки и накладки	9000	2	«Розовая эстетика»	t	22	2026-04-09 15:29:19.226	2026-04-28 21:59:41.645
cmnrmudfi000ltjawzy0g8h1m	pl_default_seed	3201	Коронка/Винир/Вкладка Emax полноанатомическая / с нанесением	2. ЦИФРОВЫЕ УСЛУГИ	3.2 Emax	13500	6	Коронка/винир/вкладка  Emax с индивидуальной окраской / с нанесением керамики + модели 2 шт	t	22	2026-04-09 15:29:19.23	2026-04-09 15:29:19.23
cmnrmudfl000mtjawqbrztq7j	pl_default_seed	3301	Коронка/винир/вкладка (inlay, onlay) ДЦ полноанатомическая / с нанесением	2. ЦИФРОВЫЕ УСЛУГИ	3.3 ZrO2- Диоксид циркония	13500	7	Коронка/винир/вкладка (inlay, onlay) циркониевая в полную анатомию с индивидуальной окраской / с нанесением керамики + модели 2 шт	t	23	2026-04-09 15:29:19.233	2026-04-09 15:29:19.233
cmnrmudfo000ntjawbe9n2u7j	pl_default_seed	3302	Коронка ДЦ на винтовой фиксации  полноанатомическая / с нанесением	2. ЦИФРОВЫЕ УСЛУГИ	3.3 ZrO2- Диоксид циркония	14500	7	Коронка циркониевая в полную анатомию с индивидуальной окраской / с нанесением керамики на винтовой фиксации. Без учета стоимости протетических элементов + модели 2 шт	t	24	2026-04-09 15:29:19.236	2026-04-09 15:29:19.236
cmnrmudfr000otjaw34bm8oe4	pl_default_seed	3401	Абатмент Ti индивидуальный	2. ЦИФРОВЫЕ УСЛУГИ*	3.4 Абатменты	10000	5	Индивидуальный титановый абатмент\nБез учета стоимости протетических элементов	t	32	2026-04-09 15:29:19.239	2026-04-28 21:59:41.684
cmnrmudft000ptjawai7f0g74	pl_default_seed	3402	Абатмент ДЦ индивидуальный	2. ЦИФРОВЫЕ УСЛУГИ*	3.4 Абатменты	9000	5	Индивидуальный циркониевый абатмент\nБез учета стоимости протетических элементов	t	33	2026-04-09 15:29:19.242	2026-04-28 21:59:41.688
cmnrmudfw000qtjawd6tduyrg	pl_default_seed	3501	Протез из ДЦ  на винтовой фиксации/с наненсением	2. ЦИФРОВЫЕ УСЛУГИ	3.5 All-on-X	147000	15	Протез из диоксида циркония в полную анатомию с индивидуальной окраской / с нанесением на винтовой фиксации на 1 челюсть. \nБез учета стоимости протетических элементов	t	27	2026-04-09 15:29:19.245	2026-04-09 15:29:19.245
cmnrmudfz000rtjawq6uzvvzd	pl_default_seed	3502	Протез из ДЦ  на винтовой фиксации	2. ЦИФРОВЫЕ УСЛУГИ*	3.5 All on X	147000	15	Протез из диоксида циркония в полную анатомию или\nс нанесением керамики на титановой балке на 1 челюсть.  Защитная каппа по запросу.\nВключены прототипы и трансфер-чеки. Без учета стоимости протетических элементов	t	28	2026-04-09 15:29:19.248	2026-04-28 21:59:41.671
cmnrmudg2000stjaweum4tu84	pl_default_seed	3503	Акриловый протез с армированием	2. ЦИФРОВЫЕ УСЛУГИ	3.5 All-on-X	80000	\N	Титановая балка, зубы Кандулор (при наличии у поставщика и подходящем фасоне), композитная десна. \n2 принтованные модели, 1 прототип, 1 трансфер-чек на всю челюсть	t	29	2026-04-09 15:29:19.251	2026-04-09 15:29:19.251
cmnrmudg5000ttjawze71uxc9	pl_default_seed	3504	Протез из ДЦ на балке	2. ЦИФРОВЫЕ УСЛУГИ*	3.5 All on X	169000	17	Протез из диоксида циркония в полную анатомию или\nс нанесением керамики на титановой балке на 1 челюсть.  Защитная каппа по запросу.\nВключены прототипы и трансфер-чеки. Без учета стоимости протетических элементов	t	29	2026-04-09 15:29:19.254	2026-04-28 21:59:41.673
cmnrmudg8000utjaw7rc2808j	pl_default_seed	4001	Колпачок для доработки	4. ВСПОМОГАТЕЛЬНЫЕ ПОЗИЦИИ	\N	1000	2	Шаблон для доработки культи/зуба за 1ед. Включены в ортопедические работы. Стоимость указана для заказа как отдельной работы.	t	34	2026-04-09 15:29:19.256	2026-04-28 21:59:41.691
cmnrmudgb000vtjawk1lvxluy	pl_default_seed	4002	Силиконовый ключ с 1 печатной моделью	4. ВСПОМОГАТЕЛЬНЫЕ ПОЗИЦИИ	\N	4000	2	Силиконовый ключ с коррегирующей массой, шейки подрезаны. Печатная модель	t	35	2026-04-09 15:29:19.259	2026-04-28 21:59:41.694
cmnrmudgd000wtjawyibsingm	pl_default_seed	4003	Рентген-контрастный шаблон	4. ВСПОМОГАТЕЛЬНЫЕ ПОЗИЦИИ	\N	7000	5	Индивидуальный шаблон для проведения КЛКТ исследования в сложных клинических ситуациях.	t	36	2026-04-09 15:29:19.262	2026-04-28 21:59:41.698
cmnrmudgg000xtjawxlaefaqq	pl_default_seed	4004	Шаблон для пластики слизистой	4. ВСПОМОГАТЕЛЬНЫЕ ПОЗИЦИИ	\N	7500	4	Шаблон для коррекции зенитов. Моделировка не включена.	t	37	2026-04-09 15:29:19.265	2026-04-28 21:59:41.701
cmnrmudgj000ytjawu9kaz6nc	pl_default_seed	4005	Печатный регистрат прикуса	4. ВСПОМОГАТЕЛЬНЫЕ ПОЗИЦИИ	\N	7500	4	Моделировка регистрата и изготовление	t	38	2026-04-09 15:29:19.267	2026-04-28 21:59:41.705
cmnrmudgm000ztjawp01u13k5	pl_default_seed	4006	Каппа для композитного протокола	4. ВСПОМОГАТЕЛЬНЫЕ ПОЗИЦИИ	\N	6500	3	Прозрачная двухслойная каппа для изготовления композитного мокапа в полости рта. Внешний слой - жесткий, внутренний - мягкий. (Отверстия по запросу)	t	39	2026-04-09 15:29:19.27	2026-04-28 21:59:41.708
cmnrmudgo0010tjawompo9aly	pl_default_seed	4007	Модель гипсовая неразборная/диагностическая	4. ВСПОМОГАТЕЛЬНЫЕ ПОЗИЦИИ	\N	2000	5	Модель из гипса 4 класса	t	40	2026-04-09 15:29:19.273	2026-04-28 21:59:41.711
cmnrmudgr0011tjawakvxqfod	pl_default_seed	4008	Трансфер-чек (за 1 опору)	4. ВСПОМОГАТЕЛЬНЫЕ ПОЗИЦИИ	\N	2000	3	Цена указана за 1 опору. протетика в стоимость работы не входят. Включен в работы ALL ON X	t	41	2026-04-09 15:29:19.276	2026-04-28 21:59:41.714
cmnrmudgu0012tjawygbzkgl9	pl_default_seed	4009	Индивидуальная ложка аналоговая/принтованная	4. ВСПОМОГАТЕЛЬНЫЕ ПОЗИЦИИ	\N	3500	3	Индивидуальная ложка аналоговая/принтованная.	t	42	2026-04-09 15:29:19.279	2026-04-28 21:59:41.717
cmnrmudgx0013tjawd5lxovo3	pl_default_seed	4010	Шаблон для аутотрансплантации	4. ВСПОМОГАТЕЛЬНЫЕ ПОЗИЦИИ	\N	1500	3	Сепарация 1 ед. из КЛКТ исследования, принтованный шаблон одного зуба для аутотрансплантации	t	43	2026-04-09 15:29:19.281	2026-04-28 21:59:41.721
cmnrmudh00014tjaw1ts283ij	pl_default_seed	5001	Сплинт	5. ИЗГОТОВЛЕНИЕ ПО ФАЙЛУ	\N	4000	4	Сплинт без обработки и модели	t	45	2026-04-09 15:29:19.284	2026-04-28 21:59:41.729
cmnrmudh30015tjaw643moeaz	pl_default_seed	5002	Сплинт  с обработкой	5. ИЗГОТОВЛЕНИЕ ПО ФАЙЛУ	\N	6500	5	Сплинт с посадкой, полировкой и печатной моделью	t	46	2026-04-09 15:29:19.287	2026-04-28 21:59:41.732
cmnrmudh50016tjawycbtiewg	pl_default_seed	5003	Модель неразборная/диагностическая	5. ИЗГОТОВЛЕНИЕ ПО ФАЙЛУ	\N	2500	2	Одна модель изготовленная методом 3D-печати	t	47	2026-04-09 15:29:19.29	2026-04-28 21:59:41.737
cmnrmudh80017tjaw7pr56yzh	pl_default_seed	6016	Навигационный шаблон для несьемных аппаратов до 4  мини-винтов	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	8000	6	Планирование и шаблон для установки до 4 мини-имплантов.	t	89	2026-04-09 15:29:19.293	2026-04-28 21:59:41.896
cmnrmudhb0018tjawnp5oanhf	pl_default_seed	6017	Моделирование под навигационную хирургию	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	\N	2000	\N	Ортопедическое моделирование для ориентира при заказе и планировании навигации	t	59	2026-04-09 15:29:19.295	2026-04-28 21:59:41.779
cmnrmudhd0019tjawsnzona8h	pl_default_seed	6001	Планирование до 2х единиц с опорой на зубы	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	\N	10000	9	Планирование имплантации, шаблон под имплантацию, БЕЗ моделирования ортопедии	t	51	2026-04-09 15:29:19.298	2026-04-28 21:59:41.749
cmnrmudhg001atjaw8gbqeqy2	pl_default_seed	6002	Планирование от 3-х до 5-и единиц с опорой на зубы	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	\N	12500	9	Планирование имплантации, шаблон под имплантацию. Стоимость БЕЗ учета втулок, БЕЗ моделирования ортопедии	t	52	2026-04-09 15:29:19.301	2026-04-28 21:59:41.754
cmnrmudhj001btjawzpf5l3dn	pl_default_seed	6003	Планирование навигации ALL ON X	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	\N	18500	11	Планирование имплантации, шаблоны под имплантацию, редукцию,назубный, модель. Стоимость БЕЗ учета втулок, БЕЗ моделирования ортопедии	t	53	2026-04-09 15:29:19.303	2026-04-28 21:59:41.758
cmnrmudhm001ctjawe6no6nlh	pl_default_seed	6004	Дополнительный шаблон	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	\N	7500	1	Перенос на зубы, перенос нагрузки и другие вспомогательные шаблоны	t	54	2026-04-09 15:29:19.306	2026-04-28 21:59:41.762
cmnrmudhp001dtjawhlqktsbu	pl_default_seed	6005	Немедленная нагрузка без армирования	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	\N	44000	\N	Все типы: FP1, FP2, FP3 с индивидуализацией десны. Включены: Моделировка, протез.\nПротетические элементы оплачиваются отдельно.	t	55	2026-04-09 15:29:19.309	2026-04-28 21:59:41.765
cmnrmudhs001etjaw6l3bw244	pl_default_seed	6006	Немедленная нагрузка с армированием	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	\N	55000	\N	Все типы: FP1, FP2, FP3 с индивидуализацией десны. Моделировка, протез, армирование балкой.\nПротетические элементы оплачиваются отдельно.	t	56	2026-04-09 15:29:19.312	2026-04-28 21:59:41.768
cmnrmudhu001ftjawun8qobeg	pl_default_seed	6015	Немедленная нагрузка на винтовой фиксации	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	\N	7000	3	Одиночные коронки и констструкции до 8 единиц. Протетические элементы оплачиваются отдельно.	t	57	2026-04-09 15:29:19.315	2026-04-28 21:59:41.772
cmnrmudhx001gtjaw9xc3dq7g	pl_default_seed	7151	Аппарат Дерихсвайлера ТИТАН	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.15 Несъемные ортодонтические аппараты из ТИТАНА	20000	13	Моделировка и изготовление аппарата для расширения небного шва,винт. ВКЛЮЧАЯ ДОПОЛНИТЕЛЬНЫЕ ЭЛЕМЕНТЫ	t	61	2026-04-09 15:29:19.318	2026-04-28 21:59:41.786
cmnrmudi0001htjawm9ndijy9	pl_default_seed	7152	Аппарат Марко Росса/HAAS ТИТАН	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.15 Несъемные ортодонтические аппараты из ТИТАНА	22000	13	Моделировка и изготовление аппарата для расширения небного шва с пластмассовым базисом,винт. ВКЛЮЧАЯ ДОПОЛНИТЕЛЬНЫЕ ЭЛЕМЕНТЫ	t	62	2026-04-09 15:29:19.321	2026-04-28 21:59:41.79
cmnrmudi3001itjawfsq6rpsu	pl_default_seed	7154	Кольцо с держателем места ТИТАН	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.15 Несъемные ортодонтические аппараты из ТИТАНА	7500	7	Моделировка и изготовление аппарата	t	63	2026-04-09 15:29:19.324	2026-04-28 21:59:41.793
cmnrmudi6001jtjawyxo3mzdu	pl_default_seed	7101	Аппарат Дерихсвайлера	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	17000	9	Моделировка и изготовление аппарата для расширения небного шва,винт. ВКЛЮЧАЯ ДОПОЛНИТЕЛЬНЫЕ ЭЛЕМЕНТЫ	t	64	2026-04-09 15:29:19.326	2026-04-28 21:59:41.797
cmnrmudi9001ktjawggf2ay2u	pl_default_seed	7102	Аппарат Марко Росса/HAAS	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	19000	9	Моделировка и изготовление аппарата для расширения небного шва с пластмассовым базисом,винт. ВКЛЮЧАЯ ДОПОЛНИТЕЛЬНЫЕ ЭЛЕМЕНТЫ	t	65	2026-04-09 15:29:19.329	2026-04-28 21:59:41.801
cmnrmudic001ltjawykehhkbw	pl_default_seed	7103	Аппарат Нансе	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	15500	9	Моделировка и изготовление аппарата	t	66	2026-04-09 15:29:19.332	2026-04-28 21:59:41.804
cmnrmudie001mtjawiwcepgku	pl_default_seed	7104	Кольцо с пружинами	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	7000	7	Моделировка и изготовление аппарата	t	68	2026-04-09 15:29:19.335	2026-04-28 21:59:41.81
cmnrmudih001ntjawvki1ci20	pl_default_seed	7105	Губной бампер	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	7000	7	Моделировка и изготовление аппарата	t	69	2026-04-09 15:29:19.338	2026-04-28 21:59:41.814
cmnrmudik001otjawic6wnn55	pl_default_seed	7106	Лингвальная дуга	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	11000	9	Моделировка и изготовление аппарата ВКЛЮЧАЯ ДОПОЛНИТЕЛЬНЫЕ ЭЛЕМЕНТЫ	t	70	2026-04-09 15:29:19.341	2026-04-28 21:59:41.817
cmnrmudin001ptjawc2zc9oi0	pl_default_seed	7107	Небный бюгель	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	11000	9	Моделировка и изготовление аппарата ВКЛЮЧАЯ ДОПОЛНИТЕЛЬНЫЕ ЭЛЕМЕНТЫ	t	71	2026-04-09 15:29:19.344	2026-04-28 21:59:41.821
cmnrmudiq001qtjawlsdkptm9	pl_default_seed	7108	Заслонка для языка (несъемная конструкция)	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	11000	10	Моделировка и изготовление аппарата	t	72	2026-04-09 15:29:19.346	2026-04-28 21:59:41.825
cmnrmudit001rtjaw5jnoqr3y	pl_default_seed	7111	Заслонка для языка (несъемная конструкция)	7. ЦИФРОВАЯ ОРТОДОНТИЯ	7.1 Несъемные ортодонтические аппараты (цифровые, без пайки)*	11000	9	Моделировка и изготовление аппарата,модель	t	64	2026-04-09 15:29:19.349	2026-04-09 15:29:19.349
cmnrmudiw001stjaw92ebeb6d	pl_default_seed	7109	Аппарат Гербста	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	42000	14	Моделировка и изготовление аппарата,модели(ключ для установки не входит в комплектацию)	t	73	2026-04-09 15:29:19.352	2026-04-28 21:59:41.828
cmnrmudiy001ttjawvwe6pa6p	pl_default_seed	7110	Аппарат Гербста с винтом	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	46000	14	Моделировка и изготовление аппарата,модели(ключ для установки не входит в комплектацию)	t	74	2026-04-09 15:29:19.355	2026-04-28 21:59:41.832
cmnrmudj1001utjaw1avw1bol	pl_default_seed	7113	Расширяющий аппарат на 2 мини имплантах с одним винтом	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	30000	12	Моделировка и изготовление аппарата,один винт,шаблон для установки мини имплантов	t	75	2026-04-09 15:29:19.358	2026-04-28 21:59:41.836
cmnrmudj4001vtjaw12rc7ocy	pl_default_seed	7114	Расширяющий аппарат на 4 мини имплантах с одним винтом	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	33000	12	Моделировка и изготовление аппарата,модель,один винт,шаблон для установки мини имплантов	t	76	2026-04-09 15:29:19.361	2026-04-28 21:59:41.84
cmnrmudj7001wtjawnmr1b4cb	pl_default_seed	7115	Аппарат для расширения и дистализации с тремя винтами на 2 мини имплантах	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	39000	12	Моделировка и изготовление аппарата,модель,три винта,шаблон для установки мини имплантов	t	77	2026-04-09 15:29:19.363	2026-04-28 21:59:41.843
cmnrmudj9001xtjawwwdtiqta	pl_default_seed	7116	Дистализирующий аппарат на 2 мини импланта с одним винтом	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	32000	12	Моделировка и изготовление аппарата,модель,один винт,шаблон для установки мини имплантов	t	78	2026-04-09 15:29:19.366	2026-04-28 21:59:41.847
cmnrmudjc001ytjawlqb8mvxs	pl_default_seed	7117	Дистализирующий аппарат на 2 мини импланта с двумя винтами для дистализации	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	35000	12	Моделировка и изготовление аппарата,модель,два винта,шаблон для установки мини имплантов	t	79	2026-04-09 15:29:19.368	2026-04-28 21:59:41.85
cmnrmudjf001ztjawu0je5tjd	pl_default_seed	7118	Дистализирующий аппарат с одним винтом	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	19500	9	Моделировка и изготовление аппарата,один винт	t	80	2026-04-09 15:29:19.371	2026-04-28 21:59:41.853
cmnrmudjh0020tjawa9ib618o	pl_default_seed	7119	Дистализирующий аппарат с двумя винтами	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	24500	9	Моделировка и изготовление аппарата,два винта	t	81	2026-04-09 15:29:19.374	2026-04-28 21:59:41.858
cmnrmudjk0021tjawztjfrsjx	pl_default_seed	7120	Дистализатор с одной или двумя пружинами на мини-имплантах	7. ЦИФРОВАЯ ОРТОДОНТИЯ	7.1 Несъемные ортодонтические аппараты (цифровые, без пайки)*	40000	14	Пружина,стопор,ключ для активации пружины,ключ для активации винта,\nшаблон для мини-имплантов	t	74	2026-04-09 15:29:19.376	2026-04-09 15:29:19.376
cmnrmudjn0022tjaw0leoh11e	pl_default_seed	7122	Аппарат Pendulum	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	10500	11	Моделировка колец, изготовление аппарата и модель. Винт оплачивается отдельно	t	86	2026-04-09 15:29:19.379	2026-04-28 21:59:41.884
cmnrmudjp0023tjawwveh0cld	pl_default_seed	7123	Мезиолизатор	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	17000	12	Аппарат на одном минивинте из 2-х опорных колец мезиализирующий	t	87	2026-04-09 15:29:19.382	2026-04-28 21:59:41.889
cmnrmudjs0024tjawjvutb5yt	pl_default_seed	7124	Дополнительный мини-имплант	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	3000	1	Постановка и включение в работу дополнительного мини-импланта	t	90	2026-04-09 15:29:19.384	2026-04-28 21:59:41.899
cmnrmudju0025tjaw19t1ylc0	pl_default_seed	7125	Аппарат на мини-имплантах без расширяющего винта	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	20000	14	Моделировка и изготовление аппарата,шаблон для установки мини имплантов	t	83	2026-04-09 15:29:19.387	2026-04-28 21:59:41.865
cmnrmudjx0026tjawyhbvfyfi	pl_default_seed	7201	Ретенционная пластинка	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.2 Съемные ортодонтические аппараты	7000	8	Съемный ретенционный аппарат,который устанавливается после завершения лечения исправления прикуса	t	91	2026-04-09 15:29:19.389	2026-04-28 21:59:41.902
cmnrmudjz0027tjawnsx7att4	pl_default_seed	7202	Аппарат Шварца	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.2 Съемные ортодонтические аппараты	8500	8	Изготовление аппарата (ретракционная дуга, два кламмера и один винт)	t	93	2026-04-09 15:29:19.392	2026-04-28 21:59:41.911
cmnrmudk20028tjawqjyoxsup	pl_default_seed	7203	Аппарат Твин Блок	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.2 Съемные ортодонтические аппараты	13500	10	Изготовление аппарата ( винты 2 шт)	t	94	2026-04-09 15:29:19.394	2026-04-28 21:59:41.915
cmnrmudk50029tjaw9flfbm4h	pl_default_seed	7204	Аппарат Френкля	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.2 Съемные ортодонтические аппараты	15500	10	Изготовление любого типа аппарата	t	95	2026-04-09 15:29:19.397	2026-04-28 21:59:41.918
cmnrmudk8002atjaw1g6k981l	pl_default_seed	7205	Аппарат Андрезена Гойпля	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.2 Съемные ортодонтические аппараты	12500	8	Изготовление аппарата с одним винтом	t	96	2026-04-09 15:29:19.4	2026-04-28 21:59:41.922
cmnrmudka002btjawqfqfizc0	pl_default_seed	7206	Аппарат Кламмта	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.2 Съемные ортодонтические аппараты	11000	8	Изготовление аппарата	t	97	2026-04-09 15:29:19.403	2026-04-28 21:59:41.926
cmnrmudkd002ctjawpbwuldgq	pl_default_seed	7207	Аппарат Брюкля	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.2 Съемные ортодонтические аппараты	8500	7	Изготовление аппарата	t	98	2026-04-09 15:29:19.405	2026-04-28 21:59:41.931
cmnrmudkg002dtjaw1h7s4uhe	pl_default_seed	7209	Каппа для отбеливания зубов	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.2 Съемные ортодонтические аппараты	5500	4	Изготовление специальной каппы для отбеливания	t	100	2026-04-09 15:29:19.408	2026-04-28 21:59:41.938
cmnrmudkj002etjawup7wvwnp	pl_default_seed	7210	Каппа с замещением деффекта до 4 зубов	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.2 Съемные ортодонтические аппараты	9500	5	Изготовление каппы и модель, гарнитурные зубы или печатные\\фрезерованные. Моделировка не включена в стоимость.	t	101	2026-04-09 15:29:19.411	2026-04-28 21:59:41.941
cmnrmudkm002ftjawdipq3gd2	pl_default_seed	7211	Каппа спортивная одночелюстная	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.2 Съемные ортодонтические аппараты	8500	5	Изготовление специальной капы	t	102	2026-04-09 15:29:19.414	2026-04-28 21:59:41.944
cmnrmudkp002gtjawtx5ijpjd	pl_default_seed	7212	Каппа ретенционная Osamu	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.2 Съемные ортодонтические аппараты	6500	4	Изготовление аппарата , 2 слоя мягкий и жесткий	t	103	2026-04-09 15:29:19.417	2026-04-28 21:59:41.947
cmnrmudks002htjawqh7izev3	pl_default_seed	7213	Каппа ретенционная Osamu	7. ЦИФРОВАЯ ОРТОДОНТИЯ	7.2 Съемные ортодонтические аппараты*	6500	4	Изготовление аппарата и модель принт	t	90	2026-04-09 15:29:19.42	2026-04-09 15:29:19.42
cmnrmudku002itjawlouxu08s	pl_default_seed	7215	Починка ортодонтических съемных аппаратов КЛИКЛаб	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.2 Съемные ортодонтические аппараты	3000	6	Починка аппаратов, изготовленных в лаборатории КЛИКЛаб. Негарантийные случаи (не брак производства)	t	105	2026-04-09 15:29:19.423	2026-04-28 21:59:41.956
cmnrmudkx002jtjawzg2wsa2h	pl_default_seed	7216	Аппарат Хоули	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.2 Съемные ортодонтические аппараты	8500	8	Съемный ретенционный аппарат,который устанавливается после завершения лечения исправления прикуса	t	92	2026-04-09 15:29:19.425	2026-04-28 21:59:41.907
cmnrmudl0002ktjawdagrk12j	pl_default_seed	7217	Починка ортодонтических съемных аппаратов КЛИКЛаб	7. ЦИФРОВАЯ ОРТОДОНТИЯ	7.2 Съемные ортодонтические аппараты*	3000	6	Починка аппаратов, изготовленных в лаборатории КЛИКЛаб. Негарантийные случаи	t	93	2026-04-09 15:29:19.428	2026-04-09 15:29:19.428
cmnrmudl3002ltjaw7a4r2gwn	pl_default_seed	7301	Добавление расширяющего винта в аппарат	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.3 Дополнительные элементы к ортодонтическим аппаратам	3500	3	Добавление расширяющего винта в аппарат	t	107	2026-04-09 15:29:19.431	2026-04-28 21:59:41.964
cmnrmudl6002mtjaw4ysbwvqu	pl_default_seed	7302	Добавление расширяющего винта в аппарат **	7. ЦИФРОВАЯ ОРТОДОНТИЯ	7.3 Дополнительные элементы к ортодонтическим аппаратам	3500	3	Добавление специального винта в аппарат+винт	t	95	2026-04-09 15:29:19.434	2026-04-09 15:29:19.434
cmnrmudl8002ntjawlq0blldx	pl_default_seed	7303	Заслон для языка	7. ЦИФРОВАЯ ОРТОДОНТИЯ	7.3 Дополнительные элементы к ортодонтическим аппаратам	3500	1	Доп.элемент для съёмных и несъемных аппаратов	t	96	2026-04-09 15:29:19.436	2026-04-09 15:29:19.436
cmnrmudla002otjaw9gi1ii7v	pl_default_seed	7304	Зуб пластмассовый	7. ЦИФРОВАЯ ОРТОДОНТИЯ	7.3 Дополнительные элементы к ортодонтическим аппаратам	1500	1	Доп.элемент для съёмных и несъемных аппаратов	t	97	2026-04-09 15:29:19.439	2026-04-09 15:29:19.439
cmnrmudld002ptjaweyj7dfk2	pl_default_seed	7305	Накусочная площадка/наклонная плоскость	7. ЦИФРОВАЯ ОРТОДОНТИЯ	7.3 Дополнительные элементы к ортодонтическим аппаратам	1500	1	Доп.элемент для съёмных и несъемных аппаратов	t	98	2026-04-09 15:29:19.441	2026-04-09 15:29:19.441
cmnrmudlg002qtjawnjts85t8	pl_default_seed	7306	Заслон для языка	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.3 Дополнительные элементы к ортодонтическим аппаратам	3500	1	Доп.элемент для съёмных и несъемных аппаратов	t	108	2026-04-09 15:29:19.444	2026-04-28 21:59:41.967
cmnrmudlj002rtjawx2c217o5	pl_default_seed	7309	Окклюзионная накладка	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.3 Дополнительные элементы к ортодонтическим аппаратам	1500	1	Доп.элемент для съёмных и несъемных аппаратов	t	111	2026-04-09 15:29:19.447	2026-04-28 21:59:41.977
cmoj65kw00003tjvg9lhhionc	pl_default_seed	1003	Сплинт сложный	1. ПОДГОТОВКА К ПРОТЕЗИРОВАНИЮ/ОРТОДОНТИИ	1.1 Сплинты	19000	11	Полный цифровой протокол,вариатор; моделировка сплинта любых сложных конфигураций; сплинт фрезерованный/принтованный с обработкой	t	2	2026-04-28 21:59:41.568	2026-04-28 21:59:41.568
cmoj65kw40005tjvglizpfne1	pl_default_seed	1004	Аппарат для лечения храпа	1. ПОДГОТОВКА К ПРОТЕЗИРОВАНИЮ/ОРТОДОНТИИ	1.1 Сплинты	33000	11	Изготовление без и с винтами(оплачиваются отдельно).	t	3	2026-04-28 21:59:41.572	2026-04-28 21:59:41.572
cmoj65kwc0009tjvgbpt9isgh	pl_default_seed	1207	Накладка композитная дополнительная для пакетного предложения	1. ПОДГОТОВКА К ПРОТЕЗИРОВАНИЮ/ОРТОДОНТИИ	1.2 Накладки	3000	\N	Накладка композитная дополнительная к пакетному предложению принт\\фрез — 1 шт.	t	5	2026-04-28 21:59:41.58	2026-04-28 21:59:41.58
cmoj65kya0019tjvg9upfeisx	pl_default_seed	3203	Коронка/Винир/Вкладка Emax	2. ЦИФРОВЫЕ УСЛУГИ*	3.2 Emax	13500	6	Коронка Emax, с индивидуальной покраской или нанесением 1шт	t	23	2026-04-28 21:59:41.65	2026-04-28 21:59:41.65
cmoj65kyf001btjvgt1f2p58s	pl_default_seed	3312	Коронка ДЦ	2. ЦИФРОВЫЕ УСЛУГИ*	3.3 ZrO2- Диоксид циркония	13500	7	Коронка циркониевая с индивидуальной покраской или нанесением на винтовой фиксации.	t	25	2026-04-28 21:59:41.655	2026-04-28 21:59:41.658
cmoj65kyz001ntjvgihaf1kbd	pl_default_seed	3505	Акриловый протез с армированием.	2. ЦИФРОВЫЕ УСЛУГИ*	3.5 All on X	80000	\N	Титановая балка, зубы Кандулор(при наличии у поставщика и подходящем фасоне), композитная десна.  Защитная каппа по запросу.\nВключены прототипы и трансфер-чеки. Без учета стоимости протетических элементовв	t	30	2026-04-28 21:59:41.676	2026-04-28 21:59:41.676
cmoj65kz4001ptjvg7mlyzj77	pl_default_seed	3506	Прикусной шаблон	2. ЦИФРОВЫЕ УСЛУГИ*	3.5 All on X	4500	5	Прикручиваемый шаблон на жестком базисе, не включая протетические компоненты	t	31	2026-04-28 21:59:41.68	2026-04-28 21:59:41.68
cmoj65l0c002ftjvgx04nr0s6	pl_default_seed	4011	Доставка	4. ВСПОМОГАТЕЛЬНЫЕ ПОЗИЦИИ	\N	500	1	Доставка по СПб при сумме заказа менее 5000	t	44	2026-04-28 21:59:41.725	2026-04-28 21:59:41.725
cmoj65l0s002ntjvghw57wi7w	pl_default_seed	5004	Накладка\\коронка композитная	5. ИЗГОТОВЛЕНИЕ ПО ФАЙЛУ	\N	1500	1	Без обработки и припасовки	t	48	2026-04-28 21:59:41.74	2026-04-28 21:59:41.74
cmoj65l4e004ntjvgzsqwqnam	pl_default_seed	7126	Расширяющий аппарат на двух мини-имплантах с одним винтом и пружинами для односторонней или двусторонней дистализации	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	42000	14	Пружина,стопор,ключ для активации пружины,ключ для активации винта,шаблон для мини-имплантов	t	84	2026-04-28 21:59:41.871	2026-04-28 21:59:41.871
cmoj65l4j004ptjvgt4sca7ee	pl_default_seed	7121	Аренда набора для установки мини имплантов	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.1 Несъемные ортодонтические аппараты	3500	2	Аренда набора Bio Ray для установки мини имплантов	t	85	2026-04-28 21:59:41.876	2026-04-28 21:59:41.876
cmoj65l66005htjvg828tpha6	pl_default_seed	7208	Каппа ретенционная\\элайнер	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.4 Элайнеры	5000	4	Изготовление каппы БЕЗ моделирования зубов и их постановки	t	115	2026-04-28 21:59:41.934	2026-04-28 21:59:41.994
cmoj65l6m005rtjvgg9txqpri	pl_default_seed	7214	Починка сторонних ортодонтических съемных аппаратов	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.2 Съемные ортодонтические аппараты	10000	6	Приварка зуба,замена проволочного элемента,починка трещины или перелома базиса,замена винта (винт оплачивается отдельно), из сторонних лабораторий	t	104	2026-04-28 21:59:41.95	2026-04-28 21:59:41.95
cmoj65l750061tjvgvr0o8hmy	pl_default_seed	7308	Зуб пластмассовый	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.3 Дополнительные элементы к ортодонтическим аппаратам	1500	1	Доп.элемент для съёмных и несъемных аппаратов	t	110	2026-04-28 21:59:41.969	2026-04-28 21:59:41.974
cmoj65l7g0067tjvgz4a3plnj	pl_default_seed	7401	Сетап до 3 ед.	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.4 Элайнеры	6500	5	Планирование нового положения зубов до 3 единиц. \nКаппы не включены	t	112	2026-04-28 21:59:41.981	2026-04-28 21:59:41.981
cmoj65l7l0069tjvgb1qr4g82	pl_default_seed	7402	Сетап до 6 ед.	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.4 Элайнеры	8500	7	Планирование нового положения зубов до 6 единиц.  \nКаппы не включены	t	113	2026-04-28 21:59:41.985	2026-04-28 21:59:41.985
cmoj65l7q006btjvgd0uxb3z8	pl_default_seed	7403	Сетап для одной челюсти более 6 ед.	6. НАВИГАЦИОННОЕ ПЛАНИРОВАНИЕ И НЕМЕДЛЕННЫЕ НАГРУЗКИ	7.4 Элайнеры	17500	11	Планирование нового положения зубов до 12 единиц.  \nКаппы не включены	t	114	2026-04-28 21:59:41.99	2026-04-28 21:59:41.99
\.


--
-- Data for Name: PriceListWorkspaceSettings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PriceListWorkspaceSettings" (id, "activePriceListId", "updatedAt") FROM stdin;
default	pl_default_seed	2026-04-24 11:55:42
\.


--
-- Data for Name: RoleModuleAccess; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RoleModuleAccess" (id, "tenantId", role, module, allowed, "updatedAt") FROM stdin;
\.


--
-- Data for Name: StockBalance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StockBalance" (id, "itemId", "warehouseId", "quantityOnHand", "averageUnitCostRub", "updatedAt") FROM stdin;
cmoabjrzv000ktjfwbunpkit9	cmoabj0r9000itjfw3xprchgp	cmoabi9pz000gtjfw4hm18cbd	0	0	2026-04-22 17:24:45.92
\.


--
-- Data for Name: StockMovement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StockMovement" (id, "createdAt", kind, quantity, "totalCostRub", note, "itemId", "warehouseId", "orderId", "actorLabel", "idempotencyKey", "returnedToWarehouseAt") FROM stdin;
cmoabjs00000mtjfw20tlccuc	2026-04-22 17:20:46.465	PURCHASE_RECEIPT	640	0	\N	cmoabj0r9000itjfw3xprchgp	cmoabi9pz000gtjfw4hm18cbd	\N	Пользователь	\N	\N
cmoabowrg000qtjfwu99ps70t	2026-04-22 17:24:45.916	DEFECT_WRITE_OFF	640	0	Брак по строке журнала PURCHASE_RECEIPT (cmoabjs00000mtjfw20tlccuc)	cmoabj0r9000itjfw3xprchgp	cmoabi9pz000gtjfw4hm18cbd	\N	Пользователь	journal-brak-cmoabjs00000mtjfw20tlccuc	\N
\.


--
-- Data for Name: SubscriptionInvoice; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SubscriptionInvoice" (id, "tenantId", "amountMinor", currency, status, provider, "providerExternalId", title, "createdAt", "paidAt") FROM stdin;
\.


--
-- Data for Name: TelegramBotLinkPending; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TelegramBotLinkPending" ("telegramUserId", "tenantSlug", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TelegramLinkToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."TelegramLinkToken" (id, token, "userId", "tenantId", "telegramUserId", "telegramUsername", "expiresAt", "consumedAt") FROM stdin;
\.


--
-- Data for Name: Tenant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Tenant" (id, slug, name, plan, "addonKanban", "subscriptionValidTo", "createdAt") FROM stdin;
cltenantdefault0000000000	default	Организация	ULTRA	t	\N	2026-04-24 13:11:27
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, "tenantId", email, "displayName", role, "passwordHash", "inviteCodeHash", "isActive", "createdAt", "updatedAt", "lastLoginAt", "telegramId", "telegramUsername", "telegramKanbanNotifyPrefs", phone, "avatarPresetId", "avatarCustomMime", "avatarCustomUploadedAt", "mentionHandle", "ordersListPageSize") FROM stdin;
cmnyoc1f80003tjtcx3nop3kq	cltenantdefault0000000000	iservak@gmail.com	Всеволод С	OWNER	$2b$11$APmzlrp.hSI4HrvO9hvgL.ip4pCTJhaeLu6ZIPcSqqhHUOJUBK7xC	\N	t	2026-04-14 13:45:26.324	2026-04-24 13:06:10.248	2026-04-24 13:06:10.246	\N	\N	\N	\N	bear	image/jpeg	2026-04-23 16:38:24.745	vsevolodsokolov	\N
cmobpf6bx004g6z01kxto9y8a	cltenantdefault0000000000	testcrm2@ozvmail.com	ТестСрм	SENIOR_ADMINISTRATOR	$2b$11$uDrXnbO.YVAfRGrzNuORJOL0YvsSJN/zqvTR5498eJGjJgIBTnt1.	\N	t	2026-04-23 16:36:52.557	2026-04-24 09:20:40.58	2026-04-24 09:20:40.579	\N	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: Warehouse; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Warehouse" (id, name, "warehouseType", "isDefault", "isActive", notes, "createdAt") FROM stdin;
cmoa8hjdt0008tjhsduobrdqq	Основной склад	\N	t	t	\N	2026-04-22 15:55:03.138
cmoabi9pz000gtjfw4hm18cbd	Первый этаж	Производство	f	t	\N	2026-04-22 17:19:36.119
\.


--
-- Name: ClinicPriceOverride ClinicPriceOverride_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClinicPriceOverride"
    ADD CONSTRAINT "ClinicPriceOverride_pkey" PRIMARY KEY ("clinicId", "priceListItemId");


--
-- Name: ClinicReconciliationSnapshot ClinicReconciliationSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClinicReconciliationSnapshot"
    ADD CONSTRAINT "ClinicReconciliationSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: Clinic Clinic_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Clinic"
    ADD CONSTRAINT "Clinic_pkey" PRIMARY KEY (id);


--
-- Name: ConstructionType ConstructionType_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConstructionType"
    ADD CONSTRAINT "ConstructionType_pkey" PRIMARY KEY (id);


--
-- Name: ContractorRevision ContractorRevision_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContractorRevision"
    ADD CONSTRAINT "ContractorRevision_pkey" PRIMARY KEY (id);


--
-- Name: CostingClientProfile CostingClientProfile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CostingClientProfile"
    ADD CONSTRAINT "CostingClientProfile_pkey" PRIMARY KEY (id);


--
-- Name: CostingColumn CostingColumn_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CostingColumn"
    ADD CONSTRAINT "CostingColumn_pkey" PRIMARY KEY (id);


--
-- Name: CostingFixedCostItem CostingFixedCostItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CostingFixedCostItem"
    ADD CONSTRAINT "CostingFixedCostItem_pkey" PRIMARY KEY (id);


--
-- Name: CostingLinePoolShare CostingLinePoolShare_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CostingLinePoolShare"
    ADD CONSTRAINT "CostingLinePoolShare_pkey" PRIMARY KEY ("lineId", "poolId");


--
-- Name: CostingLine CostingLine_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CostingLine"
    ADD CONSTRAINT "CostingLine_pkey" PRIMARY KEY (id);


--
-- Name: CostingSharedPool CostingSharedPool_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CostingSharedPool"
    ADD CONSTRAINT "CostingSharedPool_pkey" PRIMARY KEY (id);


--
-- Name: CostingVersion CostingVersion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CostingVersion"
    ADD CONSTRAINT "CostingVersion_pkey" PRIMARY KEY (id);


--
-- Name: Courier Courier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Courier"
    ADD CONSTRAINT "Courier_pkey" PRIMARY KEY (id);


--
-- Name: DoctorClinicLinkSuppression DoctorClinicLinkSuppression_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DoctorClinicLinkSuppression"
    ADD CONSTRAINT "DoctorClinicLinkSuppression_pkey" PRIMARY KEY ("doctorId", "clinicId");


--
-- Name: DoctorOnClinic DoctorOnClinic_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DoctorOnClinic"
    ADD CONSTRAINT "DoctorOnClinic_pkey" PRIMARY KEY ("doctorId", "clinicId");


--
-- Name: Doctor Doctor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Doctor"
    ADD CONSTRAINT "Doctor_pkey" PRIMARY KEY (id);


--
-- Name: InventoryItem InventoryItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryItem"
    ADD CONSTRAINT "InventoryItem_pkey" PRIMARY KEY (id);


--
-- Name: KaitenCardType KaitenCardType_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."KaitenCardType"
    ADD CONSTRAINT "KaitenCardType_pkey" PRIMARY KEY (id);


--
-- Name: Material Material_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Material"
    ADD CONSTRAINT "Material_pkey" PRIMARY KEY (id);


--
-- Name: OrderAttachment OrderAttachment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderAttachment"
    ADD CONSTRAINT "OrderAttachment_pkey" PRIMARY KEY (id);


--
-- Name: OrderChatCorrection OrderChatCorrection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderChatCorrection"
    ADD CONSTRAINT "OrderChatCorrection_pkey" PRIMARY KEY (id);


--
-- Name: OrderConstruction OrderConstruction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderConstruction"
    ADD CONSTRAINT "OrderConstruction_pkey" PRIMARY KEY (id);


--
-- Name: OrderCustomTag OrderCustomTag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderCustomTag"
    ADD CONSTRAINT "OrderCustomTag_pkey" PRIMARY KEY (id);


--
-- Name: OrderNumberSettings OrderNumberSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderNumberSettings"
    ADD CONSTRAINT "OrderNumberSettings_pkey" PRIMARY KEY (id);


--
-- Name: OrderProstheticsRequest OrderProstheticsRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderProstheticsRequest"
    ADD CONSTRAINT "OrderProstheticsRequest_pkey" PRIMARY KEY (id);


--
-- Name: OrderRevision OrderRevision_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderRevision"
    ADD CONSTRAINT "OrderRevision_pkey" PRIMARY KEY (id);


--
-- Name: Order Order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_pkey" PRIMARY KEY (id);


--
-- Name: PriceListItem PriceListItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PriceListItem"
    ADD CONSTRAINT "PriceListItem_pkey" PRIMARY KEY (id);


--
-- Name: PriceListWorkspaceSettings PriceListWorkspaceSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PriceListWorkspaceSettings"
    ADD CONSTRAINT "PriceListWorkspaceSettings_pkey" PRIMARY KEY (id);


--
-- Name: PriceList PriceList_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PriceList"
    ADD CONSTRAINT "PriceList_pkey" PRIMARY KEY (id);


--
-- Name: RoleModuleAccess RoleModuleAccess_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RoleModuleAccess"
    ADD CONSTRAINT "RoleModuleAccess_pkey" PRIMARY KEY (id);


--
-- Name: StockBalance StockBalance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockBalance"
    ADD CONSTRAINT "StockBalance_pkey" PRIMARY KEY (id);


--
-- Name: StockMovement StockMovement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_pkey" PRIMARY KEY (id);


--
-- Name: SubscriptionInvoice SubscriptionInvoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SubscriptionInvoice"
    ADD CONSTRAINT "SubscriptionInvoice_pkey" PRIMARY KEY (id);


--
-- Name: TelegramBotLinkPending TelegramBotLinkPending_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TelegramBotLinkPending"
    ADD CONSTRAINT "TelegramBotLinkPending_pkey" PRIMARY KEY ("telegramUserId");


--
-- Name: TelegramLinkToken TelegramLinkToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TelegramLinkToken"
    ADD CONSTRAINT "TelegramLinkToken_pkey" PRIMARY KEY (id);


--
-- Name: Tenant Tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Warehouse Warehouse_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Warehouse"
    ADD CONSTRAINT "Warehouse_pkey" PRIMARY KEY (id);


--
-- Name: ClinicPriceOverride_priceListItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClinicPriceOverride_priceListItemId_idx" ON public."ClinicPriceOverride" USING btree ("priceListItemId");


--
-- Name: ClinicReconciliationSnapshot_clinicId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClinicReconciliationSnapshot_clinicId_createdAt_idx" ON public."ClinicReconciliationSnapshot" USING btree ("clinicId", "createdAt");


--
-- Name: ClinicReconciliationSnapshot_clinicId_slot_periodFromStr_pe_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ClinicReconciliationSnapshot_clinicId_slot_periodFromStr_pe_key" ON public."ClinicReconciliationSnapshot" USING btree ("clinicId", slot, "periodFromStr", "periodToStr");


--
-- Name: ClinicReconciliationSnapshot_dismissedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ClinicReconciliationSnapshot_dismissedAt_idx" ON public."ClinicReconciliationSnapshot" USING btree ("dismissedAt");


--
-- Name: Clinic_sourceDoctorId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Clinic_sourceDoctorId_key" ON public."Clinic" USING btree ("sourceDoctorId");


--
-- Name: Clinic_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Clinic_tenantId_idx" ON public."Clinic" USING btree ("tenantId");


--
-- Name: ContractorRevision_actorUserId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContractorRevision_actorUserId_createdAt_idx" ON public."ContractorRevision" USING btree ("actorUserId", "createdAt");


--
-- Name: ContractorRevision_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ContractorRevision_createdAt_idx" ON public."ContractorRevision" USING btree ("createdAt");


--
-- Name: CostingClientProfile_clinicId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CostingClientProfile_clinicId_idx" ON public."CostingClientProfile" USING btree ("clinicId");


--
-- Name: CostingClientProfile_versionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CostingClientProfile_versionId_idx" ON public."CostingClientProfile" USING btree ("versionId");


--
-- Name: CostingColumn_versionId_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CostingColumn_versionId_key_key" ON public."CostingColumn" USING btree ("versionId", key);


--
-- Name: CostingColumn_versionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CostingColumn_versionId_sortOrder_idx" ON public."CostingColumn" USING btree ("versionId", "sortOrder");


--
-- Name: CostingFixedCostItem_versionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CostingFixedCostItem_versionId_sortOrder_idx" ON public."CostingFixedCostItem" USING btree ("versionId", "sortOrder");


--
-- Name: CostingLinePoolShare_poolId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CostingLinePoolShare_poolId_idx" ON public."CostingLinePoolShare" USING btree ("poolId");


--
-- Name: CostingLine_priceListItemId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CostingLine_priceListItemId_idx" ON public."CostingLine" USING btree ("priceListItemId");


--
-- Name: CostingLine_versionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CostingLine_versionId_idx" ON public."CostingLine" USING btree ("versionId");


--
-- Name: CostingSharedPool_versionId_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "CostingSharedPool_versionId_key_key" ON public."CostingSharedPool" USING btree ("versionId", key);


--
-- Name: CostingSharedPool_versionId_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CostingSharedPool_versionId_sortOrder_idx" ON public."CostingSharedPool" USING btree ("versionId", "sortOrder");


--
-- Name: CostingVersion_archived_effectiveFrom_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CostingVersion_archived_effectiveFrom_idx" ON public."CostingVersion" USING btree (archived, "effectiveFrom");


--
-- Name: Courier_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Courier_name_idx" ON public."Courier" USING btree (name);


--
-- Name: Courier_tenantId_isActive_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Courier_tenantId_isActive_sortOrder_idx" ON public."Courier" USING btree ("tenantId", "isActive", "sortOrder");


--
-- Name: DoctorClinicLinkSuppression_clinicId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DoctorClinicLinkSuppression_clinicId_idx" ON public."DoctorClinicLinkSuppression" USING btree ("clinicId");


--
-- Name: DoctorOnClinic_clinicId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DoctorOnClinic_clinicId_idx" ON public."DoctorOnClinic" USING btree ("clinicId");


--
-- Name: DoctorOnClinic_doctorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "DoctorOnClinic_doctorId_idx" ON public."DoctorOnClinic" USING btree ("doctorId");


--
-- Name: Doctor_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Doctor_tenantId_idx" ON public."Doctor" USING btree ("tenantId");


--
-- Name: InventoryItem_isActive_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryItem_isActive_sortOrder_idx" ON public."InventoryItem" USING btree ("isActive", "sortOrder");


--
-- Name: InventoryItem_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryItem_name_idx" ON public."InventoryItem" USING btree (name);


--
-- Name: InventoryItem_warehouseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "InventoryItem_warehouseId_idx" ON public."InventoryItem" USING btree ("warehouseId");


--
-- Name: InventoryItem_warehouseId_sku_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "InventoryItem_warehouseId_sku_key" ON public."InventoryItem" USING btree ("warehouseId", sku);


--
-- Name: KaitenCardType_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "KaitenCardType_name_idx" ON public."KaitenCardType" USING btree (name);


--
-- Name: KaitenCardType_tenantId_isActive_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "KaitenCardType_tenantId_isActive_sortOrder_idx" ON public."KaitenCardType" USING btree ("tenantId", "isActive", "sortOrder");


--
-- Name: OrderAttachment_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderAttachment_orderId_idx" ON public."OrderAttachment" USING btree ("orderId");


--
-- Name: OrderChatCorrection_orderId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderChatCorrection_orderId_createdAt_idx" ON public."OrderChatCorrection" USING btree ("orderId", "createdAt");


--
-- Name: OrderChatCorrection_orderId_kaitenCommentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OrderChatCorrection_orderId_kaitenCommentId_key" ON public."OrderChatCorrection" USING btree ("orderId", "kaitenCommentId");


--
-- Name: OrderChatCorrection_orderId_rejectedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderChatCorrection_orderId_rejectedAt_idx" ON public."OrderChatCorrection" USING btree ("orderId", "rejectedAt");


--
-- Name: OrderChatCorrection_orderId_resolvedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderChatCorrection_orderId_resolvedAt_idx" ON public."OrderChatCorrection" USING btree ("orderId", "resolvedAt");


--
-- Name: OrderConstruction_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderConstruction_orderId_idx" ON public."OrderConstruction" USING btree ("orderId");


--
-- Name: OrderCustomTag_label_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderCustomTag_label_idx" ON public."OrderCustomTag" USING btree (label);


--
-- Name: OrderCustomTag_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderCustomTag_orderId_idx" ON public."OrderCustomTag" USING btree ("orderId");


--
-- Name: OrderCustomTag_orderId_label_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OrderCustomTag_orderId_label_key" ON public."OrderCustomTag" USING btree ("orderId", label);


--
-- Name: OrderProstheticsRequest_orderId_kaitenCommentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "OrderProstheticsRequest_orderId_kaitenCommentId_key" ON public."OrderProstheticsRequest" USING btree ("orderId", "kaitenCommentId");


--
-- Name: OrderProstheticsRequest_orderId_rejectedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderProstheticsRequest_orderId_rejectedAt_idx" ON public."OrderProstheticsRequest" USING btree ("orderId", "rejectedAt");


--
-- Name: OrderProstheticsRequest_orderId_resolvedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderProstheticsRequest_orderId_resolvedAt_idx" ON public."OrderProstheticsRequest" USING btree ("orderId", "resolvedAt");


--
-- Name: OrderRevision_actorUserId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderRevision_actorUserId_createdAt_idx" ON public."OrderRevision" USING btree ("actorUserId", "createdAt");


--
-- Name: OrderRevision_orderId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "OrderRevision_orderId_createdAt_idx" ON public."OrderRevision" USING btree ("orderId", "createdAt");


--
-- Name: Order_archivedAt_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_archivedAt_createdAt_idx" ON public."Order" USING btree ("archivedAt", "createdAt");


--
-- Name: Order_clinicId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_clinicId_idx" ON public."Order" USING btree ("clinicId");


--
-- Name: Order_continuesFromOrderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_continuesFromOrderId_idx" ON public."Order" USING btree ("continuesFromOrderId");


--
-- Name: Order_courierDeliveryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_courierDeliveryId_idx" ON public."Order" USING btree ("courierDeliveryId");


--
-- Name: Order_courierId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_courierId_idx" ON public."Order" USING btree ("courierId");


--
-- Name: Order_courierPickupId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_courierPickupId_idx" ON public."Order" USING btree ("courierPickupId");


--
-- Name: Order_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_createdAt_idx" ON public."Order" USING btree ("createdAt");


--
-- Name: Order_invoiceAttachmentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Order_invoiceAttachmentId_key" ON public."Order" USING btree ("invoiceAttachmentId");


--
-- Name: Order_kaitenCardTypeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_kaitenCardTypeId_idx" ON public."Order" USING btree ("kaitenCardTypeId");


--
-- Name: Order_labWorkStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_labWorkStatus_idx" ON public."Order" USING btree ("labWorkStatus");


--
-- Name: Order_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_status_idx" ON public."Order" USING btree (status);


--
-- Name: Order_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Order_tenantId_idx" ON public."Order" USING btree ("tenantId");


--
-- Name: Order_tenantId_orderNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Order_tenantId_orderNumber_key" ON public."Order" USING btree ("tenantId", "orderNumber");


--
-- Name: PriceListItem_priceListId_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PriceListItem_priceListId_code_key" ON public."PriceListItem" USING btree ("priceListId", code);


--
-- Name: PriceListItem_priceListId_isActive_sortOrder_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PriceListItem_priceListId_isActive_sortOrder_idx" ON public."PriceListItem" USING btree ("priceListId", "isActive", "sortOrder");


--
-- Name: PriceListWorkspaceSettings_activePriceListId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PriceListWorkspaceSettings_activePriceListId_key" ON public."PriceListWorkspaceSettings" USING btree ("activePriceListId");


--
-- Name: PriceList_sortOrder_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PriceList_sortOrder_name_idx" ON public."PriceList" USING btree ("sortOrder", name);


--
-- Name: RoleModuleAccess_tenantId_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RoleModuleAccess_tenantId_role_idx" ON public."RoleModuleAccess" USING btree ("tenantId", role);


--
-- Name: RoleModuleAccess_tenantId_role_module_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "RoleModuleAccess_tenantId_role_module_key" ON public."RoleModuleAccess" USING btree ("tenantId", role, module);


--
-- Name: StockBalance_itemId_warehouseId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StockBalance_itemId_warehouseId_key" ON public."StockBalance" USING btree ("itemId", "warehouseId");


--
-- Name: StockMovement_idempotencyKey_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "StockMovement_idempotencyKey_key" ON public."StockMovement" USING btree ("idempotencyKey");


--
-- Name: StockMovement_itemId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockMovement_itemId_createdAt_idx" ON public."StockMovement" USING btree ("itemId", "createdAt");


--
-- Name: StockMovement_orderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockMovement_orderId_idx" ON public."StockMovement" USING btree ("orderId");


--
-- Name: StockMovement_warehouseId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StockMovement_warehouseId_createdAt_idx" ON public."StockMovement" USING btree ("warehouseId", "createdAt");


--
-- Name: SubscriptionInvoice_providerExternalId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SubscriptionInvoice_providerExternalId_key" ON public."SubscriptionInvoice" USING btree ("providerExternalId");


--
-- Name: SubscriptionInvoice_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SubscriptionInvoice_status_idx" ON public."SubscriptionInvoice" USING btree (status);


--
-- Name: SubscriptionInvoice_tenantId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SubscriptionInvoice_tenantId_createdAt_idx" ON public."SubscriptionInvoice" USING btree ("tenantId", "createdAt");


--
-- Name: TelegramLinkToken_telegramUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "TelegramLinkToken_telegramUserId_idx" ON public."TelegramLinkToken" USING btree ("telegramUserId");


--
-- Name: TelegramLinkToken_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "TelegramLinkToken_token_key" ON public."TelegramLinkToken" USING btree (token);


--
-- Name: Tenant_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Tenant_slug_key" ON public."Tenant" USING btree (slug);


--
-- Name: User_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_isActive_idx" ON public."User" USING btree ("isActive");


--
-- Name: User_mentionHandle_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_mentionHandle_key" ON public."User" USING btree ("mentionHandle");


--
-- Name: User_phone_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_phone_key" ON public."User" USING btree (phone);


--
-- Name: User_role_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_role_idx" ON public."User" USING btree (role);


--
-- Name: User_telegramId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_telegramId_key" ON public."User" USING btree ("telegramId");


--
-- Name: User_tenantId_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_tenantId_email_key" ON public."User" USING btree ("tenantId", email);


--
-- Name: User_tenantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_tenantId_idx" ON public."User" USING btree ("tenantId");


--
-- Name: ClinicPriceOverride ClinicPriceOverride_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClinicPriceOverride"
    ADD CONSTRAINT "ClinicPriceOverride_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public."Clinic"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClinicPriceOverride ClinicPriceOverride_priceListItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClinicPriceOverride"
    ADD CONSTRAINT "ClinicPriceOverride_priceListItemId_fkey" FOREIGN KEY ("priceListItemId") REFERENCES public."PriceListItem"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClinicReconciliationSnapshot ClinicReconciliationSnapshot_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ClinicReconciliationSnapshot"
    ADD CONSTRAINT "ClinicReconciliationSnapshot_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public."Clinic"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Clinic Clinic_sourceDoctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Clinic"
    ADD CONSTRAINT "Clinic_sourceDoctorId_fkey" FOREIGN KEY ("sourceDoctorId") REFERENCES public."Doctor"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Clinic Clinic_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Clinic"
    ADD CONSTRAINT "Clinic_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ContractorRevision ContractorRevision_actorUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContractorRevision"
    ADD CONSTRAINT "ContractorRevision_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ContractorRevision ContractorRevision_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContractorRevision"
    ADD CONSTRAINT "ContractorRevision_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public."Clinic"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ContractorRevision ContractorRevision_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ContractorRevision"
    ADD CONSTRAINT "ContractorRevision_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."Doctor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CostingClientProfile CostingClientProfile_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CostingClientProfile"
    ADD CONSTRAINT "CostingClientProfile_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public."Clinic"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CostingClientProfile CostingClientProfile_versionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CostingClientProfile"
    ADD CONSTRAINT "CostingClientProfile_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES public."CostingVersion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CostingColumn CostingColumn_versionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CostingColumn"
    ADD CONSTRAINT "CostingColumn_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES public."CostingVersion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CostingFixedCostItem CostingFixedCostItem_versionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CostingFixedCostItem"
    ADD CONSTRAINT "CostingFixedCostItem_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES public."CostingVersion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CostingLinePoolShare CostingLinePoolShare_lineId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CostingLinePoolShare"
    ADD CONSTRAINT "CostingLinePoolShare_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES public."CostingLine"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CostingLinePoolShare CostingLinePoolShare_poolId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CostingLinePoolShare"
    ADD CONSTRAINT "CostingLinePoolShare_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES public."CostingSharedPool"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CostingLine CostingLine_priceListItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CostingLine"
    ADD CONSTRAINT "CostingLine_priceListItemId_fkey" FOREIGN KEY ("priceListItemId") REFERENCES public."PriceListItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: CostingLine CostingLine_versionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CostingLine"
    ADD CONSTRAINT "CostingLine_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES public."CostingVersion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CostingSharedPool CostingSharedPool_versionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CostingSharedPool"
    ADD CONSTRAINT "CostingSharedPool_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES public."CostingVersion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Courier Courier_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Courier"
    ADD CONSTRAINT "Courier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DoctorClinicLinkSuppression DoctorClinicLinkSuppression_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DoctorClinicLinkSuppression"
    ADD CONSTRAINT "DoctorClinicLinkSuppression_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public."Clinic"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DoctorClinicLinkSuppression DoctorClinicLinkSuppression_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DoctorClinicLinkSuppression"
    ADD CONSTRAINT "DoctorClinicLinkSuppression_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."Doctor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DoctorOnClinic DoctorOnClinic_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DoctorOnClinic"
    ADD CONSTRAINT "DoctorOnClinic_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public."Clinic"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DoctorOnClinic DoctorOnClinic_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DoctorOnClinic"
    ADD CONSTRAINT "DoctorOnClinic_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."Doctor"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Doctor Doctor_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Doctor"
    ADD CONSTRAINT "Doctor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: InventoryItem InventoryItem_warehouseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."InventoryItem"
    ADD CONSTRAINT "InventoryItem_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES public."Warehouse"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: KaitenCardType KaitenCardType_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."KaitenCardType"
    ADD CONSTRAINT "KaitenCardType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderAttachment OrderAttachment_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderAttachment"
    ADD CONSTRAINT "OrderAttachment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderChatCorrection OrderChatCorrection_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderChatCorrection"
    ADD CONSTRAINT "OrderChatCorrection_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderChatCorrection OrderChatCorrection_rejectedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderChatCorrection"
    ADD CONSTRAINT "OrderChatCorrection_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrderChatCorrection OrderChatCorrection_resolvedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderChatCorrection"
    ADD CONSTRAINT "OrderChatCorrection_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrderConstruction OrderConstruction_constructionTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderConstruction"
    ADD CONSTRAINT "OrderConstruction_constructionTypeId_fkey" FOREIGN KEY ("constructionTypeId") REFERENCES public."ConstructionType"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrderConstruction OrderConstruction_materialId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderConstruction"
    ADD CONSTRAINT "OrderConstruction_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES public."Material"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrderConstruction OrderConstruction_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderConstruction"
    ADD CONSTRAINT "OrderConstruction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderConstruction OrderConstruction_priceListItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderConstruction"
    ADD CONSTRAINT "OrderConstruction_priceListItemId_fkey" FOREIGN KEY ("priceListItemId") REFERENCES public."PriceListItem"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrderCustomTag OrderCustomTag_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderCustomTag"
    ADD CONSTRAINT "OrderCustomTag_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderNumberSettings OrderNumberSettings_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderNumberSettings"
    ADD CONSTRAINT "OrderNumberSettings_id_fkey" FOREIGN KEY (id) REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderProstheticsRequest OrderProstheticsRequest_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderProstheticsRequest"
    ADD CONSTRAINT "OrderProstheticsRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: OrderProstheticsRequest OrderProstheticsRequest_rejectedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderProstheticsRequest"
    ADD CONSTRAINT "OrderProstheticsRequest_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrderProstheticsRequest OrderProstheticsRequest_resolvedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderProstheticsRequest"
    ADD CONSTRAINT "OrderProstheticsRequest_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrderRevision OrderRevision_actorUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderRevision"
    ADD CONSTRAINT "OrderRevision_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: OrderRevision OrderRevision_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."OrderRevision"
    ADD CONSTRAINT "OrderRevision_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Order Order_clinicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES public."Clinic"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_continuesFromOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_continuesFromOrderId_fkey" FOREIGN KEY ("continuesFromOrderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_courierDeliveryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_courierDeliveryId_fkey" FOREIGN KEY ("courierDeliveryId") REFERENCES public."Courier"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_courierId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES public."Courier"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_courierPickupId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_courierPickupId_fkey" FOREIGN KEY ("courierPickupId") REFERENCES public."Courier"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_doctorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES public."Doctor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Order Order_invoiceAttachmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_invoiceAttachmentId_fkey" FOREIGN KEY ("invoiceAttachmentId") REFERENCES public."OrderAttachment"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_kaitenCardTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_kaitenCardTypeId_fkey" FOREIGN KEY ("kaitenCardTypeId") REFERENCES public."KaitenCardType"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Order Order_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Order"
    ADD CONSTRAINT "Order_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PriceListItem PriceListItem_priceListId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PriceListItem"
    ADD CONSTRAINT "PriceListItem_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES public."PriceList"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PriceListWorkspaceSettings PriceListWorkspaceSettings_activePriceListId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PriceListWorkspaceSettings"
    ADD CONSTRAINT "PriceListWorkspaceSettings_activePriceListId_fkey" FOREIGN KEY ("activePriceListId") REFERENCES public."PriceList"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RoleModuleAccess RoleModuleAccess_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RoleModuleAccess"
    ADD CONSTRAINT "RoleModuleAccess_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StockBalance StockBalance_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockBalance"
    ADD CONSTRAINT "StockBalance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockBalance StockBalance_warehouseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockBalance"
    ADD CONSTRAINT "StockBalance_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES public."Warehouse"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockMovement StockMovement_itemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES public."InventoryItem"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StockMovement StockMovement_orderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES public."Order"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: StockMovement StockMovement_warehouseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StockMovement"
    ADD CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES public."Warehouse"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SubscriptionInvoice SubscriptionInvoice_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SubscriptionInvoice"
    ADD CONSTRAINT "SubscriptionInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TelegramLinkToken TelegramLinkToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."TelegramLinkToken"
    ADD CONSTRAINT "TelegramLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict 8uXM1ErHOAIhfgFk30CZhN9pCh8xQPhIffYBuNO4JfaoQlclT030FlDw6hlNnRz

