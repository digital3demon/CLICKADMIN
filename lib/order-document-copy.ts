export type DocumentCopyCompositionLine = {
  title: string;
  quantity: number;
  amountRub: number;
};

export type DocumentCopyPayload = {
  orderLine: string;
  legalName: string | null;
  inn: string | null;
  composition: DocumentCopyCompositionLine[];
};

export function formatDocumentCopyMoneyRu(n: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDocumentCopyOrderLine(parts: {
  orderNumber: string;
  patientName: string | null;
  doctorName: string | null;
  patientShort: string;
  doctorShort: string;
}): string {
  const num = parts.orderNumber.trim() || "—";
  const pat = parts.patientShort || parts.patientName?.trim() || "—";
  const doc = parts.doctorShort || parts.doctorName?.trim() || "—";
  return [num, pat, doc].map((s) => s.trim()).filter(Boolean).join(" ");
}

export function formatDocumentCopyCompositionText(
  lines: DocumentCopyCompositionLine[],
): string {
  return lines
    .flatMap((line) => [
      line.title,
      String(line.quantity),
      formatDocumentCopyMoneyRu(line.amountRub),
    ])
    .join("\n");
}

export function formatDocumentCopyOrderLegalText(
  payload: Pick<DocumentCopyPayload, "orderLine" | "legalName" | "inn">,
): string {
  return [
    payload.orderLine.trim(),
    (payload.legalName ?? "").trim(),
    (payload.inn ?? "").trim(),
  ]
    .filter(Boolean)
    .join("\n");
}
