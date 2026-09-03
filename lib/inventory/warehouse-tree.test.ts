import { describe, expect, it } from "vitest";
import {
  UNGROUPED_GROUP_NAME,
  buildWarehouseTree,
  collectExpandKeys,
  filterWarehouseTree,
  isInventoryGroupNameTaken,
  manufacturerTreeKey,
  ungroupedManufacturerGroupId,
  ungroupedWarehouseGroupId,
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

describe("inventory groups", () => {
  const groups = [
    {
      id: "g-wh-14",
      warehouseId: "wh-main",
      ownerKind: "WAREHOUSE" as const,
      ownerKey: "",
      name: "14мм",
      manufacturerKeys: ["ооо керамко"],
    },
    {
      id: "g-mf-a",
      warehouseId: "wh-main",
      ownerKind: "MANUFACTURER" as const,
      ownerKey: "ооо керамко",
      name: "Циркон",
      itemIds: ["item-1"],
    },
    {
      id: "g-mf-b",
      warehouseId: "wh-main",
      ownerKind: "MANUFACTURER" as const,
      ownerKey: "ооо керамко",
      name: "Общее",
      itemIds: ["item-1"],
    },
  ];

  it("имя группы уникально только среди соседей родителя", () => {
    expect(
      isInventoryGroupNameTaken(groups, {
        warehouseId: "wh-main",
        ownerKind: "WAREHOUSE",
        ownerKey: "",
        name: "14мм",
      }),
    ).toBe(true);
    expect(
      isInventoryGroupNameTaken(groups, {
        warehouseId: "wh-spare",
        ownerKind: "WAREHOUSE",
        ownerKey: "",
        name: "14мм",
      }),
    ).toBe(false);
    expect(
      isInventoryGroupNameTaken(groups, {
        warehouseId: "wh-main",
        ownerKind: "MANUFACTURER",
        ownerKey: "dentium",
        name: "Циркон",
      }),
    ).toBe(false);
  });

  it("артикул может быть в двух группах производителя; кириллица в имени", () => {
    const tree = buildWarehouseTree({ ...sampleSnapshot(), groups });
    const mf = tree.find((w) => w.id === "wh-main")!.manufacturers[0];
    expect(mf.groups.map((g) => g.name).sort()).toEqual(["Общее", "Циркон"]);
    const article = mf.articles[0];
    expect(article.groupIds.sort()).toEqual(["g-mf-a", "g-mf-b"]);
    expect(mf.warehouseGroupIds).toEqual(["g-wh-14"]);

    const byCyrillic = filterWarehouseTree(tree, "циркон");
    expect(byCyrillic[0].manufacturers[0].groups.some((g) => g.name === "Циркон")).toBe(
      true,
    );
    expect(warehouseTreeSearchHits(tree, "14мм")).toEqual(new Set(["gr:g-wh-14"]));
  });

  it("карточка «не сгруппировано» только если есть члены вне групп", () => {
    const tree = buildWarehouseTree({ ...sampleSnapshot(), groups });
    const main = tree.find((w) => w.id === "wh-main")!;
    const ungroupedWh = main.groups.find((g) => g.isVirtualUngrouped);
    expect(ungroupedWh).toBeDefined();
    expect(ungroupedWh!.name).toBe(UNGROUPED_GROUP_NAME);
    expect(ungroupedWh!.id).toBe(ungroupedWarehouseGroupId("wh-main"));
    expect(ungroupedWh!.manufacturerKeys).toEqual([]);
    expect(ungroupedWh!.articleIds).toEqual(["item-2"]);

    const mf = main.manufacturers[0];
    expect(mf.groups.some((g) => g.isVirtualUngrouped)).toBe(false);

    const spare = tree.find((w) => w.id === "wh-spare")!;
    expect(spare.groups).toHaveLength(1);
    expect(spare.groups[0].isVirtualUngrouped).toBe(true);
    expect(spare.groups[0].manufacturerKeys).toEqual(["dentium"]);

    const allGrouped = buildWarehouseTree({
      ...sampleSnapshot(),
      items: sampleSnapshot().items.filter((it) => it.id !== "item-2"),
      groups: [
        ...groups,
        {
          id: "g-wh-spare",
          warehouseId: "wh-spare",
          ownerKind: "WAREHOUSE" as const,
          ownerKey: "",
          name: "Импланты",
          manufacturerKeys: ["dentium"],
        },
      ],
    });
    expect(
      allGrouped
        .find((w) => w.id === "wh-main")!
        .groups.some((g) => g.isVirtualUngrouped),
    ).toBe(false);
    expect(
      allGrouped
        .find((w) => w.id === "wh-spare")!
        .groups.some((g) => g.isVirtualUngrouped),
    ).toBe(false);
  });

  it("не сгруппировано у производителя, если артикул без группы; кириллица вокруг имени", () => {
    const tree = buildWarehouseTree({
      ...sampleSnapshot(),
      items: [
        ...sampleSnapshot().items,
        {
          id: "item-extra",
          warehouseId: "wh-main",
          name: "Масса обжиг",
          sku: null,
          unit: "г",
          manufacturer: "ООО Керамко",
          isActive: true,
          unitsPerSupply: null,
          referenceUnitPriceRub: null,
        },
      ],
      groups,
    });
    const mf = tree.find((w) => w.id === "wh-main")!.manufacturers[0];
    const ungrouped = mf.groups.find((g) => g.isVirtualUngrouped);
    expect(ungrouped?.name).toBe(UNGROUPED_GROUP_NAME);
    expect(ungrouped?.articleIds).toEqual(["item-extra"]);
    expect(ungrouped?.id).toBe(ungroupedManufacturerGroupId(mf.key));

    const filtered = filterWarehouseTree(tree, "сгруппировано");
    expect(
      filtered[0].manufacturers[0].groups.some((g) => g.isVirtualUngrouped),
    ).toBe(true);
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
