import { describe, expect, it } from "vitest";
import { createClickLabPreset } from "@/lib/mail/reply-block-editor";
import {
  buildReplyDateDisplayByKey,
  collectReplyDatePlaceholdersInHaystack,
  formatReplyDateForEmailContext,
  injectReplyInlineDatePickers,
  initialReplyDatePickerState,
  initialReplyDatePickerValues,
  stripReplyInlineDatePickers,
} from "@/lib/mail/reply-preflight-date-placeholders";

describe("collectReplyDatePlaceholdersInHaystack", () => {
  it("находит {{date}} в блоковом шаблоне", () => {
    const hay = JSON.stringify(createClickLabPreset());
    const found = collectReplyDatePlaceholdersInHaystack(hay);
    expect(found.some((d) => d.key === "date")).toBe(true);
  });

  it("находит несколько разных плейсхолдеров дат", () => {
    const hay = "до {{date}} и {{appointmentDate}} и {{dueDate}}";
    const keys = collectReplyDatePlaceholdersInHaystack(hay).map((d) => d.key);
    expect(keys).toEqual(["date", "appointmentDate", "dueDate"]);
  });
});

describe("initialReplyDatePickerState", () => {
  it("подставляет срок и запись из полей наряда с временем", () => {
    const defs = collectReplyDatePlaceholdersInHaystack(
      "{{date}} {{appointmentDate}} {{dueDate}}",
    );
    const state = initialReplyDatePickerState(
      defs,
      "2026-07-13T14:30",
      "2026-07-08T10:00",
      { labWholeDay: false, appointmentWholeDay: false },
    );
    expect(state.date?.value).toBe("2026-07-13");
    expect(state.dueDate).toEqual({ value: "2026-07-13T14:30", hasTime: true });
    expect(state.appointmentDate).toEqual({
      value: "2026-07-08T10:00",
      hasTime: true,
    });
  });

  it("без времени пишет «в течение дня»", () => {
    const defs = collectReplyDatePlaceholdersInHaystack("{{dueDate}} {{appointmentDate}}");
    const state = initialReplyDatePickerState(
      defs,
      "2026-07-13T14:30",
      "2026-07-08T10:00",
      { labWholeDay: true, appointmentWholeDay: true },
    );
    expect(formatReplyDateForEmailContext(defs[1]!, state.dueDate)).toBe(
      "13.07.26, в течение дня",
    );
    expect(formatReplyDateForEmailContext(defs[0]!, state.appointmentDate)).toBe(
      "08.07.26, в течение дня",
    );
  });
});

describe("initialReplyDatePickerValues", () => {
  it("совместим с legacy API", () => {
    const defs = collectReplyDatePlaceholdersInHaystack(
      "{{date}} {{appointmentDate}} {{dueDate}}",
    );
    const values = initialReplyDatePickerValues(
      defs,
      "2026-07-13T14:30",
      "2026-07-08T10:00",
    );
    expect(values.date).toBe("2026-07-13");
    expect(values.dueDate).toBe("2026-07-13T14:30");
    expect(values.appointmentDate).toBe("2026-07-08T10:00");
  });
});

describe("inline date pickers in preview html", () => {
  it("оборачивает даты в кликабельные span и снимает их перед отправкой", () => {
    const defs = collectReplyDatePlaceholdersInHaystack("{{dueDate}}");
    const display = buildReplyDateDisplayByKey(defs, {
      dueDate: { value: "2026-07-17", hasTime: false },
    });
    const html = injectReplyInlineDatePickers(
      `<p>Срок ${display.dueDate}</p>`,
      defs,
      display,
    );
    expect(html).toContain('data-reply-date-key="dueDate"');
    expect(html).toContain("17.07.26, в течение дня");
    expect(stripReplyInlineDatePickers(html)).toBe(
      "<p>Срок 17.07.26, в течение дня</p>",
    );
  });
});
