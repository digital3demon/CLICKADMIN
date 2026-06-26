import { describe, expect, it } from "vitest";
import { applyOrderStatusUrlToReplyContent } from "./email-reply-template";
import { SAMPLE_ORDER_STATUS_URL } from "@/lib/mail/reply-block-editor/presets/click-lab";

describe("applyOrderStatusUrlToReplyContent", () => {
  const realUrl = "https://crm.example/p/t/my-lab/s/a1b2c3d4e5f6";

  it("заменяет плейсхолдер {{orderStatusUrl}}", () => {
    const html = '<a href="{{orderStatusUrl}}">Статус</a>';
    expect(applyOrderStatusUrlToReplyContent(html, realUrl, SAMPLE_ORDER_STATUS_URL)).toBe(
      `<a href="${realUrl}">Статус</a>`,
    );
  });

  it("заменяет preview-URL из префлайта на реальный", () => {
    const html = `<a href="${SAMPLE_ORDER_STATUS_URL}">Узнать статус</a>`;
    expect(applyOrderStatusUrlToReplyContent(html, realUrl, SAMPLE_ORDER_STATUS_URL)).toBe(
      `<a href="${realUrl}">Узнать статус</a>`,
    );
  });

  it("не трогает другие ссылки", () => {
    const html = '<a href="https://t.me/clicklab_admin">Админ</a>';
    expect(applyOrderStatusUrlToReplyContent(html, realUrl, SAMPLE_ORDER_STATUS_URL)).toBe(
      html,
    );
  });
});
