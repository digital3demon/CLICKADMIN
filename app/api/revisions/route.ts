import { NextResponse } from "next/server";
import {
  normalizeRevisionsHistorySearchQuery,
} from "@/lib/revisions-history";
import { loadRevisionsHistoryMerged } from "@/lib/revisions-history.server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("limit");
    const n = raw ? parseInt(raw, 10) : 80;
    const limit = Number.isFinite(n) ? Math.min(150, Math.max(1, n)) : 80;
    const q = normalizeRevisionsHistorySearchQuery(searchParams.get("q"));

    const merged = await loadRevisionsHistoryMerged({ q: q || undefined, limit });

    const items = merged.map((item) =>
      item.t === "order"
        ? {
            source: "order" as const,
            id: item.row.id,
            createdAt: item.row.createdAt.toISOString(),
            actorLabel: item.row.actorLabel,
            summary: item.row.summary,
            kind: item.row.kind,
            order: item.row.order,
          }
        : {
            source: "contractor" as const,
            id: item.row.id,
            createdAt: item.row.createdAt.toISOString(),
            actorLabel: item.row.actorLabel,
            summary: item.row.summary,
            kind: item.row.kind,
            clinic: item.row.clinic,
            doctor: item.row.doctor,
          },
    );

    return NextResponse.json({ items });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось загрузить журнал" },
      { status: 500 },
    );
  }
}
