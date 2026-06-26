import { describe, expect, it } from "vitest";
import {
  buildOrderExportInvoicedText,
  computeOrderSentAt,
  formatAdditionalSourceCell,
  formatInvoiceCell,
  formatOrderExportAmountRub,
  formatRequisitesTemplateStyle,
  formatShippedCell,
  mapOrderToExportV2Row,
  ORDER_EXPORT_V2_COLUMN_WIDTHS,
  ORDER_EXPORT_V2_HEADER_FILLS,
  orderExportV2ColumnCount,
  type OrderExportV2Input,
} from "./order-export-v2";
import { ORDER_EXPORT_V2_HEADERS } from "./order-import-export";

function baseOrder(overrides: Partial<OrderExportV2Input> = {}): OrderExportV2Input {
  return {
    orderNumber: "2605-001",
    patientName: "Иванов Иван",
    doctor: { fullName: "Соколов Виктор Владимирович" },
    clinic: { name: "Студия 32", worksWithReconciliation: true },
    clientOrderText: null,
    prostheticsText: null,
    registeredByLabel: "Админ",
    workReceivedAt: new Date("2026-05-10T10:00:00.000Z"),
    createdAt: new Date("2026-05-10T11:00:00.000Z"),
    notes: null,
    hasCt: true,
    hasMri: false,
    hasPhoto: false,
    hasScans: false,
    additionalSourceNotes: "слепки",
    dueDate: new Date("2026-05-15T00:00:00.000Z"),
    appointmentDate: new Date("2026-05-12T14:30:00.000Z"),
    dueToAdminsHasTime: true,
    adminShippedOtpr: true,
    payment: "Не оплачено",
    invoiceNumber: "376",
    invoiceAttachmentCreatedAt: new Date("2026-05-14T09:00:00.000Z"),
    isUrgent: true,
    urgentCoefficient: 1.5,
    compositionDiscountPercent: 0,
    kaitenCardId: 123,
    demoKanbanColumn: null,
    constructions: [
      {
        sortOrder: 0,
        category: "PRICE_LIST",
        quantity: 1,
        unitPrice: 17000,
        lineDiscountPercent: 0,
        constructionType: null,
        priceListItem: { code: "1001", name: "Сплинт сложный" },
        material: null,
        shade: null,
        teethFdi: [],
        bridgeFromFdi: null,
        bridgeToFdi: null,
        arch: null,
      },
    ],
    requisites: {
      legalFullName: 'ООО "Клиника" сверка ЭДО',
      inn: "1234567890",
    },
    revisions: [
      {
        createdAt: new Date("2026-05-16T08:00:00.000Z"),
        snapshot: {
          v: 1,
          order: { adminShippedOtpr: false, labWorkStatus: "TO_EXECUTION" },
          constructions: [],
        },
      },
      {
        createdAt: new Date("2026-05-16T12:00:00.000Z"),
        snapshot: {
          v: 1,
          order: { adminShippedOtpr: true, labWorkStatus: "TO_EXECUTION" },
          constructions: [],
        },
      },
    ],
    ...overrides,
  };
}

describe("ORDER_EXPORT_V2_HEADERS", () => {
  it("содержит 22 колонки в порядке шаблона", () => {
    expect(ORDER_EXPORT_V2_HEADERS).toHaveLength(22);
    expect(ORDER_EXPORT_V2_HEADERS[0]).toBe("Зашла");
    expect(ORDER_EXPORT_V2_HEADERS[3]).toBe("Номер наряда");
    expect(ORDER_EXPORT_V2_HEADERS[19]).toBe("Выставлено");
    expect(orderExportV2ColumnCount()).toBe(22);
  });

  it("имеет заливку шапки для каждой колонки из эталона", () => {
    expect(ORDER_EXPORT_V2_HEADER_FILLS).toHaveLength(22);
    expect(ORDER_EXPORT_V2_HEADER_FILLS[2]).toBe("FF8CB3E4");
    expect(ORDER_EXPORT_V2_HEADER_FILLS[16]).toBe("FFD8D8D8");
    expect(ORDER_EXPORT_V2_COLUMN_WIDTHS).toHaveLength(22);
  });
});

