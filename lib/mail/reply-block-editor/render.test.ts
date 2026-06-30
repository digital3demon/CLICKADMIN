import { describe, expect, it } from "vitest";
import { createClickLabPreset, SAMPLE_ORDER_STATUS_URL } from "./presets/click-lab";
import {
  applyPreflightOverrides,
  renderReplyBlocksHtml,
} from "./render";
import { validateReplyEditorDocument, validateButtonAction } from "./validate";

const SAMPLE_CONTEXT = {
  orderNumber: "2606-408",
  patientName: "Иванова",
  doctorName: "Петров",
  clinicName: "Клиника",
  clinicAddress: "ул. Ленина, 1",
  date: "05.07.26",
  dueDate: "10.07.26, 12:00",
  appointmentDate: "",
  originalSubject: "Заказ",
  originalFrom: "clinic@test.com",
  orderStatusUrl: "https://crm.example/p/t/lab/s/abc123",
};

describe("renderReplyBlocksHtml", () => {
  it("подставляет orderStatusUrl в кнопку и не оставляет плейсхолдер", () => {
    const doc = createClickLabPreset();
    const html = renderReplyBlocksHtml(doc, SAMPLE_CONTEXT, []);
    expect(html).toContain("https://crm.example/p/t/lab/s/abc123");
    expect(html).not.toContain("{{orderStatusUrl}}");
    expect(html).toContain("Узнать статус заказа");
    expect(html).toContain("t.me/clicklab_admin");
  });

  it("задаёт width у inline-картинки", () => {
    const doc = createClickLabPreset();
    const html = renderReplyBlocksHtml(doc, SAMPLE_CONTEXT, [
      { id: "a1", contentId: "reply-asset-a@crm" },
    ]);
    expect(html).toContain('width="');
  });
});

describe("applyPreflightOverrides", () => {
  it("меняет editable text block", () => {
    const doc = createClickLabPreset();
    const intro = doc.blocks.find((b) => b.type === "text" && b.editableInPreflight);
    expect(intro?.type).toBe("text");
    const out = applyPreflightOverrides(doc, {
      textOverrides: { [intro!.id]: "Новый текст" },
    });
    const block = out.blocks.find((b) => b.id === intro!.id);
    expect(block?.type).toBe("text");
    if (block?.type === "text") expect(block.content).toBe("Новый текст");
  });

  it("не подставляет плейсхолдеры в literal text override", () => {
    const doc = createClickLabPreset();
    const intro = doc.blocks.find((b) => b.type === "text" && b.editableInPreflight);
    expect(intro?.type).toBe("text");
    const html = renderReplyBlocksHtml(doc, SAMPLE_CONTEXT, [], {
      textOverrides: { [intro!.id]: "Текст с {{date}} без подстановки" },
    });
    expect(html).toContain("Текст с {{date}} без подстановки");
    expect(html).not.toContain("05.07.26");
  });
});

describe("validateButtonAction", () => {
  it("принимает плейсхолдер orderStatusUrl", () => {
    expect(
      validateButtonAction({ type: "url", href: "{{orderStatusUrl}}" }),
    ).toBeNull();
  });

  it("отклоняет download без https", () => {
    expect(
      validateButtonAction({ type: "download", href: "/local/file.pdf" }),
    ).toContain("публичная ссылка");
  });
});

describe("validateReplyEditorDocument", () => {
  it("валидирует пресет Click Lab", () => {
    expect(validateReplyEditorDocument(createClickLabPreset())).toEqual([]);
  });
});

describe("resolveLayoutType", () => {
  it("сохраняет freeform для шаблона только с htmlTemplate", async () => {
    const { resolveLayoutType } = await import("./index");
    expect(resolveLayoutType(null, "<p>legacy</p>", null)).toBe("freeform");
    expect(resolveLayoutType(undefined, "<p>legacy</p>", null)).toBe("freeform");
  });

  it("выбирает blocks для пустого нового ящика", async () => {
    const { resolveLayoutType } = await import("./index");
    expect(resolveLayoutType(null, "", null)).toBe("blocks");
  });
});

describe("SAMPLE_ORDER_STATUS_URL", () => {
  it("используется в превью", () => {
    expect(SAMPLE_ORDER_STATUS_URL).toMatch(/^https:\/\//);
  });
});
