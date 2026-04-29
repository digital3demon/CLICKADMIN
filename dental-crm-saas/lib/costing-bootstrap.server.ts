import fs from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import type { CostingColumnKind } from "@prisma/client";
import { getActivePriceListId } from "@/lib/price-list-workspace";

export type CostingSeedDefaults = {
  version: { title: string; effectiveFrom?: string | null };
  columns: Array<{
    key: string;
    label: string;
    kind: string;
    sortOrder: number;
    hint?: string | null;
    formula?: string | null;
  }>;
  line: {
    note?: string | null;
    linkCode?: string | null;
    inputs: Record<string, number>;
  };
  profile?: {
    name: string;
    listDiscountPercent: number;
    note?: string | null;
  };
};

export function readCostingSeedDefaults(): CostingSeedDefaults {
  const p = path.join(process.cwd(), "prisma", "costing-seed-defaults.json");
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw) as CostingSeedDefaults;
}

export async function createCostingVersionFromDefaults(prisma: PrismaClient) {
  const d = readCostingSeedDefaults();
  const v = await prisma.costingVersion.create({
    data: {
      title: d.version.title,
      effectiveFrom: d.version.effectiveFrom
        ? new Date(`${d.version.effectiveFrom}T12:00:00.000Z`)
        : null,
    },
  });

  await prisma.costingColumn.createMany({
    data: d.columns.map((c) => ({
      versionId: v.id,
      key: c.key,
      label: c.label,
      kind: c.kind as CostingColumnKind,
      formula: c.formula ?? null,
      sortOrder: c.sortOrder,
      hint: c.hint ?? null,
    })),
  });

  const linkCode = d.line.linkCode?.trim();
  let pli = null;
  if (linkCode) {
    const activeListId = await getActivePriceListId(prisma);
    pli = await prisma.priceListItem.findUnique({
      where: {
        priceListId_code: { priceListId: activeListId, code: linkCode },
      },
    });
  }

  await prisma.costingLine.create({
    data: {
      versionId: v.id,
      priceListItemId: pli?.id ?? null,
      note: d.line.note ?? null,
      inputsJson: d.line.inputs as object,
    },
  });

  if (d.profile) {
    await prisma.costingClientProfile.create({
      data: {
        versionId: v.id,
        name: d.profile.name,
        listDiscountPercent: d.profile.listDiscountPercent,
        note: d.profile.note ?? null,
      },
    });
  }

  return v;
}
