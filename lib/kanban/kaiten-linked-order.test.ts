import { describe, expect, it } from "vitest";
import { resolveLinkedOrderKanbanTitle } from "@/lib/kanban/kaiten-linked-order";

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
