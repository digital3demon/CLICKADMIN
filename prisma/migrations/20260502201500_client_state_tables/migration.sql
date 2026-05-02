CREATE TABLE "TenantClientState" (
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TenantClientState_pkey" PRIMARY KEY ("tenantId","key")
);

CREATE TABLE "UserClientState" (
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserClientState_pkey" PRIMARY KEY ("userId","key")
);

CREATE INDEX "TenantClientState_updatedAt_idx" ON "TenantClientState"("updatedAt");
CREATE INDEX "UserClientState_tenantId_key_idx" ON "UserClientState"("tenantId", "key");
CREATE INDEX "UserClientState_updatedAt_idx" ON "UserClientState"("updatedAt");

ALTER TABLE "TenantClientState"
ADD CONSTRAINT "TenantClientState_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserClientState"
ADD CONSTRAINT "UserClientState_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserClientState"
ADD CONSTRAINT "UserClientState_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
