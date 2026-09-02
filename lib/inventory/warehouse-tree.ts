/**
 * Дерево склада для UI: склады → производители → артикулы.
 * Вход — снимок (warehouses, items, balances) из API/Prisma, без записи в БД.
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
};

export type WarehouseTreeManufacturer = {
  key: string;
  warehouseId: string;
  name: string;
  articleCount: number;
  quantityOnHand: number;
  articles: WarehouseTreeArticle[];
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

function buildManufacturer(
  warehouseId: string,
  name: string,
  articles: WarehouseTreeArticle[],
): WarehouseTreeManufacturer {
  const sorted = sortByName(articles);
  return {
    key: manufacturerTreeKey(warehouseId, name),
    warehouseId,
    name,
    articleCount: sorted.length,
    quantityOnHand: sumQuantity(sorted),
    articles: sorted,
  };
}

function buildWarehouseNode(
  warehouse: WarehouseTreeSnapshot["warehouses"][number],
  articles: WarehouseTreeArticle[],
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

  const manufacturers = sortByName(
    [...byManufacturer.entries()].map(([key, group]) =>
      buildManufacturer(warehouse.id, displayNames.get(key) ?? "", group),
    ),
  );
  const sortedOrphans = sortByName(orphanArticles);
  const allArticles = [...articles].sort((a, b) =>
    a.name.localeCompare(b.name, "ru"),
  );

  return {
    id: warehouse.id,
    name: warehouse.name,
    warehouseType: warehouse.warehouseType,
    itemCount: allArticles.length,
    manufacturerCount: manufacturers.length,
    articleCount: allArticles.length,
    quantityOnHand: sumQuantity(allArticles),
    manufacturers,
    orphanArticles: sortedOrphans,
  };
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
    };
    const bucket = itemsByWarehouse.get(item.warehouseId) ?? [];
    bucket.push(article);
    itemsByWarehouse.set(item.warehouseId, bucket);
  }

  return sortByName(
    activeWarehouses.map((warehouse) =>
      buildWarehouseNode(warehouse, itemsByWarehouse.get(warehouse.id) ?? []),
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

function filterManufacturerNode(
  manufacturer: WarehouseTreeManufacturer,
  queryLower: string,
): WarehouseTreeManufacturer | null {
  if (manufacturerOwnFieldsMatch(manufacturer, queryLower)) {
    return manufacturer;
  }
  const articles = filterArticles(manufacturer.articles, queryLower);
  if (articles.length === 0) return null;
  return buildManufacturer(manufacturer.warehouseId, manufacturer.name, articles);
}

function filterWarehouseNode(
  warehouse: WarehouseTreeWarehouse,
  queryLower: string,
): WarehouseTreeWarehouse | null {
  if (warehouseOwnFieldsMatch(warehouse, queryLower)) {
    return warehouse;
  }

  const manufacturers = warehouse.manufacturers
    .map((m) => filterManufacturerNode(m, queryLower))
    .filter((m): m is WarehouseTreeManufacturer => m !== null);
  const orphanArticles = filterArticles(warehouse.orphanArticles, queryLower);

  if (manufacturers.length === 0 && orphanArticles.length === 0) {
    return null;
  }

  const allArticles = [
    ...manufacturers.flatMap((m) => m.articles),
    ...orphanArticles,
  ];

  return {
    id: warehouse.id,
    name: warehouse.name,
    warehouseType: warehouse.warehouseType,
    itemCount: allArticles.length,
    manufacturerCount: manufacturers.length,
    articleCount: allArticles.length,
    quantityOnHand: sumQuantity(allArticles),
    manufacturers,
    orphanArticles,
  };
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
    for (const manufacturer of warehouse.manufacturers) {
      if (manufacturerOwnFieldsMatch(manufacturer, queryLower)) {
        hits.add(`mf:${manufacturer.key}`);
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
