import { NextResponse } from "next/server";
import { getClientsPrisma, getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";

function norm(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

const DEFAULT_TYPES = ["orders", "clinics", "doctors"] as const;

export async function GET(req: Request) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }

    const tenantId = await requireSessionTenantId(session);
    const url = new URL(req.url);
    const q = norm(url.searchParams.get("q") ?? "");

    if (q.length < 2) {
      return NextResponse.json({ orders: [], clinics: [], doctors: [] });
    }

    const typesRaw = url.searchParams.get("types")?.trim();
    const types = new Set(
      (typesRaw ? typesRaw.split(",") : [...DEFAULT_TYPES])
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    );

    const [ordersPrisma, clientsPrisma] = await Promise.all([
      getOrdersPrisma(),
      getClientsPrisma(),
    ]);

    const [orderRows, clinicRows, doctorRows] = await Promise.all([
      types.has("orders")
        ? ordersPrisma.order.findMany({
            where: {
              tenantId,
              archivedAt: null,
              OR: [
                { orderNumber: { contains: q, mode: "insensitive" } },
                { patientName: { contains: q, mode: "insensitive" } },
                { doctor: { fullName: { contains: q, mode: "insensitive" } } },
                { clinic: { name: { contains: q, mode: "insensitive" } } },
              ],
            },
            select: {
              id: true,
              orderNumber: true,
              patientName: true,
              doctor: { select: { fullName: true } },
              clinic: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),
      types.has("clinics")
        ? clientsPrisma.clinic.findMany({
            where: {
              tenantId,
              deletedAt: null,
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { address: { contains: q, mode: "insensitive" } },
              ],
            },
            select: {
              id: true,
              name: true,
              address: true,
            },
            orderBy: { name: "asc" },
            take: 5,
          })
        : Promise.resolve([]),
      types.has("doctors")
        ? clientsPrisma.doctor.findMany({
            where: {
              tenantId,
              deletedAt: null,
              fullName: { contains: q, mode: "insensitive" },
            },
            select: {
              id: true,
              fullName: true,
              clinicLinks: {
                take: 1,
                select: { clinic: { select: { name: true } } },
              },
            },
            orderBy: { fullName: "asc" },
            take: 5,
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json({
      orders: orderRows.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        clinicName: o.clinic?.name?.trim() || "Частное лицо",
        doctorName: o.doctor.fullName,
        patientName: o.patientName?.trim() || "",
      })),
      clinics: clinicRows.map((c) => ({
        id: c.id,
        name: c.name,
        address: c.address?.trim() || "",
      })),
      doctors: doctorRows.map((d) => ({
        id: d.id,
        name: d.fullName,
        clinicName: d.clinicLinks[0]?.clinic.name?.trim() || "",
      })),
    });
  } catch (e) {
    console.error("[api/search]", e);
    return NextResponse.json({ error: "Не удалось выполнить поиск" }, { status: 500 });
  }
}
