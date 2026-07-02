import type { ClickMigMaterial } from "@prisma/client";

const LABELS: Record<ClickMigMaterial, string> = {
  ZIRCONIA: "Циркон",
  EMAX: "E.max",
  PMMA: "ПММА",
  COMPOSITE: "Композит",
};

export function clickMigMaterialLabel(m: ClickMigMaterial): string {
  return LABELS[m] ?? m;
}

export const CLICKMIG_MATERIALS: ClickMigMaterial[] = [
  "ZIRCONIA",
  "EMAX",
  "PMMA",
  "COMPOSITE",
];
