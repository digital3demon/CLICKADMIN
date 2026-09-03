/**
 * Дерево склада для UI: склады → (группы | производители) → (группы | артикулы).
 * Вход — снимок (warehouses, items, balances, groups) из API/Prisma, без записи в БД.
 * Остатки quantityOnHand берутся из balances; timezone не используется.
 * Неактивные склады и позиции (isActive === false) исключаются при сборке.
 */

export type WarehouseTreeArticle = {
  id: string;
  warehouseId: string;
  name: string;
  sku: string | null;
  unit: string;
  manufacturer: string | null;
  quantityOnHand: number;
  unitsPerSupply: number | null;
  referenceUnitPriceRub: number | null;
  saleUnitPriceRub: number | null;
  /** Средняя закупка с остатка (из старых приходов). */
  averageUnitCostRub: number | null;
  groupIds: string[];
};

export const UNGROUPED_GROUP_NAME = "не сгруппировано";

export type WarehouseTreeGroup = {
  id: string;
  warehouseId: string;
  ownerKind: "WAREHOUSE" | "MANUFACTURER";
  ownerKey: string;
  name: string;
  memberCount: number;
  quantityOnHand: number;
  manufacturerKeys: string[];
  articleIds: string[];
  /** Только UI: нет в БД, появляется если есть члены вне групп. */
  isVirtualUngrouped?: boolean;
};

export function ungroupedWarehouseGroupId(warehouseId: string): string {
  return `ungrouped:wh:${warehouseId}`;
}

export function ungroupedManufacturerGroupId(manufacturerKey: string): string {
  return `ungrouped:mf:${manufacturerKey}`;
}

export type WarehouseTreeManufacturer = {
  key: string;
  warehouseId: string;
  name: string;
  articleCount: number;
  quantityOnHand: number;
  articles: WarehouseTreeArticle[];
  groups: WarehouseTreeGroup[];
  warehouseGroupIds: string[];
};

export type WarehouseTreeWarehouse = {
  id: string;
  name: string;
  warehouseType: string | null;
  itemCount: number;
  manufacturerCount: number;
  articleCount: number;
  quantityOnHand: number;
  manufacturers: WarehouseTreeManufacturer[];
  orphanArticles: WarehouseTreeArticle[];
  groups: WarehouseTreeGroup[];
};

export type WarehouseTreeSnapshot = {
  warehouses: Array<{
    id: string;
    name: string;
    warehouseType: string | null;
    isActive?: boolean;
  }>;
  items: Array<{
    id: string;
    warehouseId: string;
    name: string;
    sku: string | null;
    unit: string;
    manufacturer: string | null;
    isActive: boolean;
    unitsPerSupply: number | null;
    referenceUnitPriceRub: number | null;
    saleUnitPriceRub?: number | null;
  }>;
  balances: Array<{
    itemId?: string;
    item?: { id: string };
    warehouseId: string;
    quantityOnHand: number;
    averageUnitCostRub?: number | null;
  }>;
  groups?: Array<{
    id: string;
    warehouseId: string;
    ownerKind: "WAREHOUSE" | "MANUFACTURER";
    ownerKey: string;
    name: string;
    manufacturerKeys?: string[];
    itemIds?: string[];
  }>;
};

function balanceItemId(
  balance: WarehouseTreeSnapshot["balances"][number],
): string | null {
  if (balance.itemId) return balance.itemId;
  if (balance.item?.id) return balance.item.id;
  return null;
}

function buildBalanceMaps(
  balances: WarehouseTreeSnapshot["balances"],
): { qty: Map<string, number>; avg: Map<string, number> } {
  const qty = new Map<string, number>();
  const avg = new Map<string, number>();
  for (const balance of balances) {
    const itemId = balanceItemId(balance);
    if (!itemId) continue;
    const key = `${itemId}\0${balance.warehouseId}`;
    qty.set(key, (qty.get(key) ?? 0) + balance.quantityOnHand);
    if (
      balance.averageUnitCostRub != null &&
      Number.isFinite(balance.averageUnitCostRub)
    ) {
      avg.set(key, balance.averageUnitCostRub);
    }
  }
  return { qty, avg };
}

function normalizeManufacturerName(name: string): string {
  return name.trim();
}

export function manufacturerTreeKey(
  warehouseId: string,
  manufacturerName: string,
): string {
  return `${warehouseId}\0${normalizeManufacturerName(manufacturerName).toLowerCase()}`;
}

function sortByName<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

function sumQuantity(articles: WarehouseTreeArticle[]): number {
  return articles.reduce((sum, a) => sum + a.quantityOnHand, 0);
}

