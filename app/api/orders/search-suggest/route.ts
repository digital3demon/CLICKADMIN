import { NextResponse } from "next/server";
import { getClientsPrisma, getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";

type SuggestItem = { value: string; kind: "order" | "patient" | "doctor" | "clinic" };

function norm(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function pushUnique(
  out: SuggestItem[],
  seen: Set<string>,
  value: string | null | undefined,
  kind: SuggestItem["kind"],
) {
  const v = norm(String(value ?? ""));
  if (!v) return;
  const key = v.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  out.push({ value: v, kind });
}

export async function GET(req: Request) {
  try {
    const s = await getSessionFromCookies();
    if (!s) return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    const tenantId = await requireSessionTenantId(s);
    const q = norm(new URL(req.url).searchParams.get("q") ?? "");
    if (!q) return NextResponse.json({ items: [] });

    const [ordersPrisma, clientsPrisma] = await Promise.all([
      getOrdersPrisma(),
      getClientsPrisma(),
    ]);

    const [orderRows, patientRows, doctorRows, clinicRows] = await Promise.all([
      ordersPrisma.order.findMany({
        where: { tenantId, archivedAt: null, orderNumber: { contains: q, mode: "insensitive" } },
        select: { orderNumber: true },
        orderBy: [{ createdAt: "desc" }],
        take: 8,
      }),
      ordersPrisma.order.findMany({
        where: { tenantId, archivedAt: null, patientName: { contains: q, mode: "insensitive" } },
        select: { patientName: true },
        orderBy: [{ createdAt: "desc" }],
        take: 8,
      }),
      clientsPrisma.doctor.findMany({
        where: { tenantId, fullName: { contains: q, mode: "insensitive" } },
        select: { fullName: true },
        orderBy: [{ fullName: "asc" }],
        take: 8,
      }),
      clientsPrisma.clinic.findMany({
        where: { tenantId, name: { contains: q, mode: "insensitive" } },
        select: { name: true },
        orderBy: [{ name: "asc" }],
        take: 8,
      }),
    ]);

    const items: SuggestItem[] = [];
    const seen = new Set<string>();
    for (const row of orderRows) pushUnique(items, seen, row.orderNumber, "order");
    for (const row of patientRows) pushUnique(items, seen, row.patientName, "patient");
    for (const row of doctorRows) pushUnique(items, seen, row.fullName, "doctor");
    for (const row of clinicRows) pushUnique(items, seen, row.name, "clinic");

    return NextResponse.json({ items: items.slice(0, 20) });
  } catch (e) {
    console.error("[orders/search-suggest]", e);
    return NextResponse.json({ error: "Не удалось получить подсказки" }, { status: 500 });
  }
}

