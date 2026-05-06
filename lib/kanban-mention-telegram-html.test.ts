import { describe, expect, it, vi } from "vitest";
import {
  buildKanbanMentionInCommentTelegramHtmlLine,
  extractOrderNumberLabelFromKanbanCardTitle,
} from "@/lib/kanban-mention-telegram-html";

vi.mock("@/lib/kaiten-card-web-url", () => ({
  getKaitenCardWebUrl: (id: number) =>
    id === 999 ? "https://kaiten.example/card/999" : null,
}));

describe("extractOrderNumberLabelFromKanbanCardTitle", () => {
  it("берёт первый токен первой строки", () => {
    expect(
      extractOrderNumberLabelFromKanbanCardTitle(
        "2605-002 Иванов И.\nвторая строка",
      ),
    ).toBe("2605-002");
  });

  it("кириллица до и после номера — токен всё равно первый", () => {
    expect(
      extractOrderNumberLabelFromKanbanCardTitle("прочее без номера на первой строке"),
    ).toBe("прочее");
  });
});

describe("buildKanbanMentionInCommentTelegramHtmlLine", () => {
  it("заказ + карточка: номер наряда и ссылка на Kaiten", () => {
    const line = buildKanbanMentionInCommentTelegramHtmlLine({
      actorDisplayName: "Иван Петров",
      actorMentionHandle: "dent",
      linkedOrderId: "ord1",
      orderNumberLabel: "2605-002",
      kaitenCardId: 999,
      kanbanCardAbsoluteUrl: "https://crm.example/kanban?card=x",
      orderPageAbsoluteUrl: "https://crm.example/orders/ord1",
    });
    expect(line).toContain("Иван Петров (@dent)");
    expect(line).toContain("упомянул вас в заказе");
    expect(line).toContain(
      '<a href="https://crm.example/orders/ord1">2605-002</a>',
    );
    expect(line).toContain(
      '<a href="https://kaiten.example/card/999">карточке</a>',
    );
  });

  it("без наряда — только карточка (канбан)", () => {
    const line = buildKanbanMentionInCommentTelegramHtmlLine({
      actorDisplayName: "Анна",
      actorMentionHandle: null,
      kaitenCardId: null,
      kanbanCardAbsoluteUrl: "https://crm.example/kanban?card=c1",
    });
    expect(line).toBe(
      "Анна упомянул вас в <a href=\"https://crm.example/kanban?card=c1\">карточке</a>",
    );
  });
});
