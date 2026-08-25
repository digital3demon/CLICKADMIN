import { describe, expect, it } from "vitest";
import {
  bindFinanceInvoiceRowToOrder,
  classifyFinanceOfficeDropFiles,
  filterInvoiceRowsForRetry,
  financeInvoiceRowCanApply,
  financeInvoiceRowIsRecognized,
  financeOfficeInvoiceRowKey,
  invoiceImportSourceFileNames,
  isFinanceInvoiceImportRetryable,
  parseFinanceInvoiceImportProgressLine,
  readFinanceInvoiceImportApplyResponse,
  type FinanceInvoiceImportPreviewRow,
} from "@/lib/finance-office-invoice-import";

describe("classifyFinanceOfficeDropFiles", () => {
  it("PDF и ZIP — счета", () => {
    expect(
      classifyFinanceOfficeDropFiles([
        { name: "Счет_на_оплату_№_1646_от_20_августа_2026_г.pdf" },
        { name: "Счет_на_оплату_№_1639_от_20_августа_2026_г.zip" },
      ]).kind,
    ).toBe("invoices");
  });

  it("RAR и 7z — тоже счета", () => {
    expect(
      classifyFinanceOfficeDropFiles([
        { name: "счета.rar", type: "application/vnd.rar" },
        { name: "пачка.7z", type: "application/x-7z-compressed" },
      ]).kind,
    ).toBe("invoices");
  });

  it("Excel — оплаты", () => {
    expect(classifyFinanceOfficeDropFiles([{ name: "bank.xlsx" }]).kind).toBe(
      "bank",
    );
  });

  it("смесь Excel и PDF", () => {
    expect(
      classifyFinanceOfficeDropFiles([
        { name: "bank.xlsx" },
        { name: "счет.pdf" },
      ]).kind,
    ).toBe("mixed");
  });
});

describe("financeOfficeInvoiceRowKey", () => {
  it("различает файлы из архива", () => {
    expect(financeOfficeInvoiceRowKey("a.pdf", "pack.zip")).toBe("pack.zip::a.pdf");
    expect(financeOfficeInvoiceRowKey("a.pdf", null)).toBe("::a.pdf");
  });
});

describe("retry только ошибочных счетов", () => {
  it("успех и «пропущено» не ретраим; кириллица в ключе", () => {
    expect(
      isFinanceInvoiceImportRetryable({ ok: true, message: "Счёт прикреплён" }),
    ).toBe(false);
    expect(
      isFinanceInvoiceImportRetryable({
        ok: false,
        message: "Строка пропущена",
      }),
    ).toBe(false);
    expect(
      isFinanceInvoiceImportRetryable({
        ok: false,
        message: "Наряд не найден",
      }),
    ).toBe(true);

    const rows = [
      { key: "архив::ок.pdf", fileName: "ок.pdf", sourceArchive: "счета.zip" },
      {
        key: "архив::ошибка.pdf",
        fileName: "ошибка.pdf",
        sourceArchive: "счета.zip",
      },
      { key: "::лишний.pdf", fileName: "лишний.pdf", sourceArchive: null },
    ];
    const retryRows = filterInvoiceRowsForRetry(rows, [
      { key: "архив::ок.pdf", ok: true, message: "Счёт прикреплён" },
      { key: "архив::ошибка.pdf", ok: false, message: "Наряд не найден" },
      { key: "::лишний.pdf", ok: false, message: "Строка пропущена" },
    ]);
    expect(retryRows.map((r) => r.fileName)).toEqual(["ошибка.pdf"]);
    expect(invoiceImportSourceFileNames(retryRows)).toEqual(["счета.zip"]);
  });
});