function manufacturerOwnerKeyFromName(name: string): string {
  return normalizeManufacturerName(name).toLowerCase();
}

function realGroupsOnly(groups: WarehouseTreeGroup[]): WarehouseTreeGroup[] {
  return groups.filter((g) => !g.isVirtualUngrouped);
}

function attachUngroupedManufacturerGroups(
  manufacturer: WarehouseTreeManufacturer,
): WarehouseTreeManufacturer {
  const real = realGroupsOnly(manufacturer.groups);
  const groupedIds = new Set(real.flatMap((g) => g.articleIds));
  const ungrouped = manufacturer.articles.filter((a) => !groupedIds.has(a.id));
  if (ungrouped.length === 0) {
    return { ...manufacturer, groups: sortByName(real) };
  }
  const virtual: WarehouseTreeGroup = {
    id: ungroupedManufacturerGroupId(manufacturer.key),
    warehouseId: manufacturer.warehouseId,
    ownerKind: "MANUFACTURER",
    ownerKey: manufacturerOwnerKeyFromName(manufacturer.name),
    name: UNGROUPED_GROUP_NAME,
    memberCount: ungrouped.length,
    quantityOnHand: sumQuantity(ungrouped),
    manufacturerKeys: [],
    articleIds: ungrouped.map((a) => a.id),
    isVirtualUngrouped: true,
  };
  return { ...manufacturer, groups: [...sortByName(real), virtual] };
}

function attachUngroupedWarehouseGroups(
  warehouse: WarehouseTreeWarehouse,
): WarehouseTreeWarehouse {
  const manufacturers = warehouse.manufacturers.map(
    attachUngroupedManufacturerGroups,
  );
  const real = realGroupsOnly(warehouse.groups);
  const groupedKeys = new Set(real.flatMap((g) => g.manufacturerKeys));
  const ungroupedMfs = manufacturers.filter(
    (m) => !groupedKeys.has(manufacturerOwnerKeyFromName(m.name)),
  );
  const orphans = warehouse.orphanArticles;
  const groups = sortByName(real);
  if (ungroupedMfs.length > 0 || orphans.length > 0) {
    groups.push({
      id: ungroupedWarehouseGroupId(warehouse.id),
      warehouseId: warehouse.id,
      ownerKind: "WAREHOUSE",
      ownerKey: "",
      name: UNGROUPED_GROUP_NAME,
      memberCount: ungroupedMfs.length + orphans.length,
      quantityOnHand:
        ungroupedMfs.reduce((sum, m) => sum + m.quantityOnHand, 0) +
        sumQuantity(orphans),
      manufacturerKeys: ungroupedMfs.map((m) =>
        manufacturerOwnerKeyFromName(m.name),
      ),
      articleIds: orphans.map((a) => a.id),
      isVirtualUngrouped: true,
    });
  }
  return { ...warehouse, manufacturers, groups };
}

export function isInventoryGroupNameTaken(
  groups: NonNullable<WarehouseTreeSnapshot["groups"]>,
  opts: {
    warehouseId: string;
    ownerKind: "WAREHOUSE" | "MANUFACTURER";
    ownerKey: string;
    name: string;
    excludeId?: string;
  },
): boolean {
  const name = opts.name.replace(/\s+/g, " ").trim();
  const ownerKey =
    opts.ownerKind === "WAREHOUSE" ? "" : opts.ownerKey.trim().toLowerCase();
  return groups.some(
    (g) =>
      g.warehouseId === opts.warehouseId &&
      g.ownerKind === opts.ownerKind &&
      (g.ownerKey ?? "") === ownerKey &&
      g.name.replace(/\s+/g, " ").trim() === name &&
      g.id !== opts.excludeId,
  );
}

function buildManufacturer(
  warehouseId: string,
  name: string,
  articles: WarehouseTreeArticle[],
  extras?: {
    groups?: WarehouseTreeGroup[];
    warehouseGroupIds?: string[];
  },
): WarehouseTreeManufacturer {
  const sorted = sortByName(articles);
  return {
    key: manufacturerTreeKey(warehouseId, name),
    warehouseId,
    name,
    articleCount: sorted.length,
    quantityOnHand: sumQuantity(sorted),
    articles: sorted,
    groups: extras?.groups ?? [],
    warehouseGroupIds: extras?.warehouseGroupIds ?? [],
  };
}

