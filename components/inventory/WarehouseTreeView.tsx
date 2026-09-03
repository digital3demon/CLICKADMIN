"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  manufacturerOwnerKey,
  moveMemberBetweenGroups,
} from "@/lib/inventory/inventory-groups";
import {
  buildWarehouseTree,
  collectExpandKeys,
  filterWarehouseTree,
  warehouseTreeSearchHits,
  type WarehouseTreeArticle,
  type WarehouseTreeGroup,
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
import {
  WarehouseGroupKanban,
  type WarehouseKanbanMember,
} from "@/components/inventory/WarehouseGroupKanban";

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
    saleUnitPriceRub: number | null;
  }[];
  balances: {
    quantityOnHand: number;
    averageUnitCostRub?: number | null;
    item: { id: string };
    warehouse: { id: string };
  }[];
  groups: {
    id: string;
    warehouseId: string;
    ownerKind: "WAREHOUSE" | "MANUFACTURER";
    ownerKey: string;
    name: string;
    manufacturerKeys: string[];
    manufacturerNames?: Record<string, string>;
    itemIds: string[];
  }[];
  onRefresh: () => Promise<void>;
  searchQuery: string;
};

type ChildMode = "groups" | "members";

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
  groups,
  onRefresh,
  searchQuery,
}: WarehouseTreeViewProps) {
  const [expandedWarehouseId, setExpandedWarehouseId] = useState<string | null>(
    null,
  );
  const [expandedManufacturerKey, setExpandedManufacturerKey] = useState<
    string | null
  >(null);
  const [expandedWarehouseGroupId, setExpandedWarehouseGroupId] = useState<
    string | null
  >(null);
  const [expandedManufacturerGroupId, setExpandedManufacturerGroupId] =
    useState<string | null>(null);
  const [warehouseModes, setWarehouseModes] = useState<
    Record<string, ChildMode>
  >({});
  const [manufacturerModes, setManufacturerModes] = useState<
    Record<string, ChildMode>
  >({});
  const [modalState, setModalState] = useState<WarehouseTreeModalState | null>(
    null,
  );
  const [groupMoveBusy, setGroupMoveBusy] = useState(false);

  const snapshot = useMemo(
    () => ({
      warehouses,
      items,
      balances: balances.map((b) => ({
        quantityOnHand: b.quantityOnHand,
        averageUnitCostRub: b.averageUnitCostRub ?? null,
        itemId: b.item.id,
        warehouseId: b.warehouse.id,
      })),
      groups,
    }),
    [warehouses, items, balances, groups],
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
      setExpandedWarehouseGroupId(null);
      setExpandedManufacturerGroupId(null);
      return;
    }
    const { warehouseIds, manufacturerKeys } = collectExpandKeys(displayTree);
    setExpandedWarehouseId(warehouseIds[0] ?? null);
    setExpandedManufacturerKey(manufacturerKeys[0] ?? null);
    setExpandedWarehouseGroupId(null);
    setExpandedManufacturerGroupId(null);
  }, [query, displayTree]);

  const expandedWarehouse =
    displayTree.find((w) => w.id === expandedWarehouseId) ?? null;
  const expandedManufacturer =
    expandedWarehouse?.manufacturers.find(
      (m) => m.key === expandedManufacturerKey,
    ) ?? null;
  const warehouseChildMode: ChildMode = expandedWarehouseId
    ? (warehouseModes[expandedWarehouseId] ?? "members")
    : "members";
  const manufacturerChildMode: ChildMode = expandedManufacturerKey
    ? (manufacturerModes[expandedManufacturerKey] ?? "members")
    : "members";
  const expandedWarehouseGroup =
    expandedWarehouse?.groups.find((g) => g.id === expandedWarehouseGroupId) ??
    null;
  const expandedManufacturerGroup =
    expandedManufacturer?.groups.find(
      (g) => g.id === expandedManufacturerGroupId,
    ) ?? null;

  const toggleWarehouse = (warehouseId: string) => {
    setExpandedWarehouseId((prev) => {
      if (prev === warehouseId) {
        setExpandedManufacturerKey(null);
        setExpandedWarehouseGroupId(null);
        setExpandedManufacturerGroupId(null);
        setWarehouseModes((modes) => {
          const next = { ...modes };
          delete next[warehouseId];
          return next;
        });
        return null;
      }
      setExpandedManufacturerKey(null);
      setExpandedWarehouseGroupId(null);
      setExpandedManufacturerGroupId(null);
      return warehouseId;
    });
  };

  const toggleManufacturer = (manufacturerKey: string) => {
    setExpandedManufacturerKey((prev) => {
      if (prev === manufacturerKey) {
        setExpandedManufacturerGroupId(null);
        setManufacturerModes((modes) => {
          const next = { ...modes };
          delete next[manufacturerKey];
          return next;
        });
        return null;
      }
      setExpandedManufacturerGroupId(null);
      return manufacturerKey;
    });
  };

  const toggleWarehouseGroup = (groupId: string) => {
    setExpandedWarehouseGroupId((prev) => {
      if (prev === groupId) {
        setExpandedManufacturerKey(null);
        setExpandedManufacturerGroupId(null);
        return null;
      }
      setExpandedManufacturerKey(null);
      setExpandedManufacturerGroupId(null);
      return groupId;
    });
  };

  const flipWarehouseMode = (warehouseId: string) => {
    setWarehouseModes((prev) => {
      const next = prev[warehouseId] === "groups" ? "members" : "groups";
      return { ...prev, [warehouseId]: next };
    });
    setExpandedWarehouseGroupId(null);
    setExpandedManufacturerKey(null);
    setExpandedManufacturerGroupId(null);
  };

  const flipManufacturerMode = (manufacturerKey: string) => {
    setManufacturerModes((prev) => {
      const next = prev[manufacturerKey] === "groups" ? "members" : "groups";
      return { ...prev, [manufacturerKey]: next };
    });
    setExpandedManufacturerGroupId(null);
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
      onRename={(e) => {
        e.stopPropagation();
        setModalState({ type: "rename-article", article });
      }}
      onGroups={(e) => {
        e.stopPropagation();
        const ownerKey = manufacturerOwnerKey(article.manufacturer ?? "");
        const options = groups
          .filter(
            (g) =>
              g.warehouseId === article.warehouseId &&
              g.ownerKind === "MANUFACTURER" &&
              g.ownerKey === ownerKey,
          )
          .map((g) => ({
            id: g.id,
            name: g.name,
            selected: article.groupIds.includes(g.id),
            itemIds: g.itemIds,
          }));
        setModalState({
          type: "assign-article-groups",
          article,
          options,
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
        onRename={(e) => {
          e.stopPropagation();
          setModalState({
            type: "rename-manufacturer",
            warehouseId: manufacturer.warehouseId,
            currentName: manufacturer.name,
            itemIds: manufacturer.articles.map((a) => a.id),
          });
        }}
        modeToggle={{
          label:
            manufacturerModes[manufacturer.key] === "groups"
              ? "Группы"
              : "Артикулы",
          onClick: () => flipManufacturerMode(manufacturer.key),
        }}
        onGroups={(e) => {
          e.stopPropagation();
          const key = manufacturerOwnerKey(manufacturer.name);
          const options = groups
            .filter(
              (g) =>
                g.warehouseId === manufacturer.warehouseId &&
                g.ownerKind === "WAREHOUSE",
            )
            .map((g) => ({
              id: g.id,
              name: g.name,
              selected: g.manufacturerKeys.includes(key),
              manufacturerKeys: g.manufacturerKeys,
              manufacturerNames: g.manufacturerNames ?? {},
            }));
          setModalState({
            type: "assign-manufacturer-groups",
            warehouseId: manufacturer.warehouseId,
            manufacturerName: manufacturer.name,
            manufacturerKey: key,
            options,
          });
        }}
      />
    );
  };

  const renderGroupCard = (
    group: WarehouseTreeGroup,
    warehouseType: string | null,
    manufacturer: WarehouseTreeManufacturer | null,
    kanban?: boolean,
  ) => {
    const expanded =
      group.ownerKind === "WAREHOUSE"
        ? expandedWarehouseGroupId === group.id
        : expandedManufacturerGroupId === group.id;
    const dimSiblings = kanban
      ? false
      : group.ownerKind === "WAREHOUSE"
        ? expandedWarehouseGroupId != null && !expanded
        : expandedManufacturerGroupId != null && !expanded;
    const memberArticles =
      group.ownerKind === "MANUFACTURER"
        ? (manufacturer?.articles.filter((a) =>
            group.articleIds.includes(a.id),
          ) ?? [])
        : (expandedWarehouse?.manufacturers
            .filter((m) =>
              group.manufacturerKeys.includes(manufacturerOwnerKey(m.name)),
            )
            .flatMap((m) => m.articles) ?? []);
    return (
      <WarehouseTreeCard
        key={group.id}
        level="group"
        title={group.name}
        highlighted={hits.has(`gr:${group.id}`)}
        expanded={expanded}
        dimmed={dimSiblings}
        onOpen={() =>
          group.ownerKind === "WAREHOUSE"
            ? toggleWarehouseGroup(group.id)
            : setExpandedManufacturerGroupId((prev) =>
                prev === group.id ? null : group.id,
              )
        }
        metrics={[
          { label: "Всего", value: formatNum(group.quantityOnHand) },
          { label: "В группе", value: formatNum(group.memberCount, 0) },
        ]}
        onPlus={(e) => {
          e.stopPropagation();
          if (group.ownerKind === "WAREHOUSE") {
            setModalState({
              type: "warehouse-plus",
              warehouseId: group.warehouseId,
              warehouseType,
            });
            return;
          }
          setModalState({
            type: "manufacturer-plus",
            warehouseId: group.warehouseId,
            manufacturer: manufacturer?.name ?? "",
            warehouseType,
          });
        }}
        onMinus={(e) => {
          e.stopPropagation();
          if (group.ownerKind === "WAREHOUSE") {
            setModalState({
              type: "warehouse-minus",
              warehouseId: group.warehouseId,
              warehouseType,
              articles: memberArticles,
            });
            return;
          }
          setModalState({
            type: "manufacturer-minus",
            warehouseId: group.warehouseId,
            manufacturer: manufacturer?.name ?? "",
            warehouseType,
            articles: memberArticles,
          });
        }}
        onRename={
          group.isVirtualUngrouped
            ? undefined
            : (e) => {
                e.stopPropagation();
                setModalState({
                  type: "rename-group",
                  groupId: group.id,
                  name: group.name,
                });
              }
        }
      />
    );
  };

  const persistGroupMove = async (args: {
    source: WarehouseTreeGroup;
    dest: WarehouseTreeGroup;
    member: WarehouseKanbanMember;
  }) => {
    if (groupMoveBusy || args.source.id === args.dest.id) return;
    if (args.member.kind === "article" && args.dest.ownerKind === "WAREHOUSE") {
      return;
    }
    if (
      args.member.kind === "manufacturer" &&
      args.dest.ownerKind === "MANUFACTURER"
    ) {
      return;
    }
    const ok = window.confirm(
      `Переложить «${args.member.label}» из «${args.source.name}» в «${args.dest.name}»?`,
    );
    if (!ok) return;

    const sourceApi = groups.find((g) => g.id === args.source.id);
    const destApi = groups.find((g) => g.id === args.dest.id);
    const sourceIds =
      args.member.kind === "manufacturer"
        ? (sourceApi?.manufacturerKeys ?? args.source.manufacturerKeys)
        : (sourceApi?.itemIds ?? args.source.articleIds);
    const destIds =
      args.member.kind === "manufacturer"
        ? (destApi?.manufacturerKeys ?? args.dest.manufacturerKeys)
        : (destApi?.itemIds ?? args.dest.articleIds);
    const next = moveMemberBetweenGroups(
      sourceIds,
      destIds,
      args.member.id,
      Boolean(args.source.isVirtualUngrouped),
      Boolean(args.dest.isVirtualUngrouped),
    );
    if (!next) return;

    setGroupMoveBusy(true);
    try {
      const putMembers = async (
        groupId: string,
        ownerKind: "WAREHOUSE" | "MANUFACTURER",
        memberIds: string[],
      ) => {
        const body =
          ownerKind === "WAREHOUSE"
            ? {
                manufacturerKeys: memberIds,
                manufacturerNames:
                  args.member.kind === "manufacturer"
                    ? {
                        ...(destApi?.manufacturerNames ??
                          sourceApi?.manufacturerNames ??
                          {}),
                        [args.member.id]: args.member.label,
                      }
                    : {},
              }
            : { itemIds: memberIds };
        const res = await fetch(`/api/inventory/groups/${groupId}/members`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(data?.error ?? "Не удалось переложить карточку");
        }
      };
      if (!args.source.isVirtualUngrouped) {
        await putMembers(
          args.source.id,
          args.source.ownerKind,
          next.sourceMemberIds,
        );
      }
      if (!args.dest.isVirtualUngrouped) {
        await putMembers(args.dest.id, args.dest.ownerKind, next.destMemberIds);
      }
      await onRefresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setGroupMoveBusy(false);
    }
  };

  const dimOtherWarehouses = expandedWarehouseId != null;

  return (
    <div className="space-y-4">
      <div className="flex w-full min-w-0 flex-col items-center gap-6">
        <CardWrapRow center>
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
                onRename={(e) => {
                  e.stopPropagation();
                  setModalState({
                    type: "rename-warehouse",
                    warehouseId: warehouse.id,
                    name: warehouse.name,
                  });
                }}
                modeToggle={{
                  label:
                    warehouseModes[warehouse.id] === "groups"
                      ? "Группы"
                      : "Производители",
                  onClick: () => flipWarehouseMode(warehouse.id),
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

        {expandedWarehouse &&
        warehouseChildMode === "groups" &&
        !expandedWarehouseGroup ? (
          <CardWrapRow center>
            {expandedWarehouse.groups.map((group) =>
              renderGroupCard(group, expandedWarehouse.warehouseType, null),
            )}
            <WarehouseTreeGhostCard
              level="group"
              label="Добавить группу"
              onClick={() =>
                setModalState({
                  type: "create-group",
                  warehouseId: expandedWarehouse.id,
                  ownerKind: "WAREHOUSE",
                  ownerKey: "",
                })
              }
            />
          </CardWrapRow>
        ) : null}

        {expandedWarehouse &&
        warehouseChildMode === "groups" &&
        expandedWarehouseGroup ? (
          <WarehouseGroupKanban
            groups={expandedWarehouse.groups}
            renderHeader={(group) =>
              renderGroupCard(group, expandedWarehouse.warehouseType, null, true)
            }
            membersOf={(group) => {
              const manufacturers = expandedWarehouse.manufacturers
                .filter((m) =>
                  group.manufacturerKeys.includes(manufacturerOwnerKey(m.name)),
                )
                .map((m) => ({
                  member: {
                    kind: "manufacturer" as const,
                    id: manufacturerOwnerKey(m.name),
                    label: m.name,
                    dragEnabled: !groupMoveBusy,
                  },
                  node: renderManufacturerCard(
                    m,
                    expandedWarehouse.warehouseType,
                  ),
                }));
              const orphans = expandedWarehouse.orphanArticles
                .filter((article) => group.articleIds.includes(article.id))
                .map((article) => ({
                  member: {
                    kind: "article" as const,
                    id: article.id,
                    label: articleTitle(article),
                    dragEnabled: false,
                  },
                  node: renderArticleCard(
                    article,
                    expandedWarehouse.warehouseType,
                  ),
                }));
              return [...manufacturers, ...orphans];
            }}
            onMove={persistGroupMove}
            onAddGroup={() =>
              setModalState({
                type: "create-group",
                warehouseId: expandedWarehouse.id,
                ownerKind: "WAREHOUSE",
                ownerKey: "",
              })
            }
          />
        ) : null}

        {expandedWarehouse && warehouseChildMode === "members" ? (
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

        {expandedWarehouse &&
        expandedManufacturer &&
        manufacturerChildMode === "groups" &&
        !expandedManufacturerGroup ? (
          <CardWrapRow center>
            {expandedManufacturer.groups.map((group) =>
              renderGroupCard(
                group,
                expandedWarehouse.warehouseType,
                expandedManufacturer,
              ),
            )}
            <WarehouseTreeGhostCard
              level="group"
              label="Добавить группу"
              onClick={() =>
                setModalState({
                  type: "create-group",
                  warehouseId: expandedManufacturer.warehouseId,
                  ownerKind: "MANUFACTURER",
                  ownerKey: manufacturerOwnerKey(expandedManufacturer.name),
                })
              }
            />
          </CardWrapRow>
        ) : null}

        {expandedWarehouse &&
        expandedManufacturer &&
        manufacturerChildMode === "groups" &&
        expandedManufacturerGroup ? (
          <WarehouseGroupKanban
            groups={expandedManufacturer.groups}
            renderHeader={(group) =>
              renderGroupCard(
                group,
                expandedWarehouse.warehouseType,
                expandedManufacturer,
                true,
              )
            }
            membersOf={(group) =>
              expandedManufacturer.articles
                .filter((article) => group.articleIds.includes(article.id))
                .map((article) => ({
                  member: {
                    kind: "article" as const,
                    id: article.id,
                    label: articleTitle(article),
                    dragEnabled: !groupMoveBusy,
                  },
                  node: renderArticleCard(
                    article,
                    expandedWarehouse.warehouseType,
                  ),
                }))
            }
            onMove={persistGroupMove}
            onAddGroup={() =>
              setModalState({
                type: "create-group",
                warehouseId: expandedManufacturer.warehouseId,
                ownerKind: "MANUFACTURER",
                ownerKey: manufacturerOwnerKey(expandedManufacturer.name),
              })
            }
          />
        ) : null}

        {expandedWarehouse &&
        expandedManufacturer &&
        manufacturerChildMode === "members" ? (
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
        items={items.map((it) => {
          const bal = balances.find(
            (b) => b.item.id === it.id && b.warehouse.id === it.warehouseId,
          );
          return {
            ...it,
            averageUnitCostRub: bal?.averageUnitCostRub ?? null,
          };
        })}
      />
    </div>
  );
}
