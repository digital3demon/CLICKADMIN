CREATE TYPE "UserDeviceType" AS ENUM ('DESKTOP', 'MOBILE');

CREATE TABLE "UserDeviceSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceType" "UserDeviceType" NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "UserDeviceSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserDeviceSession_userId_deviceType_revokedAt_expiresAt_idx" ON "UserDeviceSession"("userId", "deviceType", "revokedAt", "expiresAt");
CREATE INDEX "UserDeviceSession_tenantId_revokedAt_expiresAt_idx" ON "UserDeviceSession"("tenantId", "revokedAt", "expiresAt");
CREATE INDEX "UserDeviceSession_expiresAt_idx" ON "UserDeviceSession"("expiresAt");

ALTER TABLE "UserDeviceSession" ADD CONSTRAINT "UserDeviceSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserDeviceSession" ADD CONSTRAINT "UserDeviceSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
