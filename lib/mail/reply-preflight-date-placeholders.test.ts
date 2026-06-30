import { describe, expect, it } from "vitest";
import { createClickLabPreset } from "@/lib/mail/reply-block-editor";
import {
  collectReplyDatePlaceholdersInHaystack,
  initialReplyDatePickerValues,
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

describe("initialReplyDatePickerValues", () => {
  it("подставляет срок и запись из полей наряда", () => {
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