describe("buildOrderExportInvoicedText", () => {
  it("формирует прайс и коэффициент срочности", () => {
    const text = buildOrderExportInvoicedText(
      {
        isUrgent: true,
        urgentCoefficient: 1.5,
        compositionDiscountPercent: 0,
        doctor: { fullName: "Соколов Виктор Владимирович" },
      },
      baseOrder().constructions,
    );
    expect(text).toContain("1001 Сплинт сложный *17000*1");
    expect(text).toContain("Коэффициент Соколов В. В. х1.5");
  });

  it("добавляет строку скидки на наряд", () => {
    const text = buildOrderExportInvoicedText(
      {
        isUrgent: false,
        urgentCoefficient: null,
        compositionDiscountPercent: 10,
        doctor: { fullName: "Иванов И.И." },
      },
      baseOrder().constructions,
    );
    expect(text).toContain("Скидка 10%");
  });
});

describe("formatOrderExportAmountRub", () => {
  it("учитывает срочность", () => {
    const amount = formatOrderExportAmountRub(
      baseOrder().constructions,
      0,
      true,
      1.5,
    );
    expect(amount).toBe("р.25 500");
  });
});

describe("formatShippedCell", () => {
  it("возвращает «Да, дд.мм.гггг» при дате отгрузки", () => {
    const sentAt = new Date("2026-05-16T12:00:00.000Z");
    const cell = formatShippedCell(true, sentAt);
    expect(cell).toMatch(/^Да, \d{2}\.\d{2}\.\d{4}$/);
  });

  it("возвращает только «Да» без даты", () => {
    expect(formatShippedCell(true, null)).toBe("Да");
    expect(formatShippedCell(false, null)).toBe("Нет");
  });
});

describe("computeOrderSentAt", () => {
  it("находит первый переход adminShippedOtpr false→true", () => {
    const sentAt = computeOrderSentAt(baseOrder().revisions);
    expect(sentAt?.toISOString()).toBe("2026-05-16T12:00:00.000Z");
  });
});

describe("formatRequisitesTemplateStyle", () => {
  it("сохраняет маркеры в legalFullName и добавляет ИНН", () => {
    const text = formatRequisitesTemplateStyle({
      legalFullName: 'ООО "Клиника" сверка ЭДО',
      inn: "1234567890",
    });
    expect(text).toBe('ООО "Клиника" сверка ЭДО\nИНН 1234567890');
  });
});

describe("formatAdditionalSourceCell", () => {
  it("собирает флаги и текст заметок", () => {
    const cell = formatAdditionalSourceCell(baseOrder());
    expect(cell).toBe("КТ; слепки");
  });
});

describe("formatInvoiceCell", () => {
  it("добавляет дату из вложения счёта", () => {
    const cell = formatInvoiceCell(
      "376",
      new Date("2026-05-14T09:00:00.000Z"),
    );
    expect(cell).toMatch(/^Счёт 376 от \d{2}\.\d{2}\.\d{4}$/);
  });
});

describe("mapOrderToExportV2Row", () => {
  it("возвращает 22 значения", () => {
    const row = mapOrderToExportV2Row(baseOrder());
    expect(row).toHaveLength(22);
    expect(row[3]).toBe("2605-001");
    expect(row[4]).toBe("Иванов Иван");
    expect(row[21]).toBe("Да");
  });

  it("канбан «Да» при demoKanbanColumn без Kaiten", () => {
    const row = mapOrderToExportV2Row(
      baseOrder({ kaitenCardId: null, demoKanbanColumn: "IN_PROGRESS" }),
    );
    expect(row[21]).toBe("Да");
  });
});
