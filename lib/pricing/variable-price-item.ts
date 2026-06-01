/** Позиция прайса с «вариативной» ценой — в наряде поле «Цена ₽» редактируется вручную. */
export function isPriceListUnitPriceEditable(opts: {
  variablePrice?: boolean | null;
  /** Строка коррекции «КП» — цена только через скидку */
  blockAsCorrectionKp?: boolean;
}): boolean {
  if (opts.blockAsCorrectionKp) return false;
  return opts.variablePrice === true;
}
