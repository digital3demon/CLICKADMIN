/** Версия серверного обогащения predictionJson; bump при изменении enrich-логики. */
export const ORDER_EMAIL_ENRICHMENT_VERSION = 10;

export function predictionNeedsReEnrichment(json: Record<string, unknown> | null | undefined): boolean {
  if (!json || typeof json !== "object") return true;
  if (json.enrichmentVersion !== ORDER_EMAIL_ENRICHMENT_VERSION) return true;
  if (json.workReceivedAt == null) return true;
  if (json.resolvedConstructions === undefined) return true;
  if (json.dueDate === undefined) return true;
  const hints = json.compositionHints;
  const hasHints = Array.isArray(hints) && hints.length > 0;
  const lineCount = json.compositionLineCount;
  if (hasHints && typeof lineCount !== "number") return true;
  const clientText = typeof json.clientOrderText === "string" ? json.clientOrderText.trim() : "";
  const legacy = typeof json.workDescription === "string" ? json.workDescription.trim() : "";
  if (!clientText && legacy) return true;
  return false;
}