describe("parseFinanceInvoiceImportProgressLine", () => {
  it("читает ошибку с кириллицей до и после JSON", () => {
    const ev = parseFinanceInvoiceImportProgressLine(
      '  {"type":"error","error":"Не удалось сохранить файл счёта"}  \n',
    );
    expect(ev).toEqual({
      type: "error",
      error: "Не удалось сохранить файл счёта",
    });
  });

  it("row: прогресс 2 из 7", () => {
    const ev = parseFinanceInvoiceImportProgressLine(
      JSON.stringify({
        type: "row",
        done: 2,
        total: 7,
        result: { key: "k", orderNumber: "2608-157", ok: true, message: "Счёт прикреплён" },
      }),
    );
    expect(ev?.type).toBe("row");
    if (ev?.type === "row") {
      expect(ev.done).toBe(2);
      expect(ev.total).toBe(7);
      expect(ev.result.orderNumber).toBe("2608-157");
    }
  });
});

describe("readFinanceInvoiceImportApplyResponse", () => {
  it("читает NDJSON и кириллический номер наряда", async () => {
    const result = {
      key: "архив::счёт.pdf",
      orderNumber: "2608-157",
      ok: true,
      message: "Счёт прикреплён",
    };
    const body = [
      JSON.stringify({ type: "phase", phase: "unpack" }),
      JSON.stringify({ type: "start", total: 1 }),
      JSON.stringify({ type: "row", done: 1, total: 1, result }),
      JSON.stringify({
        type: "done",
        results: [result],
        applied: 1,
        skipped: 0,
      }),
    ].join("\n");
    const res = new Response(body, {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
    });
    const seen: string[] = [];
    const results = await readFinanceInvoiceImportApplyResponse(res, (ev) =>
      seen.push(ev.type),
    );
    expect(results).toEqual([result]);
    expect(seen).toEqual(["phase", "start", "row", "done"]);
  });

  it("ручная привязка снимает «Счёт не найден» у УПД с кириллицей в имени", () => {
    const row: FinanceInvoiceImportPreviewRow = {
      key: "orphan::upd",
      fileName: "УПД_статус_1_№_1656.pdf",
      sourceArchive: null,
      invoiceNumberRaw: "",
      orderNumber: "",
      orderId: null,
      orderLabel: null,
      alreadyHasInvoice: false,
      apply: false,
      errors: ["Счёт не найден"],
      basisSnippet: "",
      sourceKind: "crm-invoice",
      updMatch: "one",
      updItems: [
        {
          key: "k1",
          number: "1656",
          fileName: "УПД_статус_1_№_1656.pdf",
          sourceArchive: null,
        },
      ],
    };
    expect(financeInvoiceRowCanApply(row)).toBe(false);
    const bound = bindFinanceInvoiceRowToOrder(row, {
      id: "ord-1",
      orderNumber: "2608-226",
      label: "2608-226 · Марченко · Лахта",
      alreadyHasInvoice: true,
      alreadyHasUpd: false,
      invoiceAttachmentId: "att-1",
    });
    expect(bound.errors).toEqual([]);
    expect(bound.orderId).toBe("ord-1");
    expect(bound.apply).toBe(true);
    expect(financeInvoiceRowCanApply(bound)).toBe(true);
  });

  it("счёт из дропа можно прикрепить без УПД", () => {
    expect(
      financeInvoiceRowCanApply({
        orderId: "o1",
        errors: [],
        updMatch: "none",
        sourceKind: "drop-invoice",
      }),
    ).toBe(true);
  });

  it("один УПД на два наряда: счёт можно, УПД нет, статус не «Распознано»", () => {
    const drop = {
      orderId: "o1",
      errors: [] as string[],
      updMatch: "ambiguous" as const,
      sourceKind: "drop-invoice" as const,
    };
    expect(financeInvoiceRowCanApply(drop)).toBe(true);
    expect(financeInvoiceRowIsRecognized(drop)).toBe(false);
    expect(
      financeInvoiceRowCanApply({
        ...drop,
        sourceKind: "crm-invoice",
      }),
    ).toBe(false);
  });
});

describe("readFinanceInvoiceImportApplyResponse extra", () => {
  it("бросает ошибку из потока", async () => {
    const body = `${JSON.stringify({ type: "error", error: "Файл слишком большой: счёт.zip" })}\n`;
    const res = new Response(body, {
      headers: { "Content-Type": "application/x-ndjson" },
    });
    await expect(readFinanceInvoiceImportApplyResponse(res)).rejects.toThrow(
      /счёт\.zip/,
    );
  });
});
