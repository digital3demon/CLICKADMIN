/**
 * Группы нового вида склада. Имя уникально внутри родителя (склад / производитель).
 * Старый вид склада эти таблицы не читает.
 */

export type InventoryGroupOwnerKind = "WAREHOUSE" | "MANUFACTURER";

export function normalizeGroupName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

export function manufacturerOwnerKey(manufacturerName: string): string {
  return manufacturerName.trim().toLowerCase();
}

export function warehouseOwnerKey(): string {
  return "";
}

/** Переложить члена из одной группы в другую (виртуальная «не сгруппировано» не в БД). */
export function moveMemberBetweenGroups(
  sourceMemberIds: string[],
  destMemberIds: string[],
  memberId: string,
  sourceVirtual: boolean,
  destVirtual: boolean,
): { sourceMemberIds: string[]; destMemberIds: string[] } | null {
  if (!memberId || sourceVirtual && destVirtual) return null;
  const alreadyInDest = destMemberIds.includes(memberId);
  const inSource = sourceMemberIds.includes(memberId);
  if (sourceVirtual) {
    if (alreadyInDest) return null;
    return {
      sourceMemberIds,
      destMemberIds: [...destMemberIds, memberId],
    };
  }
  if (destVirtual) {
    if (!inSource) return null;
    return {
      sourceMemberIds: sourceMemberIds.filter((id) => id !== memberId),
      destMemberIds,
    };
  }
  if (!inSource && alreadyInDest) return null;
  return {
    sourceMemberIds: sourceMemberIds.filter((id) => id !== memberId),
    destMemberIds: alreadyInDest ? destMemberIds : [...destMemberIds, memberId],
  };
}
