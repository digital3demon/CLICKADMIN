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

function allWarehouseArticles(
  warehouse: WarehouseTreeWarehouse,
): WarehouseTreeArticle[] {
  return [
    ...warehouse.manufacturers.flatMap((m) => m.articles),
    ...warehouse.orphanArticles,
  ];
}

/** Ряд карточек: заполняют ширину контейнера, затем второй ряд. */
function CardWrapRow({
  center,
  children,
}: {
  center?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`flex w-full flex-wrap gap-4 ${
        center ? "justify-center" : "justify-start"
      }`}
    >
      {children}
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
  const [expandedWarehouseId, setExpandedWarehouseId] = useState<string | null>(
    null,
  );
  const [expandedManufacturerKey, setExpandedManufacturerKey] = useState<
    string | null
  >(null);
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
    if (!query) {
      setExpandedWarehouseId(null);
      setExpandedManufacturerKey(null);
      return;
    }
    const { warehouseIds, manufacturerKeys } = collectExpandKeys(displayTree);
    setExpandedWarehouseId(warehouseIds[0] ?? null);
    setExpandedManufacturerKey(manufacturerKeys[0] ?? null);
  }, [query, displayTree]);

  const expandedWarehouse =
    displayTree.find((w) => w.id === expandedWarehouseId) ?? null;
  const expandedManufacturer =
    expandedWarehouse?.manufacturers.find(
      (m) => m.key === expandedManufacturerKey,
    ) ?? null;

  const toggleWarehouse = (warehouseId: string) => {
    setExpandedWarehouseId((prev) => {
      if (prev === warehouseId) {
        setExpandedManufacturerKey(null);
        return null;
      }
      setExpandedManufacturerKey(null);
      return warehouseId;
    });
  };

  const toggleManufacturer = (manufacturerKey: string) => {
    setExpandedManufacturerKey((prev) =>
      prev === manufacturerKey ? null : manufacturerKey,
    );
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

  const renderManufacturerCard = (
    manufacturer: WarehouseTreeManufacturer,
    warehouseType: string | null,
  ) => {
    const expanded = expandedManufacturerKey === manufacturer.key;
    const dimSiblings = expandedManufacturerKey != null && !expanded;
    return (
      <WarehouseTreeCard
        key={manufacturer.key}
        level="manufacturer"
        title={manufacturer.name}
        highlighted={hits.has(`mf:${manufacturer.key}`)}
        expanded={expanded}
        dimmed={dimSiblings}
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
    );
  };

  const dimOtherWarehouses = expandedWarehouseId != null;

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

      <div className="flex w-full min-w-0 flex-col gap-6">
        <CardWrapRow>
          {displayTree.map((warehouse) => {
            const expanded = warehouse.id === expandedWarehouseId;
            return (
              <WarehouseTreeCard
                key={warehouse.id}
                level="warehouse"
                title={warehouse.name}
                highlighted={hits.has(`wh:${warehouse.id}`)}
                expanded={expanded}
                dimmed={dimOtherWarehouses && !expanded}
                onOpen={() => toggleWarehouse(warehouse.id)}
                metrics={[
                  { label: "Всего", value: formatNum(warehouse.quantityOnHand) },
                  { label: "Позиций", value: formatNum(warehouse.itemCount, 0) },
                  {
                    label: "Производителей",
                    value: formatNum(warehouse.manufacturerCount, 0),
                  },
                  {
                    label: "Артикулов",
                    value: formatNum(warehouse.articleCount, 0),
                  },
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
            );
          })}
          <WarehouseTreeGhostCard
            level="warehouse"
            label="Добавить склад"
            onClick={() => setModalState({ type: "create-warehouse" })}
          />
        </CardWrapRow>

        {expandedWarehouse ? (
          <CardWrapRow center>
            {expandedWarehouse.manufacturers.length > 0 ? (
              <>
                {expandedWarehouse.manufacturers.map((manufacturer) =>
                  renderManufacturerCard(
                    manufacturer,
                    expandedWarehouse.warehouseType,
                  ),
                )}
                {expandedWarehouse.orphanArticles.map((article) =>
                  renderArticleCard(article, expandedWarehouse.warehouseType),
                )}
                <WarehouseTreeGhostCard
                  level="manufacturer"
                  label="Добавить производителя"
                  onClick={() =>
                    setModalState({
                      type: "create-manufacturer",
                      warehouseId: expandedWarehouse.id,
                      warehouseType: expandedWarehouse.warehouseType,
                    })
                  }
                />
              </>
            ) : (
              <>
                {expandedWarehouse.orphanArticles.map((article) =>
                  renderArticleCard(article, expandedWarehouse.warehouseType),
                )}
                <WarehouseTreeGhostCard
                  level="article"
                  label="Добавить артикул"
                  onClick={() =>
                    setModalState({
                      type: "create-article",
                      warehouseId: expandedWarehouse.id,
                      manufacturer: null,
                      warehouseType: expandedWarehouse.warehouseType,
                    })
                  }
                />
              </>
            )}
          </CardWrapRow>
        ) : null}

        {expandedWarehouse && expandedManufacturer ? (
          <CardWrapRow center>
            {expandedManufacturer.articles.map((article) =>
              renderArticleCard(article, expandedWarehouse.warehouseType),
            )}
            <WarehouseTreeGhostCard
              level="article"
              label="Добавить артикул"
              onClick={() =>
                setModalState({
                  type: "create-article",
                  warehouseId: expandedManufacturer.warehouseId,
                  manufacturer: expandedManufacturer.name,
                  warehouseType: expandedWarehouse.warehouseType,
                })
              }
            />
          </CardWrapRow>
        ) : null}

        {displayTree.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
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