function buildWarehouseNode(
  warehouse: WarehouseTreeSnapshot["warehouses"][number],
  articles: WarehouseTreeArticle[],
  rawGroups: NonNullable<WarehouseTreeSnapshot["groups"]>,
): WarehouseTreeWarehouse {
  const byManufacturer = new Map<string, WarehouseTreeArticle[]>();
  const displayNames = new Map<string, string>();
  const orphanArticles: WarehouseTreeArticle[] = [];

  for (const article of articles) {
    const raw = article.manufacturer;
    const trimmed = raw != null ? normalizeManufacturerName(raw) : "";
    if (!trimmed) {
      orphanArticles.push(article);
      continue;
    }
    const key = manufacturerTreeKey(warehouse.id, trimmed);
    if (!displayNames.has(key)) {
      displayNames.set(key, trimmed);
    }
    const bucket = byManufacturer.get(key) ?? [];
    bucket.push(article);
    byManufacturer.set(key, bucket);
  }

  const qtyByArticleId = new Map(articles.map((a) => [a.id, a.quantityOnHand]));
  const qtyByOwnerKey = new Map<string, number>();
  for (const [treeKey, groupArticles] of byManufacturer) {
    const ownerKey = manufacturerOwnerKeyFromName(displayNames.get(treeKey) ?? "");
    qtyByOwnerKey.set(ownerKey, sumQuantity(groupArticles));
  }

  const warehouseGroups: WarehouseTreeGroup[] = [];
  const manufacturerGroupsByOwner = new Map<string, WarehouseTreeGroup[]>();
  const warehouseGroupIdsByOwner = new Map<string, string[]>();

  for (const raw of rawGroups.filter((g) => g.warehouseId === warehouse.id)) {
    if (raw.ownerKind === "WAREHOUSE") {
      const manufacturerKeys = [...new Set(raw.manufacturerKeys ?? [])];
      const quantityOnHand = manufacturerKeys.reduce(
        (sum, key) => sum + (qtyByOwnerKey.get(key) ?? 0),
        0,
      );
      const group: WarehouseTreeGroup = {
        id: raw.id,
        warehouseId: warehouse.id,
        ownerKind: "WAREHOUSE",
        ownerKey: "",
        name: raw.name,
        memberCount: manufacturerKeys.length,
        quantityOnHand,
        manufacturerKeys,
        articleIds: [],
      };
      warehouseGroups.push(group);
      for (const key of manufacturerKeys) {
        const ids = warehouseGroupIdsByOwner.get(key) ?? [];
        ids.push(raw.id);
        warehouseGroupIdsByOwner.set(key, ids);
      }
      continue;
    }

    const articleIds = [...new Set(raw.itemIds ?? [])];
    const quantityOnHand = articleIds.reduce(
      (sum, id) => sum + (qtyByArticleId.get(id) ?? 0),
      0,
    );
    const group: WarehouseTreeGroup = {
      id: raw.id,
      warehouseId: warehouse.id,
      ownerKind: "MANUFACTURER",
      ownerKey: raw.ownerKey,
      name: raw.name,
      memberCount: articleIds.length,
      quantityOnHand,
      manufacturerKeys: [],
      articleIds,
    };
    const bucket = manufacturerGroupsByOwner.get(raw.ownerKey) ?? [];
    bucket.push(group);
    manufacturerGroupsByOwner.set(raw.ownerKey, bucket);
  }

  const manufacturers = sortByName(
    [...byManufacturer.entries()].map(([key, group]) => {
      const display = displayNames.get(key) ?? "";
      const ownerKey = manufacturerOwnerKeyFromName(display);
      return buildManufacturer(warehouse.id, display, group, {
        groups: sortByName(manufacturerGroupsByOwner.get(ownerKey) ?? []),
        warehouseGroupIds: warehouseGroupIdsByOwner.get(ownerKey) ?? [],
      });
    }),
  );
  const sortedOrphans = sortByName(orphanArticles);
  const allArticles = [...articles].sort((a, b) =>
    a.name.localeCompare(b.name, "ru"),
  );

  return attachUngroupedWarehouseGroups({
    id: warehouse.id,
    name: warehouse.name,
    warehouseType: warehouse.warehouseType,
    itemCount: allArticles.length,
    manufacturerCount: manufacturers.length,
    articleCount: allArticles.length,
    quantityOnHand: sumQuantity(allArticles),
    manufacturers,
    orphanArticles: sortedOrphans,
    groups: sortByName(warehouseGroups),
  });
}

