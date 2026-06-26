import { describe, expect, it } from "vitest";
import {
  defaultReplySubject,
  renderEmailReplyTemplate,
  substituteOrderNumberPlaceholders,
  type EmailReplyTemplateContext,
} from "@/lib/mail/email-reply-template";
import { resolveReplyToSourceEmailId } from "@/lib/mail/email-reply-template";

const baseContext: EmailReplyTemplateContext = {
  orderNumber: "2685-482",
  patientName: "Иванова М. А.",
  doctorName: "Петров П. П.",
  clinicName: "Клиника «Альфа»",
  clinicAddress: "ул. Ленина, 1",
  date: "27.05.26",
  dueDate: "27.05.2026",
  appointmentDate: "28.05.2026 10:00",
  originalSubject: "Новочеркасская Невский ДД",
  originalFrom: "Denis Nevskiy <denis@example.com>",
};

describe("renderEmailReplyTemplate", () => {
  it("подставляет кириллицу до и после плейсхолдера", () => {
    const out = renderEmailReplyTemplate(
      "Наряд {{orderNumber}} принят. Пациент: {{patientName}}.",
      baseContext,
    );
    expect(out).toBe("Наряд 2685-482 принят. Пациент: Иванова М. А..");
  });

  it("пустые значения дают пустую подстановку", () => {
    const out = renderEmailReplyTemplate("Клиника: {{clinicName}}", {
      ...baseContext,
      clinicName: "",
    });
    expect(out).toBe("Клиника: ");
  });

  it("подставляет адрес клиники", () => {
    const out = renderEmailReplyTemplate("Адрес: {{clinicAddress}}", baseContext);
    expect(out).toBe("Адрес: ул. Ленина, 1");
  });

  it("экранирует HTML при html=true", () => {
    const out = renderEmailReplyTemplate(
      "<p>{{patientName}}</p>",
      { ...baseContext, patientName: "Тест <script>" },
      { html: true },
    );
    expect(out).toBe("<p>Тест &lt;script&gt;</p>");
  });

  it("поддерживает пробелы внутри {{ dueDate }}", () => {
    const out = renderEmailReplyTemplate(
      "Срок: {{ dueDate }}",
      { ...baseContext, dueDate: "29.05.26, 14:00" },
    );
    expect(out).toBe("Срок: 29.05.26, 14:00");
  });

  it("подставляет {{date}} без времени", () => {
    const out = renderEmailReplyTemplate(
      "Готовность к {{ date }}",
      { ...baseContext, date: "15.06.26" },
    );
    expect(out).toBe("Готовность к 15.06.26");
  });
});

describe("resolveReplyToSourceEmailId", () => {
  it("для одного письма возвращает его id", () => {
    expect(resolveReplyToSourceEmailId(["a1"], null)).toBe("a1");
  });

  it("для нескольких требует явный выбор", () => {
    expect(resolveReplyToSourceEmailId(["a1", "a2"], "a2")).toBe("a2");
    expect(resolveReplyToSourceEmailId(["a1", "a2"], null)).toBeNull();
  });
});

describe("defaultReplySubject", () => {
  it("добавляет Re: к теме", () => {
    expect(defaultReplySubject("Заказ 178 от 10.02.2026")).toBe(
      "Re: Заказ 178 от 10.02.2026",
    );
  });

  it("не дублирует Re:", () => {
    expect(defaultReplySubject("Re: Уже ответ")).toBe("Re: Уже ответ");
  });
});

describe("substituteOrderNumberPlaceholders", () => {
  it("подставляет номер в плейсхолдер", () => {
    expect(
      substituteOrderNumberPlaceholders("№ {{orderNumber}}", "178"),
    ).toBe("№ 178");
  });
});
