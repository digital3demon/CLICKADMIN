/**
 * Пространство типа карточки: явное defaultTrackLane важнее эвристики по имени.
 * Имена нормализуем без JS `\b` — кириллица («ОртоАппараты х Хирургия»).
 */

export const CARD_TYPE_TRACK_LANES = [
  "ORTHOPEDICS",
  "ORTHODONTICS",
  "TEST",
] as const;

export type CardTypeTrackLane = (typeof CARD_TYPE_TRACK_LANES)[number];

export function normalizeCardTypeNameKey(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ")
    .replace(/x/g, "х");
}

export function isCardTypeTrackLane(v: string): v is CardTypeTrackLane {
  return (CARD_TYPE_TRACK_LANES as readonly string[]).includes(v);
}

/** Если в конфиге не задано — орто-типы на ортодонтию, остальные известные на ортопедию. */
export function defaultTrackLaneForCardTypeName(
  name: string | null | undefined,
): CardTypeTrackLane | undefined {
  const n = normalizeCardTypeNameKey(name);
  if (!n) return undefined;
  if (
    n.includes("ортоаппарат") ||
    n.includes("ортодонт") ||
    n.includes("миосплинт")
  ) {
    return "ORTHODONTICS";
  }
  if (
    n.includes("моделировка") ||
    n.includes("временн") ||
    n.includes("постоянн") ||
    n.includes("сплинт") ||
    n.includes("хирург") ||
    n.includes("накладк") ||
    n.includes("модел")
  ) {
    return "ORTHOPEDICS";
  }
  return undefined;
}

export function resolveStoredTrackLane(
  raw: string | null | undefined,
): CardTypeTrackLane | undefined {
  const v = String(raw ?? "").trim();
  return isCardTypeTrackLane(v) ? v : undefined;
}

type TypeLaneSource = {
  id?: string | null;
  name?: string | null;
  defaultTrackLane?: string | null;
};

/** Снимок пространств: сначала по id, затем по имени (id меняются при синке Kaiten). */
export function collectCardTypeDefaultLanes(
  types: TypeLaneSource[],
): { byId: Map<string, CardTypeTrackLane>; byName: Map<string, CardTypeTrackLane> } {
  const byId = new Map<string, CardTypeTrackLane>();
  const byName = new Map<string, CardTypeTrackLane>();
  for (const t of types) {
    const lane = resolveStoredTrackLane(t.defaultTrackLane);
    if (!lane) continue;
    const id = String(t.id ?? "").trim();
    const nameKey = normalizeCardTypeNameKey(t.name);
    if (id) byId.set(id, lane);
    if (nameKey) byName.set(nameKey, lane);
  }
  return { byId, byName };
}

export function pickPreservedCardTypeLane(
  type: TypeLaneSource,
  preserved: {
    byId: Map<string, CardTypeTrackLane>;
    byName: Map<string, CardTypeTrackLane>;
  },
): CardTypeTrackLane | undefined {
  const id = String(type.id ?? "").trim();
  const nameKey = normalizeCardTypeNameKey(type.name);
  if (id && preserved.byId.has(id)) return preserved.byId.get(id);
  if (nameKey && preserved.byName.has(nameKey)) return preserved.byName.get(nameKey);
  return defaultTrackLaneForCardTypeName(type.name);
}

/** Remote-типы как база: явное пространство remote, иначе local, иначе эвристика по имени. */
export function mergeCardTypeDefsKeepingLanes<T extends TypeLaneSource>(
  remoteTypes: T[],
  localTypes: T[],
): T[] {
  const localPreserved = collectCardTypeDefaultLanes(localTypes);
  return remoteTypes.map((t) => {
    const remoteLane = resolveStoredTrackLane(t.defaultTrackLane);
    return {
      ...t,
      defaultTrackLane: remoteLane ?? pickPreservedCardTypeLane(t, localPreserved),
    };
  });
}
