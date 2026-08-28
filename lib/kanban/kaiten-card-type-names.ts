/**
 * Имена типов карточки: cuid наряда ↔ kt_* на доске.
 * Нормализация без `\b` — кириллица («ОртоАппараты х Хирургия»).
 */
import { normalizeCardTypeNameKey } from "@/lib/kanban/card-type-default-lane";

export const LEGACY_KAITEN_TYPE_NAME_BY_ID: Record<string, string> = {
  kt_vrem: "Временные",
  kt_mio: "МиоСплинт",
  kt_mod: "Модели",
  kt_nak: "Накладки",
  kt_nakmrt: "Накладки МРТ",
  kt_orto: "ОртоАппараты",
  kt_ortox: "ОртоАппараты x Хирургия",
  kt_post: "Постоянные",
  kt_spl: "Сплинт",
  kt_splmrt: "Сплинт МРТ",
  kt_hir: "Хирургия",
};

/** Только формы слова, не разные типы справочника («Модели» ≠ «Моделировка»). */
const TYPE_NAME_ALIASES: Record<string, string> = {
  временная: "временные",
  ортоаппарат: "ортоаппараты",
};

export function legacyKaitenTypeName(id: string | null | undefined): string | null {
  const key = String(id || "").trim();
  if (!key) return null;
  const hit = LEGACY_KAITEN_TYPE_NAME_BY_ID[key];
  return hit ? hit : null;
}

export function canonicalKanbanCardTypeNameKey(
  raw: string | null | undefined,
): string {
  const key = normalizeCardTypeNameKey(raw);
  if (!key) return "";
  return TYPE_NAME_ALIASES[key] || key;
}

export function kanbanCardTypeNamesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const ka = canonicalKanbanCardTypeNameKey(a);
  const kb = canonicalKanbanCardTypeNameKey(b);
  return Boolean(ka && kb && ka === kb);
}

export function findKanbanCardTypeIdByName(
  types: readonly { id: string; name: string }[],
  rawName: string | null | undefined,
): string {
  const needle = canonicalKanbanCardTypeNameKey(rawName);
  if (!needle) return "";
  const hit = types.find((t) => canonicalKanbanCardTypeNameKey(t.name) === needle);
  return hit?.id ? String(hit.id) : "";
}
