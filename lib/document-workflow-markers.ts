export type DocumentWorkflowMarkers = {
  cleanLegalFullName: string | null;
  worksWithEdo: boolean;
  worksWithReconciliation: boolean;
  usesPaperDocs: boolean;
};

const SERVICE_SUFFIX_RE =
  /^(.+?)\s+((?:(?:ООО|ИП)\s+(?:(?:ЭДО|сверка|бум\.?\s*доки)\s*)+)+)$/iu;

export function extractDocumentWorkflowMarkers(
  value: string | null | undefined,
): DocumentWorkflowMarkers {
  const raw = (value ?? "").replace(/\s+/g, " ").trim();
  if (!raw) {
    return {
      cleanLegalFullName: null,
      worksWithEdo: false,
      worksWithReconciliation: false,
      usesPaperDocs: false,
    };
  }

  const suffix = raw.match(SERVICE_SUFFIX_RE);
  const markers = suffix?.[2] ?? "";
  const cleanLegalFullName = suffix?.[1]?.trim() || raw;
  return {
    cleanLegalFullName,
    worksWithEdo: /ЭДО/iu.test(markers),
    worksWithReconciliation: /сверка/iu.test(markers),
    usesPaperDocs: /бум\.?\s*доки/iu.test(markers),
  };
}

export function cleanLegalFullName(value: string | null | undefined): string | null {
  return extractDocumentWorkflowMarkers(value).cleanLegalFullName;
}
