import type { Prisma, UserRole } from "@prisma/client";

export function orderTestVisibilityWhere(input: {
  viewerRole?: UserRole | null;
  viewerUserId?: string | null;
}): Prisma.OrderWhereInput {
  const role = input.viewerRole ?? null;
  const userId = input.viewerUserId?.trim() || null;
  if (role === "OWNER" && userId) {
    return {
      OR: [
        { isTestOrder: false },
        { isTestOrder: true, testOrderOwnerUserId: userId },
      ],
    };
  }
  return { isTestOrder: false };
}
