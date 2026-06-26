import { describe, expect, it } from "vitest";
import { buildEmailReplyTemplateContext } from "./build-email-reply-context";
import { substituteOrderNumberPlaceholders } from "./email-reply-template";

describe("buildEmailReplyTemplateContext", () => {
  it("подставляет частное лицо при пустой клинике", () => {
    const ctx = buildEmailReplyTemplateContext({
      orderNumber: "100",
      patientName: "Иванов",
      doctorName: "Петров",
      clinicName: null,
      originalSubject: "Заказ",
      originalFromName: "A",
      originalFromAddress: "a@test.ru",
    });
    expect(ctx.clinicName).toBe("Частное лицо");
    expect(ctx.clinicAddress).toBe("—");
    expect(ctx.orderNumber).toBe("100");
  });

  it("форматирует срок из datetime-local", () => {
    const ctx = buildEmailReplyTemplateContext({
      orderNumber: "2605-001",
      dueDate: "2026-05-29T14:00",
    });
    expect(ctx.dueDate).toMatch(/29\.05\.26/);
    expect(ctx.dueDate).toMatch(/14:00/);
    expect(ctx.date).toBe("29.05.26");
  });

  it("date берётся из явного поля, иначе из срока лаборатории", () => {
    const ctx = buildEmailReplyTemplateContext({
      orderNumber: "1",
      date: "2026-06-10",
      dueDate: "2026-05-29T14:00",
    });
    expect(ctx.date).toBe("10.06.26");
  });
});

describe("substituteOrderNumberPlaceholders", () => {
  it("заменяет {{orderNumber}} в отредактированном тексте", () => {
    const out = substituteOrderNumberPlaceholders(
      "Наряд {{orderNumber}} принят. Номер {{orderNumber}}.",
      "2685-482",
    );
    expect(out).toBe("Наряд 2685-482 принят. Номер 2685-482.");
  });
});
