import { NextResponse } from "next/server";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { getPrisma } from "@/lib/get-prisma";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("limit");
    const n = raw ? parseInt(raw, 10) : 80;
    const limit = Number.isFinite(n) ? Math.min(150, Math.max(1, n)) : 80;
    const half = Math.min(100, Math.ceil(limit * 0.6));

    const ordersPrisma = await getOrdersPrisma();
    const clientsPrisma = await getPrisma();
    const [orderRows, contractorRows] = await Promise.all([
      ordersPrisma.orderRevision.findMany({
        orderBy: { createdAt: "desc" },
        take: half,
        select: {
          id: true,
          createdAt: true,
          actorLabel: true,
          summary: true,
          kind: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
            },
          },
        },
      }),
      clientsPrisma.contractorRevision.findMany({
        orderBy: { createdAt: "desc" },
        take: half,
        select: {
          id: true,
          createdAt: true,
          actorLabel: true,
          summary: true,
          kind: true,
          clinic: { select: { id: true, name: true } },
          doctor: { select: { id: true, fullName: true } },
        },
      }),
    ]);

    type Entry =
      | {
          source: "order";
          id: string;
          createdAt: string;
          actorLabel: string;
          summary: string;
          kind: string;
          order: { id: string; orderNumber: string };
        }
      | {
          source: "contractor";
          id: string;
          createdAt: string;
          actorLabel: string;
          summary: string;
          kind: string;
          clinic: { id: string; name: string } | null;
          doctor: { id: string; fullName: string } | null;
        };

    const items: Entry[] = [
      ...orderRows.map((r) => ({
        source: "order" as const,
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        actorLabel: r.actorLabel,
        summary: r.summary,
        kind: r.kind,
        order: r.order,
      })),
      ...contractorRows.map((r) => ({
        source: "contractor" as const,
        id: r.id,
        createdAt: r.createdAt.toISOString(),
        actorLabel: r.actorLabel,
        summary: r.summary,
        kind: r.kind,
        clinic: r.clinic,
        doctor: r.doctor,
      })),
    ];

    items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return NextResponse.json({
      items: items.slice(0, limit),
      revisions: orderRows,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось загрузить журнал" },
      { status: 500 },
    );
  }
}
