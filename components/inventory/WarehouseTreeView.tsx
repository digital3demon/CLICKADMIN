"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  buildWarehouseTree,
  collectExpandKeys,
  filterWarehouseTree,
  warehouseTreeSearchHits,
  type WarehouseTreeArticle,
  type WarehouseTreeManufacturer,
  type WarehouseTreeWarehouse,
} from "@/lib/inventory/warehouse-tree";
import {
  WarehouseTreeCard,
  WarehouseTreeGhostCard,
} from "@/components/inventory/WarehouseTreeCard";
import {
  WarehouseTreeModals,
  type WarehouseTreeModalState,
} from "@/components/inventory/WarehouseTreeModals";

type WarehouseTreeViewProps = {
  warehouses: {
    id: string;
    name: string;
    warehouseType: string | null;
    isDefault?: boolean;
    isActive?: boolean;
  }[];
  items: {
    id: string;
    warehouseId: string;
    name: string;
    sku: string | null;
    unit: string;
    manufacturer: string | null;
    isActive: boolean;
    unitsPerSupply: number | null;
    referenceUnitPriceRub: number | null;
  }[];
  balances: {
    quantityOnHand: number;
    item: { id: string };
    warehouse: { id: string };
  }[];
  onRefresh: () => Promise<void>;
};

function formatNum(n: number, frac = 3): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: frac,
  });
}

function articleTitle(article: WarehouseTreeArticle): string {
  const sku = article.sku?.trim();
  return sku ? `${sku} · ${article.name}` : article.name;
}

function allWarehouseArticles(warehouse: WarehouseTreeWarehouse): WarehouseTreeArticle[] {
  return [
    ...warehouse.manufacturers.flatMap((m) => m.articles),
    ...warehouse.orphanArticles,
  ];
}

function TreeConnector({
  cardWidthPx,
  children,
}: {
  cardWidthPx: number;
  children: ReactNode;
}) {
  return (
    <div
      className="mt-3 border-l-2 border-[var(--card-border)]"
      style={{ marginLeft: cardWidthPx / 2 }}
    >
      <div className="-ml-px border-t-2 border-[var(--card-border)] pt-3 pl-3">
        {children}
      </div>
    </div>
  );
}

