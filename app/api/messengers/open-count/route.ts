import { DoctorMessengerItemStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";
import { getPrisma } from "@/lib/get-prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session?.sub || session.demo) {
    return NextResponse.json({ count: 0, unauthorized: true });
  }

  let tenantId: string;
  try {
    tenantId = await requireSessionTenantId(session);
  } catch {
    return NextResponse.json({ count: 0 });
  }

  const prisma = await getPrisma();
  const count = await prisma.doctorMessengerItem.count({
    where: { tenantId, status: DoctorMessengerItemStatus.OPEN },
  });

  return NextResponse.json({ count });
}
