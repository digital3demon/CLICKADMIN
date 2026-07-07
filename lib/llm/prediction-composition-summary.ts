type ConstructionLine = {
  quantity: number;
  priceListItem?: { name: string } | null;
};

export type AiConstructionLine = {
  quantity?: number;
  priceListItem?: { name?: string } | null;
};

export function summarizeOrderConstructions(constructions: ConstructionLine[]): string {
  return constructions
    .map((c) => `${c.quantity}x ${c.priceListItem?.name || "Неизвестно"}`)
    .sort()
    .join(", ");
}

export function summarizeAiConstructions(constructions: AiConstructionLine[]): string {
  return constructions
    .map((c) => `${c.quantity ?? 1}x ${c.priceListItem?.name || "Неизвестно"}`)
    .sort()
    .join(", ");
}
