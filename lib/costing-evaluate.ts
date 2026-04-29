import { Parser } from "expr-eval";
import type { CostingColumnKind } from "@prisma/client";

export type CostingColumnLite = {
  key: string;
  kind: CostingColumnKind;
  formula: string | null;
  sortOrder: number;
};

function asNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number.parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Парсер формул: переменные — ключи колонок; есть sum(a,b,…). */
export function createCostingParser(): Parser {
  const parser = new Parser();
  parser.functions.sum = (...args: unknown[]) =>
    args.reduce<number>((s, x) => s + asNumber(x), 0);
  parser.functions.max = (...args: unknown[]) =>
    Math.max(...args.map((x) => asNumber(x)));
  parser.functions.min = (...args: unknown[]) =>
    Math.min(...args.map((x) => asNumber(x)));
  return parser;
}

/**
 * Считает значения по колонкам: сначала все INPUT из `inputs`,
 * затем COMPUTED по sortOrder (каждая следующая видит предыдущие).
 */
export function evaluateCostingColumns(
  columns: CostingColumnLite[],
  inputs: Record<string, number>,
): { values: Record<string, number>; errors: string[] } {
  const ordered = [...columns].sort((a, b) => a.sortOrder - b.sortOrder);
  const values: Record<string, number> = {};
  const errors: string[] = [];

  for (const c of ordered) {
    if (c.kind === "INPUT") {
      values[c.key] = asNumber(inputs[c.key]);
    }
  }

  const parser = createCostingParser();
  for (const c of ordered) {
    if (c.kind !== "COMPUTED") continue;
    const formula = c.formula?.trim();
    if (!formula) {
      errors.push(`Нет формулы для «${c.key}»`);
      continue;
    }
    try {
      const expr = parser.parse(formula);
      const raw = expr.evaluate(values) as unknown;
      const num = asNumber(raw);
      values[c.key] = num;
    } catch (e) {
      errors.push(
        `${c.key}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  return { values, errors };
}