export function WarehouseTreeView({
  warehouses,
  items,
  balances,
  onRefresh,
}: WarehouseTreeViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedWarehouses, setExpandedWarehouses] = useState<Set<string>>(
    () => new Set(),
  );
  const [expandedManufacturers, setExpandedManufacturers] = useState<Set<string>>(
    () => new Set(),
  );
  const [modalState, setModalState] = useState<WarehouseTreeModalState | null>(
    null,
  );

  const snapshot = useMemo(
    () => ({
      warehouses,
      items,
      balances: balances.map((b) => ({
        quantityOnHand: b.quantityOnHand,
        itemId: b.item.id,
        warehouseId: b.warehouse.id,
      })),
    }),
    [warehouses, items, balances],
  );

  const fullTree = useMemo(() => buildWarehouseTree(snapshot), [snapshot]);

  const query = searchQuery.trim();
  const displayTree = useMemo(
    () => (query ? filterWarehouseTree(fullTree, query) : fullTree),
    [fullTree, query],
  );

  const hits = useMemo(
    () => (query ? warehouseTreeSearchHits(fullTree, query) : new Set<string>()),
    [fullTree, query],
  );

  useEffect(() => {
    if (query) {
      const { warehouseIds, manufacturerKeys } = collectExpandKeys(displayTree);
      setExpandedWarehouses(new Set(warehouseIds));
      setExpandedManufacturers(new Set(manufacturerKeys));
      return;
    }
    setExpandedWarehouses(new Set());
    setExpandedManufacturers(new Set());
  }, [query, displayTree]);

  const toggleWarehouse = (warehouseId: string) => {
    setExpandedWarehouses((prev) => {
      const next = new Set(prev);
      if (next.has(warehouseId)) next.delete(warehouseId);
      else next.add(warehouseId);
      return next;
    });
  };

  const toggleManufacturer = (manufacturerKey: string) => {
    setExpandedManufacturers((prev) => {
      const next = new Set(prev);
      if (next.has(manufacturerKey)) next.delete(manufacturerKey);
      else next.add(manufacturerKey);
      return next;
    });
  };

  const renderArticleCard = (
    article: WarehouseTreeArticle,
    warehouseType: string | null,
  ) => (
    <WarehouseTreeCard
      key={article.id}
      level="article"
      title={articleTitle(article)}
      highlighted={hits.has(`ar:${article.id}`)}
      metrics={[
        {
          label: "Кол-во",
          value: `${formatNum(article.quantityOnHand)} ${article.unit.trim() || "ед."}`,
        },
      ]}
      onPlus={(e) => {
        e.stopPropagation();
        setModalState({
          type: "article-plus",
          article,
          warehouseType,
        });
      }}
      onMinus={(e) => {
        e.stopPropagation();
        setModalState({
          type: "article-minus",
          article,
          warehouseType,
        });
      }}
    />
  );

  const renderManufacturerColumn = (
    manufacturer: WarehouseTreeManufacturer,
    warehouseType: string | null,
  ) => {
    const expanded = expandedManufacturers.has(manufacturer.key);
    return (
      <div key={manufacturer.key} className="flex shrink-0 flex-col">
        <WarehouseTreeCard
          level="manufacturer"
          title={manufacturer.name}
          highlighted={hits.has(`mf:${manufacturer.key}`)}
          expanded={expanded}
          onOpen={() => toggleManufacturer(manufacturer.key)}
          metrics={[
            { label: "Всего", value: formatNum(manufacturer.quantityOnHand) },
            { label: "Артикулов", value: formatNum(manufacturer.articleCount, 0) },
          ]}
          onPlus={(e) => {
            e.stopPropagation();
            setModalState({
              type: "manufacturer-plus",
              warehouseId: manufacturer.warehouseId,
              manufacturer: manufacturer.name,
              warehouseType,
            });
          }}
          onMinus={(e) => {
            e.stopPropagation();
            setModalState({
              type: "manufacturer-minus",
              warehouseId: manufacturer.warehouseId,
              manufacturer: manufacturer.name,
              warehouseType,
              articles: manufacturer.articles,
            });
          }}
        />
        {expanded ? (
          <TreeConnector cardWidthPx={187}>
            <div className="flex min-w-min flex-row items-start gap-3">
              {manufacturer.articles.map((article) =>
                renderArticleCard(article, warehouseType),
              )}
              <WarehouseTreeGhostCard
                level="article"
                label="Добавить артикул"
                onClick={() =>
                  setModalState({
                    type: "create-article",
                    warehouseId: manufacturer.warehouseId,
                    manufacturer: manufacturer.name,
                    warehouseType,
                  })
                }
              />
            </div>
          </TreeConnector>
        ) : null}
      </div>
    );
  };

  const renderWarehouseColumn = (warehouse: WarehouseTreeWarehouse) => {
    const expanded = expandedWarehouses.has(warehouse.id);
    const hasManufacturers = warehouse.manufacturers.length > 0;

    return (
      <div key={warehouse.id} className="flex shrink-0 flex-col">
        <WarehouseTreeCard
          level="warehouse"
          title={warehouse.name}
          highlighted={hits.has(`wh:${warehouse.id}`)}
          expanded={expanded}
          onOpen={() => toggleWarehouse(warehouse.id)}
          metrics={[
            { label: "Всего", value: formatNum(warehouse.quantityOnHand) },
            { label: "Позиций", value: formatNum(warehouse.itemCount, 0) },
            {
              label: "Производителей",
              value: formatNum(warehouse.manufacturerCount, 0),
            },
            { label: "Артикулов", value: formatNum(warehouse.articleCount, 0) },
          ]}
          onPlus={(e) => {
            e.stopPropagation();
            setModalState({
              type: "warehouse-plus",
              warehouseId: warehouse.id,
              warehouseType: warehouse.warehouseType,
            });
          }}
          onMinus={(e) => {
            e.stopPropagation();
            setModalState({
              type: "warehouse-minus",
              warehouseId: warehouse.id,
              warehouseType: warehouse.warehouseType,
              articles: allWarehouseArticles(warehouse),
            });
          }}
        />
        {expanded ? (
          <TreeConnector cardWidthPx={221}>
            {hasManufacturers ? (
              <div className="flex min-w-min flex-row items-start gap-3">
                {warehouse.manufacturers.map((manufacturer) =>
                  renderManufacturerColumn(manufacturer, warehouse.warehouseType),
                )}
                {warehouse.orphanArticles.map((article) =>
                  renderArticleCard(article, warehouse.warehouseType),
                )}
                <WarehouseTreeGhostCard
                  level="manufacturer"
                  label="Добавить производителя"
                  onClick={() =>
                    setModalState({
                      type: "create-manufacturer",
                      warehouseId: warehouse.id,
                      warehouseType: warehouse.warehouseType,
                    })
                  }
                />
              </div>
            ) : (
              <div className="flex min-w-min flex-row items-start gap-3">
                {warehouse.orphanArticles.map((article) =>
                  renderArticleCard(article, warehouse.warehouseType),
                )}
                <WarehouseTreeGhostCard
                  level="article"
                  label="Добавить артикул"
                  onClick={() =>
                    setModalState({
                      type: "create-article",
                      warehouseId: warehouse.id,
                      manufacturer: null,
                      warehouseType: warehouse.warehouseType,
                    })
                  }
                />
              </div>
            )}
          </TreeConnector>
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <label className="flex max-w-md flex-col gap-1 text-xs font-medium text-[var(--text-secondary)]">
        <span>Поиск</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Склад, производитель, артикул…"
          className="w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-2 text-sm text-[var(--app-text)]"
          autoComplete="off"
        />
      </label>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-min flex-row items-start gap-4">
          {displayTree.map((warehouse) => renderWarehouseColumn(warehouse))}
          <WarehouseTreeGhostCard
            level="warehouse"
            label="Добавить склад"
            onClick={() => setModalState({ type: "create-warehouse" })}
          />
        </div>
        {displayTree.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            {fullTree.length === 0
              ? "Нет складов. Добавьте первый склад."
              : "Ничего не найдено по запросу."}
          </p>
        ) : null}
      </div>

      <WarehouseTreeModals
        state={modalState}
        onClose={() => setModalState(null)}
        onDone={onRefresh}
      />
    </div>
  );
}
