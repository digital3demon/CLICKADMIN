import type { JawArch } from "@prisma/client";

/** Поля для финансов / счёта (опционально в черновике) */
export type DetailFinanceFields = {
  quantity?: number;
  unitPrice?: number | null;
  materialId?: string | null;
  shade?: string | null;
};

export type DetailTeethLine = {
  id: string;
  constructionTypeId: string;
  kind: "teeth";
  teethFdi: string[];
} & DetailFinanceFields;

export type DetailArchLine = {
  id: string;
  constructionTypeId: string;
  kind: "arch";
  arch: JawArch;
} & DetailFinanceFields;

/** Строка из прайс-листа; зубы и челюсть — по желанию */
export type DetailPriceListLine = {
  id: string;
  kind: "priceList";
  priceListItemId: string;
  /** Подпись в списке до перезагрузки данных конфигурации */
  label?: string;
  teethFdi?: string[];
  /** null / undefined — не указано */
  jawArch?: JawArch | null;
} & DetailFinanceFields;

export type DetailLine = DetailTeethLine | DetailArchLine | DetailPriceListLine;

export function newDetailLineId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `dl-${crypto.randomUUID()}`;
  }
  return `dl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
