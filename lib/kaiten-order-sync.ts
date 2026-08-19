import { buildKaitenCardTitle } from "@/lib/kaiten-card-title";
import { kaitenColumnTitleFromBoard } from "@/lib/kaiten-column-title";
import { kaitenSortOrderFromCard } from "@/lib/kaiten-card-sort-order";
import { getKaitenEnvConfig } from "@/lib/kaiten-config";
import { withResolvedKaitenBoards } from "@/lib/kaiten-resolve-boards";
import {
  getKaitenRestAuth,
  kaitenCreateCard,
  kaitenListBoardColumns,
  kaitenListBoardLanes,
} from "@/lib/kaiten-rest";
import { getClientsPrisma, getOrdersPrisma } from "@/lib/get-domain-prisma";
import {
  activeContinuationChildrenWhere,
  buildKaitenContinuationBlockLines,
  mapContinuationChildrenRefs,
  type ContinuationOrderRef,
} from "@/lib/order-continuation-display";
import type { PrismaClient } from "@prisma/client";
import { kaitenLogger } from "@/lib/server/logger";
import { gateKaitenSyncForTenant } from "@/lib/kaiten-integration/sync";
import { getPrisma } from "@/lib/get-prisma";

async function resolveContinuationParentForOrder(
  prisma: PrismaClient,
  order: {
    continuesFromOrderId: string | null;
    continuesFromOrder: {
      orderNumber: string;
      kaitenCardId: number | null;
    } | null;
  },
): Promise<ContinuationOrderRef | null> {
  if (order.continuesFromOrder) {
    return {
      orderNumber: order.continuesFromOrder.orderNumber,
      kaitenCardId: order.continuesFromOrder.kaitenCardId,
    };
  }
  if (!order.continuesFromOrderId) return null;
  const parent = await prisma.order.findUnique({
    where: { id: order.continuesFromOrderId },
    select: { orderNumber: true, kaitenCardId: true },
  });
  if (!parent) return null;
  return {
    orderNumber: parent.orderNumber,
    kaitenCardId: parent.kaitenCardId,
  };
}

async function fetchFirstLaneId(
  auth: NonNullable<ReturnType<typeof getKaitenRestAuth>>,
  boardId: number,
): Promise<number | null> {
  const lanes = await kaitenListBoardLanes(auth, boardId, { burst: true });
  if (!lanes.ok || lanes.lanes.length === 0) return null;
  const id = lanes.lanes[0]?.id;
  return typeof id === "number" ? id : null;
}

