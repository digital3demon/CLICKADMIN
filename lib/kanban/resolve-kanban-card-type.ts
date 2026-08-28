/**
 * Тип плитки → id на доске. Order хранит cuid из справочника,
 * зеркало часто ещё kt_* — склеиваем по имени / алиасу / legacy id.
 */
import {
  findKanbanCardTypeIdByName,
  legacyKaitenTypeName,
} from "@/lib/kanban/kaiten-card-type-names";

export function resolveKanbanBoardCardTypeId(
  board: { cardTypes?: Array<{ id: string; name: string }> },
  input: {
    cardTypeId?: string | null;
    cardTypeName?: string | null;
    cardTypeTitleLabel?: string | null;
  },
): string {
  const types = board.cardTypes || [];
  const fromName = findKanbanCardTypeIdByName(types, input.cardTypeName);
  if (fromName) return fromName;
  const fromLabel = findKanbanCardTypeIdByName(types, input.cardTypeTitleLabel);
  if (fromLabel) return fromLabel;
  const fromLegacy = findKanbanCardTypeIdByName(
    types,
    legacyKaitenTypeName(input.cardTypeId),
  );
  if (fromLegacy) return fromLegacy;
  const id = String(input.cardTypeId || "").trim();
  if (id && types.some((t) => t.id === id)) return id;
  return "";
}

type BoardWithCardTypes = {
  cardTypes?: Array<{
    id: string;
    name: string;
    sortOrder?: number;
    color?: string;
    defaultTrackLane?: string;
  }>;
};

/** Если в справочнике заказа есть имя, а на доске типа нет — добавляем, чтобы бейдж не ждал открытия наряда. */
export function ensureKanbanBoardCardType(
  board: BoardWithCardTypes,
  input: {
    cardTypeId?: string | null;
    cardTypeName?: string | null;
    cardTypeTitleLabel?: string | null;
  },
): string {
  const existing = resolveKanbanBoardCardTypeId(board, input);
  if (existing) return existing;
  /* Заголовок («Моделировка + Ключ») не создаёт тип — только имя из справочника. */
  const name = String(input.cardTypeName || "").trim();
  if (!name) return "";
  const id =
    String(input.cardTypeId || "").trim() ||
    `kt_crm_${name.toLocaleLowerCase("ru-RU").replace(/\s+/g, "_").slice(0, 40)}`;
  const types = board.cardTypes || [];
  const maxSort = types.reduce((m, t) => Math.max(m, t.sortOrder || 0), 0);
  types.push({
    id,
    name,
    sortOrder: maxSort + 10,
    color: "#5b8cff",
  });
  board.cardTypes = types;
  return id;
}
