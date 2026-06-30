import { describe, expect, it } from "vitest";
import {
  resolveLinkedOrderKanbanDescription,
  resolveLinkedOrderKanbanTitle,
  stripKaitenDescriptionForKanbanBody,
} from "@/lib/kanban/kaiten-linked-order";

describe("resolveLinkedOrderKanbanTitle", () => {
  const fromOrder = "2606-179 Иванов И.И.\nПетров П.П. Коронка 10.06";

  it("всегда берёт заголовок из полей наряда", () => {
    expect(
      resolveLinkedOrderKanbanTitle(
        { kaitenCardTitleMirror: "устаревшая шапка из Kaiten" },
        fromOrder,
      ),
    ).toBe(fromOrder);
  });
});

describe("resolveLinkedOrderKanbanDescription", () => {
  const shortClient = "Добрый день!\nКлиника";

  it("берёт полное описание из зеркала Kaiten", () => {
    const fullKaiten =
      "Заказ от клиента:\nДобрый день!\nКлиника\n\nСева!\nТест байт\nНа 27.06.26";
    const desc = resolveLinkedOrderKanbanDescription(
      {
        clientOrderText: shortClient,
        notes: null,
        kaitenCardId: 66704614,
        kaitenCardDescriptionMirror: fullKaiten,
      },
      false,
    );
    expect(desc).toContain("Сева!");
    expect(desc).toContain("Тест байт");
    expect(desc).toContain("Наряд в CRM. Карточка Kaiten: #66704614");
    expect(desc).not.toBe(
      resolveLinkedOrderKanbanDescription(
        {
          clientOrderText: shortClient,
          notes: null,
          kaitenCardId: 66704614,
          kaitenCardDescriptionMirror: null,
        },
        false,
      ),
    );
  });

  it("без зеркала — из clientOrderText и notes", () => {
    const desc = resolveLinkedOrderKanbanDescription(
      {
        clientOrderText: shortClient,
        notes: "Коммент",
        kaitenCardId: null,
        kaitenCardDescriptionMirror: null,
      },
      false,
    );
    expect(desc).toContain("Заказ от клиента:");
    expect(desc).toContain("Комментарий от админов:\nКоммент");
  });
});

describe("stripKaitenDescriptionForKanbanBody", () => {
  it("убирает блок продолжения и хвост CRM", () => {
    const out = stripKaitenDescriptionForKanbanBody(
      "Продолжение работы 2605-100\n\nЗаказ от клиента:\nтекст\n\nНаряд в CRM. Карточка Kaiten: #42",
    );
    expect(out).toBe("Заказ от клиента:\nтекст");
  });
});
