import { describe, expect, it } from "vitest";
import {
  buildKanbanPersonDueTelegramLines,
  formatKanbanDueYmdForTelegram,
} from "@/lib/kanban/kanban-person-due-telegram";

describe("formatKanbanDueYmdForTelegram", () => {
  it("кириллический месяц, пустой ввод и мусор", () => {
    expect(formatKanbanDueYmdForTelegram("2026-09-03")).toBe("03.09.26");
    expect(formatKanbanDueYmdForTelegram("2026-05-12")).toBe("12.05.26");
    expect(formatKanbanDueYmdForTelegram("")).toBe("—");
    expect(formatKanbanDueYmdForTelegram("не дата")).toBe("не дата");
  });
});

describe("buildKanbanPersonDueTelegramLines", () => {
  const cardUrl = "https://lab.example/kanban?card=c1&board=b1";
  const orderUrl = "https://lab.example/orders/ord-шубина";

  it("добавили: кто и карточка с кириллицей в заголовке", () => {
    const { lines, linesAdmin } = buildKanbanPersonDueTelegramLines({
      kind: "added_participant",
      actorLabel: "Всеволод Соколов",
      cardTitle: "2608-375 Перчак М.Я. Постоянные",
      cardUrl,
      orderUrl,
    });
    expect(lines[0]).toContain("Всеволод Соколов");
    expect(lines[0]).toContain("добавил(а) вас в карточку");
    expect(lines[0]).toContain("Перчак");
    expect(lines[0]).toContain("href=\"https://lab.example/kanban?card=c1&amp;board=b1\"");
    expect(linesAdmin?.[0]).toContain("заказе");
    expect(linesAdmin?.[0]).toContain("Перчак");
  });

  it("исключили: кто и какая карточка", () => {
    const { lines } = buildKanbanPersonDueTelegramLines({
      kind: "removed",
      actorLabel: "Юля",
      cardTitle: "2608-352 Невский Д.Д.",
      cardUrl,
    });
    expect(lines[0]).toContain("Юля исключил(а) вас из карточки");
    expect(lines[0]).toContain("Невский");
  });

  it("срок: кто и какая дата", () => {
    const { lines } = buildKanbanPersonDueTelegramLines({
      kind: "due_set",
      actorLabel: "Всеволод Соколов",
      cardTitle: "2608-353 Шубина Т.В.",
      cardUrl,
      dueYmd: "2026-09-03",
    });
    expect(lines[0]).toContain("Всеволод Соколов установил(а) срок");
    expect(lines[0]).toContain("03.09.26");
    expect(lines[0]).toContain("Шубина");
  });
});
