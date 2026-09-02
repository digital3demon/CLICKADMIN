import { describe, expect, it } from "vitest";
import {
  buildWarehouseTree,
  collectExpandKeys,
  filterWarehouseTree,
  manufacturerTreeKey,
  warehouseTreeSearchHits,
} from "@/lib/inventory/warehouse-tree";

function sampleSnapshot() {
  return {
    warehouses: [
      {
        id: "wh-main",
        name: "Основной",
        warehouseType: "production",
        isActive: true,
      },
      {
        id: "wh-spare",
        name: "Запасной",
        warehouseType: "storage",
        isActive: true,
      },
      {
        id: "wh-old",
        name: "Архив",
        warehouseType: null,
        isActive: false,
      },
    ],
    items: [
      {
        id: "item-1",
        warehouseId: "wh-main",
        name: "Циркон A3",
        sku: "ZR-A3",
        unit: "шт",
        manufacturer: "ООО Керамко",
        isActive: true,
        unitsPerSupply: 1,
        referenceUnitPriceRub: 1200,
      },
      {
        id: "item-2",
        warehouseId: "wh-main",
        name: "Абатмент M2",
        sku: null,
        unit: "шт",
        manufacturer: "  ",
        isActive: true,
        unitsPerSupply: null,
        referenceUnitPriceRub: null,
      },
      {
        id: "item-3",
        warehouseId: "wh-spare",
        name: "Винт титановый",
        sku: "SC-TI-01",
        unit: "шт",
        manufacturer: "Dentium",
        isActive: true,
        unitsPerSupply: 10,
        referenceUnitPriceRub: 50,
      },
      {
        id: "item-inactive",
        warehouseId: "wh-main",
        name: "Скрытая позиция",
        sku: "HIDDEN",
        unit: "шт",
        manufacturer: "ООО Керамко",
        isActive: false,
        unitsPerSupply: null,
        referenceUnitPriceRub: null,
      },
    ],
    balances: [
      { itemId: "item-1", warehouseId: "wh-main", quantityOnHand: 5 },
      { item: { id: "item-2" }, warehouseId: "wh-main", quantityOnHand: 2 },
      { itemId: "item-3", warehouseId: "wh-spare", quantityOnHand: 100 },
    ],
  };
}

describe("buildWarehouseTree", () => {
  it("группирует по складу и производителю, сироты без производителя", () => {
    const tree = buildWarehouseTree(sampleSnapshot());
    expect(tree).toHaveLength(2);
    expect(tree.map((w) => w.id)).toEqual(["wh-spare", "wh-main"]);

    const main = tree.find((w) => w.id === "wh-main")!;
    expect(main.articleCount).toBe(2);
    expect(main.manufacturerCount).toBe(1);
    expect(main.quantityOnHand).toBe(7);
    expect(main.manufacturers).toHaveLength(1);
    expect(main.manufacturers[0].name).toBe("ООО Керамко");
    expect(main.manufacturers[0].articleCount).toBe(1);
    expect(main.manufacturers[0].quantityOnHand).toBe(5);
    expect(main.orphanArticles).toHaveLength(1);
    expect(main.orphanArticles[0].name).toBe("Абатмент M2");
    expect(main.orphanArticles[0].quantityOnHand).toBe(2);
  });

  it("пропускает неактивные склады и позиции", () => {
    const tree = buildWarehouseTree(sampleSnapshot());
    expect(tree.some((w) => w.id === "wh-old")).toBe(false);
    const main = tree.find((w) => w.id === "wh-main")!;
    expect(main.articles).toBeUndefined();
    expect(
      [...main.manufacturers.flatMap((m) => m.articles), ...main.orphanArticles].some(
        (a) => a.id === "item-inactive",
      ),
    ).toBe(false);
  });
});

describe("filterWarehouseTree", () => {
  it("пустой запрос возвращает дерево без изменений", () => {
    const tree = buildWarehouseTree(sampleSnapshot());
    expect(filterWarehouseTree(tree, "")).toBe(tree);
    expect(filterWarehouseTree(tree, "   ")).toBe(tree);
  });

  it("кириллица до и после совпадения — производитель ООО Керамко, запрос керам", () => {
    const tree = buildWarehouseTree(sampleSnapshot());
    const filtered = filterWarehouseTree(tree, "керам");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("wh-main");
    expect(filtered[0].manufacturers).toHaveLength(1);
    expect(filtered[0].manufacturers[0].name).toBe("ООО Керамко");
    expect(filtered[0].orphanArticles).toHaveLength(0);
  });

  it("два склада — поиск оставляет только ветку с совпадением", () => {
    const tree = buildWarehouseTree(sampleSnapshot());
    const filtered = filterWarehouseTree(tree, "dentium");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("wh-spare");
    expect(filtered[0].manufacturers[0].articles[0].sku).toBe("SC-TI-01");
  });

  it("совпадение по sku", () => {
    const tree = buildWarehouseTree(sampleSnapshot());
    const filtered = filterWarehouseTree(tree, "zr-a3");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].manufacturers[0].articles).toHaveLength(1);
    expect(filtered[0].manufacturers[0].articles[0].name).toBe("Циркон A3");
  });
});

describe("warehouseTreeSearchHits", () => {
  it("возвращает id только узлов с совпадением в собственных полях", () => {
    const tree = buildWarehouseTree(sampleSnapshot());
    const hits = warehouseTreeSearchHits(tree, "керам");
    expect(hits).toEqual(
      new Set([`mf:${manufacturerTreeKey("wh-main", "ООО Керамко")}`]),
    );
  });

  it("sku match → ar: id", () => {
    const tree = buildWarehouseTree(sampleSnapshot());
    const hits = warehouseTreeSearchHits(tree, "sc-ti");
    expect(hits).toEqual(new Set(["ar:item-3"]));
  });

  it("пустой запрос → пустой набор", () => {
    const tree = buildWarehouseTree(sampleSnapshot());
    expect(warehouseTreeSearchHits(tree, "")).toEqual(new Set());
  });
});

describe("collectExpandKeys", () => {
  it("собирает id складов и ключи производителей из отфильтрованного дерева", () => {
    const tree = buildWarehouseTree(sampleSnapshot());
    const filtered = filterWarehouseTree(tree, "керам");
    const keys = collectExpandKeys(filtered);
    expect(keys.warehouseIds).toEqual(["wh-main"]);
    expect(keys.manufacturerKeys).toEqual([
      manufacturerTreeKey("wh-main", "ООО Керамко"),
    ]);
  });
});
