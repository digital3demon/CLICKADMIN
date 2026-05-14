const SERVICE_SUFFIX_RE =
  /^(.+?)\s+((?:(?:ООО|ИП)\s+(?:(?:ЭДО|сверка|бум\.?\s*доки)\s*)+)+)$/iu;

function extractDocumentWorkflowMarkers(value) {
  const raw = String(value ?? "").replace(/\s+/g, " ").trim();
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
  return {
    cleanLegalFullName: suffix?.[1]?.trim() || raw,
    worksWithEdo: /ЭДО/iu.test(markers),
    worksWithReconciliation: /сверка/iu.test(markers),
    usesPaperDocs: /бум\.?\s*доки/iu.test(markers),
  };
}

function cleanLegalFullName(value) {
  return extractDocumentWorkflowMarkers(value).cleanLegalFullName;
}

module.exports = {
  cleanLegalFullName,
  extractDocumentWorkflowMarkers,
};
