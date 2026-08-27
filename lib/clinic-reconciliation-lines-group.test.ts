import { describe, expect, it } from "vitest";
import { groupReconciliationLinesByOrder } from "@/lib/clinic-reconciliation-lines-group";

describe("groupReconciliationLinesByOrder", () => {
  it("несколько позиций одного наряда — один блок, кириллица на месте", () => {
    const groups = groupReconciliationLinesByOrder([
      { orderId: "a", description: "7202 Аппарат Шварца" },
      { orderId: "b", description: "7154 Кольцо ТИТАН" },
      { orderId: "a", description: "7302 Добавка на расширяющего" },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.map((x) => x.description)).toEqual([
      "7202 Аппарат Шварца",
      "7302 Добавка на расширяющего",
    ]);
    expect(groups[1]![0]!.description).toBe("7154 Кольцо ТИТАН");
  });
});
