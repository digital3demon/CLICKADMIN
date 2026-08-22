import "server-only";
import { prisma } from "@/lib/prisma";
import type { UserDeviceType } from "@prisma/client";
import {
  invalidateSessionLookupCacheBySid,
  invalidateSessionLookupCacheByUserId,
} from "@/lib/auth/session-lookup-cache";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const MOBILE_RE =
  /\b(android|iphone|ipad|ipod|mobile|windows phone|blackberry|opera mini|iemobile)\b/i;

export class DeviceLimitReachedError extends Error {
  readonly deviceType: UserDeviceType;

  constructor(deviceType: UserDeviceType) {
    super("DEVICE_LIMIT_REACHED");
    this.deviceType = deviceType;
  }
}

function cleanText(v: string | null, max = 512): string | null {
  const t = (v ?? "").trim();
  if (!t) return null;
  return t.slice(0, max);
}

function clientIpFromHeaders(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  const fromXff = xff?.split(",")[0]?.trim() ?? "";
  return (
    cleanText(fromXff, 64) ??
    cleanText(headers.get("x-real-ip"), 64) ??
    cleanText(headers.get("cf-connecting-ip"), 64) ??
    null
  );
}

export function detectUserDeviceType(userAgent: string | null | undefined): UserDeviceType {
  const ua = String(userAgent ?? "");
  return MOBILE_RE.test(ua) ? "MOBILE" : "DESKTOP";
}

export async function issueUserDeviceSessionOrThrow(input: {
  userId: string;
  tenantId: string;
  headers: Headers;
}): Promise<{ sid: string; deviceType: UserDeviceType }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const userAgent = cleanText(input.headers.get("user-agent"), 1000);
  const ipAddress = clientIpFromHeaders(input.headers);
  const deviceType = detectUserDeviceType(userAgent);
  const sid = crypto.randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.userDeviceSession.deleteMany({
      where: {
        userId: input.userId,
        OR: [{ revokedAt: { not: null } }, { expiresAt: { lte: now } }],
      },
    });

    const activeSameType = await tx.userDeviceSession.count({
      where: {
        userId: input.userId,
        deviceType,
        revokedAt: null,
        expiresAt: { gt: now },
      },
    });
    if (activeSameType > 0) {
      // UX: если сессия "залипла" (например, неуспешный logout на старом устройстве),
      // не блокируем вход, а заменяем предыдущую активную сессию этого типа новой.
      await tx.userDeviceSession.updateMany({
        where: {
          userId: input.userId,
          deviceType,
          revokedAt: null,
          expiresAt: { gt: now },
        },
        data: { revokedAt: now },
      });
      invalidateSessionLookupCacheByUserId(input.userId);
    }

    await tx.userDeviceSession.create({
      data: {
        id: sid,
        userId: input.userId,
        tenantId: input.tenantId,
        deviceType,
        userAgent,
        ipAddress,
        expiresAt,
        lastSeenAt: now,
      },
    });
  });

  return { sid, deviceType };
}

export async function revokeUserDeviceSessionBySid(
  sid: string,
  userId?: string | null,
): Promise<void> {
  const now = new Date();
  await prisma.userDeviceSession.updateMany({
    where: {
      id: sid,
      ...(userId ? { userId } : {}),
      revokedAt: null,
    },
    data: { revokedAt: now },
  });
  invalidateSessionLookupCacheBySid(sid);
}