export function buildWarehouseTree(
  input: WarehouseTreeSnapshot,
): WarehouseTreeWarehouse[] {
  const { qty: balanceMap, avg: avgMap } = buildBalanceMaps(input.balances);
  const activeWarehouses = input.warehouses.filter((w) => w.isActive !== false);
  const activeItems = input.items.filter((item) => item.isActive !== false);

  const itemsByWarehouse = new Map<string, WarehouseTreeArticle[]>();
  for (const item of activeItems) {
    const balanceKey = `${item.id}\0${item.warehouseId}`;
    const article: WarehouseTreeArticle = {
      id: item.id,
      warehouseId: item.warehouseId,
      name: item.name,
      sku: item.sku,
      unit: item.unit,
      manufacturer: item.manufacturer,
      quantityOnHand: balanceMap.get(balanceKey) ?? 0,
      unitsPerSupply: item.unitsPerSupply,
      referenceUnitPriceRub: item.referenceUnitPriceRub,
      saleUnitPriceRub: item.saleUnitPriceRub ?? null,
      averageUnitCostRub: avgMap.get(balanceKey) ?? null,
      groupIds: [],
    };
    const bucket = itemsByWarehouse.get(item.warehouseId) ?? [];
    bucket.push(article);
    itemsByWarehouse.set(item.warehouseId, bucket);
  }

  const groups = input.groups ?? [];
  const itemGroupIds = new Map<string, string[]>();
  for (const group of groups) {
    if (group.ownerKind !== "MANUFACTURER") continue;
    for (const itemId of group.itemIds ?? []) {
      const ids = itemGroupIds.get(itemId) ?? [];
      ids.push(group.id);
      itemGroupIds.set(itemId, ids);
    }
  }
  for (const bucket of itemsByWarehouse.values()) {
    for (const article of bucket) {
      article.groupIds = itemGroupIds.get(article.id) ?? [];
    }
  }

  return sortByName(
    activeWarehouses.map((warehouse) =>
      buildWarehouseNode(
        warehouse,
        itemsByWarehouse.get(warehouse.id) ?? [],
        groups,
      ),
    ),
  );
}

// \b (word boundary) в JS не считает кириллицу «словесной» — только includes + toLowerCase.
function textMatchesQuery(
  text: string | null | undefined,
  queryLower: string,
): boolean {
  if (!text) return false;
  return text.toLowerCase().includes(queryLower);
}

function articleOwnFieldsMatch(
  article: WarehouseTreeArticle,
  queryLower: string,
): boolean {
  return (
    textMatchesQuery(article.name, queryLower) ||
    textMatchesQuery(article.sku, queryLower)
  );
}

function manufacturerOwnFieldsMatch(
  manufacturer: WarehouseTreeManufacturer,
  queryLower: string,
): boolean {
  return textMatchesQuery(manufacturer.name, queryLower);
}

function groupOwnFieldsMatch(
  group: WarehouseTreeGroup,
  queryLower: string,
): boolean {
  return textMatchesQuery(group.name, queryLower);
}

function warehouseOwnFieldsMatch(
  warehouse: WarehouseTreeWarehouse,
  queryLower: string,
): boolean {
  return (
    textMatchesQuery(warehouse.name, queryLower) ||
    textMatchesQuery(warehouse.warehouseType, queryLower)
  );
}

function filterArticles(
  articles: WarehouseTreeArticle[],
  queryLower: string,
): WarehouseTreeArticle[] {
  return articles.filter((a) => articleOwnFieldsMatch(a, queryLower));
}

function filterManufacturerGroups(
  manufacturer: WarehouseTreeManufacturer,
  articles: WarehouseTreeArticle[],
  queryLower: string,
  keepAll: boolean,
): WarehouseTreeGroup[] {
  const articleIds = new Set(articles.map((a) => a.id));
  return realGroupsOnly(manufacturer.groups).filter((group) => {
    if (keepAll || groupOwnFieldsMatch(group, queryLower)) return true;
    return group.articleIds.some((id) => articleIds.has(id));
  });
}

function filterManufacturerNode(
  manufacturer: WarehouseTreeManufacturer,
  queryLower: string,
): WarehouseTreeManufacturer | null {
  const nameHit = manufacturerOwnFieldsMatch(manufacturer, queryLower);
  const groupHits = manufacturer.groups.filter((g) =>
    groupOwnFieldsMatch(g, queryLower),
  );
  if (nameHit) {
    return attachUngroupedManufacturerGroups(manufacturer);
  }
  const articlesFromGroups = manufacturer.articles.filter((a) =>
    groupHits.some((g) => g.articleIds.includes(a.id)),
  );
  const articles = [
    ...new Map(
      [
        ...filterArticles(manufacturer.articles, queryLower),
        ...articlesFromGroups,
      ].map((a) => [a.id, a]),
    ).values(),
  ];
  if (articles.length === 0 && groupHits.length === 0) return null;
  return attachUngroupedManufacturerGroups(
    buildManufacturer(manufacturer.warehouseId, manufacturer.name, articles, {
      groups: filterManufacturerGroups(
        manufacturer,
        articles,
        queryLower,
        false,
      ),
      warehouseGroupIds: manufacturer.warehouseGroupIds,
    }),
  );
}

