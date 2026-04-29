import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/get-prisma";
import { ensureKaitenDirectory } from "@/lib/kaiten-directory-bootstrap";
import {
  getKaitenEnvConfig,
  listConfiguredKaitenTrackLanes,
} from "@/lib/kaiten-config";
import { withResolvedKaitenBoards } from "@/lib/kaiten-resolve-boards";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { requireSessionTenantId } from "@/lib/auth/tenant-for-session";

/** Типы карточек + какие пространства (доски) реально настроены в .env. */
export async function GET() {
  try {
    const s = await getSessionFromCookies();
    if (!s) {
      return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
    }
    const tenantId = await requireSessionTenantId(s);
    const prisma = await getPrisma();
    await ensureKaitenDirectory(prisma, tenantId);
    const types = await prisma.kaitenCardType.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, externalTypeId: true },
    });
    const kcfg0 = getKaitenEnvConfig();
    const kcfg = kcfg0 ? await withResolvedKaitenBoards(kcfg0) : null;
    /** Достаточно board_id или space_id + колонка; board_id может быть null, пока не подставился из space (или API временно недоступен). */
    const trackLanes = kcfg
      ? listConfiguredKaitenTrackLanes(kcfg).filter((lane) => {
          const t = kcfg.boardByLane[lane];
          return t != null && (t.boardId != null || t.spaceId != null);
        })
      : [];
    return NextResponse.json({ cardTypes: types, trackLanes });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Не удалось загрузить настройки Кайтен" },
      { status: 500 },
    );
  }
}
