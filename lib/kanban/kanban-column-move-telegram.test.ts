import { describe, expect, it } from "vitest";
import { buildKanbanColumnMoveTelegramLines } from "@/lib/kanban/kanban-column-move-telegram";

describe("buildKanbanColumnMoveTelegramLines", () => {
  it("откуда/куда и кто, кириллица до и после", () => {
    const built = buildKanbanColumnMoveTelegramLines({
      cardLinkHtml: '<a href="https://crm.example/k">2608-324 Ситнова</a>',
      fromTitle: "К исполнению",
      toTitle: "Согласование",
      actorLabel: "Всеволод",
      cardWord: '<a href="https://crm.example/k">карточке</a>',
      orderWord: '<a href="https://crm.example/o">заказе</a>',
    });
    expect(built.lines[0]).toBe(
      "Всеволод перенёс(ла) карточку из «К исполнению» в «Согласование»",
    );
    expect(built.linesSelf[0]).toBe(
      "Вы перенесли карточку из «К исполнению» в «Согласование»",
    );
    expect(built.linesAdmin?.[1]).toContain("карточке");
    expect(built.linesSelfAdmin?.[0]).toContain("Вы перенесли");
  });

  it("экранирует опасные символы в названии колонки", () => {
    const built = buildKanbanColumnMoveTelegramLines({
      cardLinkHtml: "карточка",
      fromTitle: "Стоп <x>",
      toTitle: "Готово & сдача",
      actorLabel: "Юля",
    });
    expect(built.lines[0]).toContain("«Стоп &lt;x&gt;»");
    expect(built.lines[0]).toContain("«Готово &amp; сдача»");
    expect(built.linesSelf[0]).toContain("Вы перенесли");
  });
});
