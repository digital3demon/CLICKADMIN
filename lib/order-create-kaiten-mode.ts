/**
 * Режим Kaiten при создании наряда.
 * Канбан CRM создаётся всегда (тип + пространство).
 * Карточка Kaiten — только если не decideLater / createKanbanWithoutKaiten.
 */
export function resolveOrderCreateKaitenMode(input: {
  isTestOrder?: boolean;
  kaitenDecideLater?: boolean;
  createKanbanWithoutKaiten?: boolean;
  /** Тенант выключил интеграцию или нет KAITEN_* — канбан CRM без карточки Kaiten. */
  kaitenIntegrationOff?: boolean;
  kaitenCardTypeId?: string | null;
  kaitenTrackLane?: string | null;
}): {
  kaitenDecideLater: boolean;
  createKanbanWithoutKaiten: boolean;
  needPlacementFields: boolean;
  scheduleKaitenSync: boolean;
  needKaitenEnvBoards: boolean;
} {
  const isTest = input.isTestOrder === true;
  const decideLater = isTest || Boolean(input.kaitenDecideLater);
  const withoutKaiten =
    isTest ||
    decideLater ||
    Boolean(input.createKanbanWithoutKaiten) ||
    Boolean(input.kaitenIntegrationOff);
  const hasPlacement =
    Boolean(String(input.kaitenCardTypeId ?? "").trim()) &&
    Boolean(String(input.kaitenTrackLane ?? "").trim());
  return {
    kaitenDecideLater: decideLater,
    createKanbanWithoutKaiten: withoutKaiten,
    needPlacementFields: !isTest,
    scheduleKaitenSync: !isTest && !withoutKaiten && hasPlacement,
    needKaitenEnvBoards: !isTest && !withoutKaiten,
  };
}