function filterWarehouseNode(
  warehouse: WarehouseTreeWarehouse,
  queryLower: string,
): WarehouseTreeWarehouse | null {
  if (warehouseOwnFieldsMatch(warehouse, queryLower)) {
    return warehouse;
  }

  const groupHits = warehouse.groups.filter((g) =>
    groupOwnFieldsMatch(g, queryLower),
  );
  const extraKeys = new Set(groupHits.flatMap((g) => g.manufacturerKeys));

  const manufacturers = warehouse.manufacturers
    .map((m) => {
      const ownerKey = manufacturerOwnerKeyFromName(m.name);
      if (extraKeys.has(ownerKey)) return m;
      return filterManufacturerNode(m, queryLower);
    })
    .filter((m): m is WarehouseTreeManufacturer => m !== null);
  const orphanArticles = filterArticles(warehouse.orphanArticles, queryLower);
  const remainingOwnerKeys = new Set(
    manufacturers.map((m) => manufacturerOwnerKeyFromName(m.name)),
  );
  const groups = realGroupsOnly(warehouse.groups).filter((g) => {
    if (groupOwnFieldsMatch(g, queryLower)) return true;
    return g.manufacturerKeys.some((k) => remainingOwnerKeys.has(k));
  });

  if (
    manufacturers.length === 0 &&
    orphanArticles.length === 0 &&
    groups.length === 0
  ) {
    return null;
  }

  const allArticles = [
    ...manufacturers.flatMap((m) => m.articles),
    ...orphanArticles,
  ];

  return attachUngroupedWarehouseGroups({
    id: warehouse.id,
    name: warehouse.name,
    warehouseType: warehouse.warehouseType,
    itemCount: allArticles.length,
    manufacturerCount: manufacturers.length,
    articleCount: allArticles.length,
    quantityOnHand: sumQuantity(allArticles),
    manufacturers,
    orphanArticles,
    groups,
  });
}

export function filterWarehouseTree(
  tree: WarehouseTreeWarehouse[],
  query: string,
): WarehouseTreeWarehouse[] {
  const queryLower = query.trim().toLowerCase();
  if (!queryLower) return tree;

  return tree
    .map((w) => filterWarehouseNode(w, queryLower))
    .filter((w): w is WarehouseTreeWarehouse => w !== null);
}

export function warehouseTreeSearchHits(
  tree: WarehouseTreeWarehouse[],
  query: string,
): Set<string> {
  const queryLower = query.trim().toLowerCase();
  const hits = new Set<string>();
  if (!queryLower) return hits;

  for (const warehouse of tree) {
    if (warehouseOwnFieldsMatch(warehouse, queryLower)) {
      hits.add(`wh:${warehouse.id}`);
    }
    for (const group of warehouse.groups) {
      if (groupOwnFieldsMatch(group, queryLower)) {
        hits.add(`gr:${group.id}`);
      }
    }
    for (const manufacturer of warehouse.manufacturers) {
      if (manufacturerOwnFieldsMatch(manufacturer, queryLower)) {
        hits.add(`mf:${manufacturer.key}`);
      }
      for (const group of manufacturer.groups) {
        if (groupOwnFieldsMatch(group, queryLower)) {
          hits.add(`gr:${group.id}`);
        }
      }
      for (const article of manufacturer.articles) {
        if (articleOwnFieldsMatch(article, queryLower)) {
          hits.add(`ar:${article.id}`);
        }
      }
    }
    for (const article of warehouse.orphanArticles) {
      if (articleOwnFieldsMatch(article, queryLower)) {
        hits.add(`ar:${article.id}`);
      }
    }
  }

  return hits;
}

export function collectExpandKeys(filteredTree: WarehouseTreeWarehouse[]): {
  warehouseIds: string[];
  manufacturerKeys: string[];
} {
  const warehouseIds: string[] = [];
  const manufacturerKeys: string[] = [];

  for (const warehouse of filteredTree) {
    warehouseIds.push(warehouse.id);
    for (const manufacturer of warehouse.manufacturers) {
      manufacturerKeys.push(manufacturer.key);
    }
  }

  return { warehouseIds, manufacturerKeys };
}
