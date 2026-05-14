import { describe, expect, it } from "vitest";
import { extractDocumentWorkflowMarkers } from "@/lib/document-workflow-markers";
import {
  cleanLegalFullName,
  formatCounterpartyRequisitesShortSummary,
  formatCounterpartyRequisitesSummary,
} from "@/lib/format-counterparty-requisites-summary";

describe("formatCounterpartyRequisitesSummary", () => {
  it("removes service suffixes from legal name", () => {
    expect(
      formatCounterpartyRequisitesSummary({
        legalFullName: "ООО «Поколение» ООО ЭДО сверка",
        inn: "7805815753",
      }),
    ).toBe("Наименование: ООО «Поколение»\nИНН: 7805815753");

    expect(
      formatCounterpartyRequisitesSummary({
        legalFullName: "ООО «СПЕЙСДЕНТ» ООО бум.доки",
        inn: "7801669460",
      }),
    ).toBe("Наименование: ООО «СПЕЙСДЕНТ»\nИНН: 7801669460");

    expect(
      formatCounterpartyRequisitesShortSummary({
        legalFullName: "ООО «Пульс-сервис» ООО сверка ЭДО",
        inn: "7815023490",
      }),
    ).toBe("Наименование: ООО «Пульс-сервис»\nИНН: 7815023490");
  });

  it("splits workflow markers from legal name", () => {
    expect(extractDocumentWorkflowMarkers("ООО «Астард Мед» ООО СВЕРКА ЭДО")).toEqual({
      cleanLegalFullName: "ООО «Астард Мед»",
      worksWithEdo: true,
      worksWithReconciliation: true,
      usesPaperDocs: false,
    });
    expect(extractDocumentWorkflowMarkers('ООО "ВируВан" ООО ЭДО')).toEqual({
      cleanLegalFullName: 'ООО "ВируВан"',
      worksWithEdo: true,
      worksWithReconciliation: false,
      usesPaperDocs: false,
    });
    expect(extractDocumentWorkflowMarkers("ИП Иванов Иван Иванович ИП бум.доки")).toEqual({
      cleanLegalFullName: "ИП Иванов Иван Иванович",
      worksWithEdo: false,
      worksWithReconciliation: false,
      usesPaperDocs: true,
    });
    expect(
      extractDocumentWorkflowMarkers("ООО «Поколение» ООО ЭДО сверка ИП бум.доки"),
    ).toEqual({
      cleanLegalFullName: "ООО «Поколение»",
      worksWithEdo: true,
      worksWithReconciliation: true,
      usesPaperDocs: true,
    });
    expect(extractDocumentWorkflowMarkers("ООО «Чистое название»")).toEqual({
      cleanLegalFullName: "ООО «Чистое название»",
      worksWithEdo: false,
      worksWithReconciliation: false,
      usesPaperDocs: false,
    });
    expect(cleanLegalFullName("ОП ООО «РЕМИ» ООО сверка ЭДО")).toBe("ОП ООО «РЕМИ»");
  });
});