/** Описание карточки Kaiten: продолжение работы, заказ от клиента и комментарий от админов. */
export function buildKaitenCardDescription(
  clientOrderText: string | null,
  notes: string | null,
  continuationParent?: ContinuationOrderRef | null,
  continuationChildren?: ContinuationOrderRef[] | null,
): string {
  const parts: string[] = buildKaitenContinuationBlockLines(
    continuationParent,
    continuationChildren,
  );
  const client = clientOrderText?.trim() ?? "";
  const comm = notes?.trim() ?? "";
  if (client) {
    parts.push(`Заказ от клиента:\n${client}`);
  }
  if (comm) {
    parts.push(`Комментарий от админов:\n${comm}`);
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
    const [ordersPrisma, clientsPrisma] = await Promise.all([
      getOrdersPrisma(),
      getClientsPrisma(),
    ]);
    const cfg0 = getKaitenEnvConfig();
    if (!cfg0) {
      return {
        ok: false,
        error: "Kaiten не настроен (KAITEN_API_TOKEN и доски)",
        httpStatus: 503,
      };
    }
    const cfg = await withResolvedKaitenBoards(cfg0);

    const order = await ordersPrisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        tenantId: true,
        orderNumber: true,
        doctorId: true,
        patientName: true,
        dueDate: true,
        kaitenAdminDueHasTime: true,
        kaitenCardTitleLabel: true,
        isUrgent: true,
        urgentCoefficient: true,
        clientOrderText: true,
        notes: true,
        kaitenCardId: true,
        kaitenDecideLater: true,
        kaitenCardTypeId: true,
        kaitenTrackLane: true,
        continuesFromOrderId: true,
        continuesFromOrder: {
          select: {
            orderNumber: true,
            kaitenCardId: true,
          },
        },
        continuationOrders: {
          where: activeContinuationChildrenWhere,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            orderNumber: true,
            kaitenCardId: true,
          },
        },
      },
    });

    if (!order) {
      return { ok: false, error: "Наряд не найден", httpStatus: 400 };
    }
    const corePrisma = await getPrisma();
    const integrationGate = await gateKaitenSyncForTenant(
      corePrisma,
      order.tenantId ?? "",
    );
    if (integrationGate.skip) {
      return {
        ok: false,
        error: "Интеграция с Kaiten выключена",
        httpStatus: 503,
      };
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
    const [doctor, kaitenCardType] = await Promise.all([
      clientsPrisma.doctor.findUnique({
        where: { id: order.doctorId },
        select: { fullName: true },
      }),
      clientsPrisma.kaitenCardType.findUnique({
        where: { id: order.kaitenCardTypeId! },
        select: { name: true, externalTypeId: true },
      }),
    ]);
    if (!kaitenCardType) {
      kaitenLogger.error({ orderId, msg: "kaiten_card_type_missing" }, "kaiten card type missing");
      return {
        ok: false,
        error: "Тип карточки Kaiten не найден в справочнике",
        httpStatus: 400,
      };
    }

    const typeId = kaitenCardType.externalTypeId;
    const boardTarget = cfg.boardByLane[order.kaitenTrackLane];
    if (typeId == null || boardTarget == null || boardTarget.boardId == null) {
      kaitenLogger.error(
        {
          msg: "kaiten_lane_config_missing",
          typeId,
          lane: order.kaitenTrackLane,
          boardId: boardTarget?.boardId,
          spaceId: boardTarget?.spaceId,
          configuredLanes: Object.keys(cfg.boardByLane),
        },
        "kaiten missing typeId or boardTarget for lane",
      );
      return {
        ok: false,
        error:
          "Для выбранного пространства не настроена доска Kaiten или у типа карточки нет externalTypeId",
        httpStatus: 400,
      };
    }

    const auth = getKaitenRestAuth();
    if (!auth) {
      return {
        ok: false,
        error: "Kaiten не настроен (KAITEN_API_TOKEN)",
        httpStatus: 503,
      };
    }

    let laneId = boardTarget.laneId;
    if (laneId == null) {
      laneId = await fetchFirstLaneId(auth, boardTarget.boardId!);
    }

    const continuationParent = await resolveContinuationParentForOrder(
      ordersPrisma,
      order,
    );
    const description = buildKaitenCardDescription(
      order.clientOrderText,
      order.notes,
      continuationParent,
      mapContinuationChildrenRefs(order.continuationOrders),
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
        doctor: doctor ?? { fullName: "—" },
        dueDate: order.dueDate,
        kaitenLabDueHasTime: order.kaitenAdminDueHasTime !== false,
        kaitenCardTitleLabel: order.kaitenCardTitleLabel,
        kaitenCardType: kaitenCardType,
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

    // Лаб-срок и дата записи в due_date Kaiten не передаём — там только срок карточки канбана.
    // Лаб-срок (Order.dueDate) только в title. Флаг «срочно» — asap.

    const created = await kaitenCreateCard(auth, body, { burst: true });
    if (!created.ok) {
      const rawText = created.error ?? "";
      const errMsg = `Kaiten ${created.status}: ${rawText}`;
      try {
        await ordersPrisma.order.update({
          where: { id: orderId },
          data: {
            kaitenCardId: null,
            kaitenSyncError: errMsg,
            kaitenSyncedAt: null,
          },
        });
      } catch (dbErr) {
        kaitenLogger.error({ err: dbErr, orderId }, "could not save kaiten sync error to order");
      }
      return {
        ok: false,
        error: "Не удалось создать карточку в Kaiten. Подробности в поле ошибки синхронизации наряда.",
        httpStatus: 502,
      };
    }

    const cardRecord = created.card;
    const cardId =
      cardRecord != null ? parseKaitenCardIdFromCreateResponse(cardRecord) : null;

    let titleUpdate: { kaitenColumnTitle: string | null } | undefined;
    let sortUpdate: { kaitenCardSortOrder: number | null } | undefined;
    if (cardRecord != null && cardId != null) {
      const cols = await kaitenListBoardColumns(auth, boardTarget.boardId!, {
        burst: true,
      });
      if (cols.ok) {
        titleUpdate = {
          kaitenColumnTitle: kaitenColumnTitleFromBoard(
            cardRecord,
            cols.columns,
          ),
        };
      }
      const so = kaitenSortOrderFromCard(cardRecord);
      if (so != null) sortUpdate = { kaitenCardSortOrder: so };
    }

    try {
      await ordersPrisma.order.update({
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
      kaitenLogger.error({ err: dbErr, orderId }, "could not save kaiten card id to order");
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
    kaitenLogger.error({ err: e, orderId }, "syncNewOrderToKaiten failed");
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Ошибка синхронизации с Kaiten",
      httpStatus: 502,
    };
  }
}
