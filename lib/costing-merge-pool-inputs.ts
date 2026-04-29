/** В формулы подставляются переменные sh_<key> — доля строки из общего пула, ₽. */
export function mergePoolVarsIntoInputs(
  base: Record<string, number>,
  pools: { id: string; key: string }[],
  sharesByPoolId: Record<string, number>,
): Record<string, number> {
  const out = { ...base };
  for (const p of pools) {
    out[`sh_${p.key}`] = sharesByPoolId[p.id] ?? 0;
  }
  return out;
}
