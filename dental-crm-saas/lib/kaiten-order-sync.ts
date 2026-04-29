import { buildKaitenCardTitle } from "@/lib/kaiten-card-title";
import { kaitenColumnTitleFromBoard } from "@/lib/kaiten-column-title";
import { kaitenSortOrderFromCard } from "@/lib/kaiten-card-sort-order";
import { getKaitenEnvConfig } from "@/lib/kaiten-config";
import { withResolvedKaitenBoards } from "@/lib/kaiten-resolve-boards";
import { kaitenListBoardColumns, getKaitenRestAuth } from "@/lib/kaiten-rest";
import { getPrisma } from "@/lib/get-prisma";
async function fetchFirstLaneId(
  apiBase: string,
  token: string,
  boardId: number,
): Promise<number | null> {
  const res = await fetch(`${apiBase}/boards/${boardId}/lanes`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const lanes = (await res.json()) as { id?: number }[];
  const id = lanes[0]?.id;
  return typeof id === "number" ? id : null;
}

/** Описание карточки Kaiten: заказ от клиента и комментарий наряда (раздельные блоки). */
export function buildKaitenCardDescription(
  clientOrderText: string | null,
  notes: string | null,
): string {
  const client = clientOrderText?.trim() ?? "";
  const comm = notes?.trim() ?? "";
  const parts: string[] = [];
  if (client) {
    parts.push(`Заказ от клиента:\n${client}`);
  }
  if (comm) {
    parts.push(`Комментарий:\n${comm}`);
  }
  return parts.join("\n\n");
}

/** Kaiten иногда отдаёт `id` числом, иногда строкой — без этого CRM не сохраняет привязку. */
function parseKaitenCardIdFromCreateResponse(
  data: Record<string, unknown>,
): number | null {
  const raw = data.id;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    const n = Number(raw.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export type SyncNewOrderToKaitenResult =
  | { ok: true; kaitenCardId: number }
  | { ok: false; error: string; httpStatus: 400 | 502 | 503 };

export type SyncNewOrderToKaitenOptions = {
  /**
   * ID колонки на доске Kaiten. Если не задан — берётся columnToExecutionId из .env
   * для выбранной дорожки (как при создании из мастера наряда).
   */
  columnId?: number;
};

/**
 * Создаёт карточку в Kaiten для сохранённого заказа (если конфиг и поля Кайтен заданы).
 * Обновляет kaitenCardId / kaitenSyncedAt или kaitenSyncError.
 */
export async function syncNewOrderToKaiten(
  orderId: string,
  options?: SyncNewOrderToKaitenOptions,
): Promise<SyncNewOrderToKaitenResult> {
  try {
    const prisma = await getPrisma();
    const cfg0 = getKaitenEnvConfig();
    if (!cfg0) {
      return {
        ok: false,
        error: "Kaiten не настроен (KAITEN_API_TOKEN и доски)",
        httpStatus: 503,
      };
    }
    const cfg = await withResolvedKaitenBoards(cfg0);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        doctor: { select: { fullName: true } },
        kaitenCardType: { select: { name: true, externalTypeId: true } },
      },
    });

    if (!order) {
      return { ok: false, error: "Наряд не найден", httpStatus: 400 };
    }
    if (order.kaitenCardId != null) {
      return { ok: true, kaitenCardId: order.kaitenCardId };
    }
    if (order.kaitenDecideLater) {
      return {
        ok: false,
        error:
          "Для наряда отмечено «настроить Kaiten позже» — укажите тип карточки и пространство в форме наряда",
        httpStatus: 400,
      };
    }
    if (!order.kaitenCardTypeId || !order.kaitenTrackLane) {
      return {
        ok: false,
        error: "Укажите в наряде тип карточки Kaiten и пространство (дорожку)",
        httpStatus: 400,
      };
    }
    if (!order.kaitenCardType) {
      console.error("[kaiten] kaitenCardType missing for order", orderId);
      return {
        ok: false,
        error: "Тип карточки Kaiten не найден в справочнике",
        httpStatus: 400,
      };
    }

    const typeId = order.kaitenCardType.externalTypeId;
    const boardTarget = cfg.boardByLane[order.kaitenTrackLane];
    if (typeId == null || boardTarget == null || boardTarget.boardId == null) {
      console.error("[kaiten] missing typeId or boardTarget for lane", {
        typeId,
        lane: order.kaitenTrackLane,
        boardId: boardTarget?.boardId,
        spaceId: boardTarget?.spaceId,
        configuredLanes: Object.keys(cfg.boardByLane),
      });
      return {
        ok: false,
        error:
          "Для выбранного пространства не настроена доска Kaiten или у типа карточки нет externalTypeId",
        httpStatus: 400,
      };
    }

    let laneId = boardTarget.laneId;
    if (laneId == null) {
      laneId = await fetchFirstLaneId(
        cfg.apiBase,
        cfg.token,
        boardTarget.boardId!,
      );
    }

    const description = buildKaitenCardDescription(
      order.clientOrderText,
      order.notes,
    );

    const colOverride = options?.columnId;
    const useColumnId =
      colOverride != null &&
      Number.isFinite(colOverride) &&
      colOverride > 0
        ? Math.floor(colOverride)
        : boardTarget.columnToExecutionId;

    const body: Record<string, unknown> = {
      title: buildKaitenCardTitle({
        orderNumber: order.orderNumber,
        patientName: order.patientName,
        doctor: order.doctor,
        dueDate: order.dueDate,
        kaitenLabDueHasTime: order.kaitenAdminDueHasTime !== false,
        kaitenCardTitleLabel: order.kaitenCardTitleLabel,
        kaitenCardType: order.kaitenCardType,
        isUrgent: order.isUrgent,
        urgentCoefficient: order.urgentCoefficient,
      }),
      ...(description ? { description } : {}),
      board_id: boardTarget.boardId!,
      column_id: useColumnId,
      type_id: typeId,
      position: 1,
      ...(order.isUrgent ? { asap: true } : {}),
    };

    if (laneId != null) {
      body.lane_id = laneId;
    }

    // Срок лабораторный (dueDate) только в title — в поле due_date карточки Kaiten не передаём.
    // Флаг «срочно» в Kaiten — поле asap (см. developers.kaiten.ru).

    const res = await fetch(`${cfg.apiBase}/cards`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const rawText = await res.text();
    if (!res.ok) {
      const tail = rawText.length > 600 ? "…" : "";
      const errMsg = `Kaiten ${res.status}: ${rawText.slice(0, 600)}${tail}`;
      try {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            kaitenCardId: null,
            kaitenSyncError: errMsg,
            kaitenSyncedAt: null,
          },
        });
      } catch (dbErr) {
        console.error("[kaiten] could not save sync error to order", dbErr);
      }
      return {
        ok: false,
        error: "Не удалось создать карточку в Kaiten. Подробности в поле ошибки синхронизации наряда.",
        httpStatus: 502,
      };
    }

    let cardId: number | null = null;
    let cardRecord: Record<string, unknown> | null = null;
    try {
      const data = JSON.parse(rawText) as Record<string, unknown>;
      if (data != null && typeof data === "object") {
        cardRecord = data;
        cardId = parseKaitenCardIdFromCreateResponse(data);
      }
    } catch {
      cardId = null;
    }

    let titleUpdate: { kaitenColumnTitle: string | null } | undefined;
    let sortUpdate: { kaitenCardSortOrder: number | null } | undefined;
    if (cardRecord != null && cardId != null) {
      const auth = getKaitenRestAuth();
      if (auth) {
        const cols = await kaitenListBoardColumns(auth, boardTarget.boardId!);
        if (cols.ok) {
          titleUpdate = {
            kaitenColumnTitle: kaitenColumnTitleFromBoard(
              cardRecord,
              cols.columns,
            ),
          };
        }
      }
      const so = kaitenSortOrderFromCard(cardRecord);
      if (so != null) sortUpdate = { kaitenCardSortOrder: so };
    }

    try {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          kaitenCardId: cardId,
          kaitenSyncError:
            cardId == null ? "Kaiten: в ответе нет id карточки" : null,
          kaitenSyncedAt: new Date(),
          ...(titleUpdate ?? {}),
          ...(sortUpdate ?? {}),
        },
      });
    } catch (dbErr) {
      console.error("[kaiten] could not save card id to order", dbErr);
      return {
        ok: false,
        error: "Не удалось сохранить id карточки в базе",
        httpStatus: 502,
      };
    }

    if (cardId == null) {
      return {
        ok: false,
        error:
          "Kaiten создал карточку, но в ответе нет распознаваемого id — привяжите вручную по числовому id из URL Kaiten",
        httpStatus: 502,
      };
    }
    return { ok: true, kaitenCardId: cardId };
  } catch (e) {
    console.error("[kaiten] syncNewOrderToKaiten", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Ошибка синхронизации с Kaiten",
      httpStatus: 502,
    };
  }
}
