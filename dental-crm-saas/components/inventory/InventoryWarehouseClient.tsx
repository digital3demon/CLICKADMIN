"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { STOCK_MOVEMENT_KIND_LABELS } from "@/lib/inventory/stock-movement-kind-labels";
import {
  PrefixSearchCombobox,
  type PrefixComboboxOption,
} from "@/components/ui/PrefixSearchCombobox";

/** Значение фильтра «производитель не указан» в combobox */
const MANUFACTURER_EMPTY_VALUE = "__MAN_EMPTY__";
/** Значение фильтра «тип склада не задан» */
const WAREHOUSE_TYPE_EMPTY_VALUE = "__WH_TYPE_EMPTY__";

type Warehouse = {
  id: string;
  name: string;
  isDefault: boolean;
  warehouseType: string | null;
  notes?: string | null;
};
type InvItem = {
  id: string;
  warehouseId: string;
  sku: string | null;
  name: string;
  unit: string;
  isActive: boolean;
  unitsPerSupply: number | null;
  manufacturer: string | null;
  /** Справочная цена из конфигурации → Склад (подставляется в приход, можно править). */
  referenceUnitPriceRub: number | null;
  warehouse: { id: string; name: string; warehouseType: string | null };
};

const invComboboxClass =
  "w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-2 text-sm text-[var(--app-text)] cursor-text";
type BalanceRow = {
  id: string;
  quantityOnHand: number;
  averageUnitCostRub: number | null;
  item: {
    id: string;
    sku: string | null;
    name: string;
    unit: string;
    warehouseId?: string;
    manufacturer?: string | null;
    unitsPerSupply?: number | null;
  };
  warehouse: { id: string; name: string };
};
type MovementRow = {
  id: string;
  createdAt: string;
  kind: keyof typeof STOCK_MOVEMENT_KIND_LABELS;
  quantity: number;
  totalCostRub: number | null;
  note: string | null;
  actorLabel: string;
  returnedToWarehouseAt: string | null;
  item: {
    id: string;
    sku: string | null;
    name: string;
    unit: string;
    manufacturer: string | null;
    unitsPerSupply?: number | null;
  };
  warehouse: { id: string; name: string; warehouseType: string | null };
  order: { id: string; orderNumber: string } | null;
};

function canJournalDefect(m: MovementRow): boolean {
  if (m.kind === "SALE_ISSUE") return !m.returnedToWarehouseAt;
  return (
    m.kind === "PURCHASE_RECEIPT" ||
    m.kind === "RETURN_IN" ||
    m.kind === "ADJUSTMENT_PLUS"
  );
}

/** Компенсирующее движение в журнале (не для расхода по наряду — там «Вернуть на склад»). */
function canReverseJournalMovement(m: MovementRow): boolean {
  if (m.kind === "SALE_ISSUE") return false;
  return (
    m.kind === "PURCHASE_RECEIPT" ||
    m.kind === "ADJUSTMENT_PLUS" ||
    m.kind === "ADJUSTMENT_MINUS" ||
    m.kind === "DEFECT_WRITE_OFF" ||
    m.kind === "RETURN_IN"
  );
}

const MOVEMENT_KIND_OPTIONS = Object.entries(STOCK_MOVEMENT_KIND_LABELS) as [
  keyof typeof STOCK_MOVEMENT_KIND_LABELS,
  string,
][];

function formatNum(n: number, frac = 3): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: frac,
  });
}

function formatMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${formatNum(n, 2)} ₽`;
}

function referencePriceInputString(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n < 0) return "";
  return formatNum(n, 2);
}

export function InventoryWarehouseClient() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [items, setItems] = useState<InvItem[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [itemsNeverTouched, setItemsNeverTouched] = useState<
    { id: string; sku: string | null; name: string; unit: string }[]
  >([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showInactiveItems, setShowInactiveItems] = useState(false);
  const [returningMovementId, setReturningMovementId] = useState<string | null>(
    null,
  );
  const [returnError, setReturnError] = useState<string | null>(null);
  const [defectingMovementId, setDefectingMovementId] = useState<string | null>(
    null,
  );
  const [defectError, setDefectError] = useState<string | null>(null);
  const [reversingMovementId, setReversingMovementId] = useState<string | null>(
    null,
  );
  const [reverseError, setReverseError] = useState<string | null>(null);

  const [kind, setKind] =
    useState<keyof typeof STOCK_MOVEMENT_KIND_LABELS>("PURCHASE_RECEIPT");
  const [itemId, setItemId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCostRub, setUnitCostRub] = useState("");
  /** Чтобы не затирать цену при обновлении снимка, пока выбрана та же позиция */
  const purchasePriceItemRef = useRef<string | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [note, setNote] = useState("");
  /** Количество в форме: в единицах учёта или в поставках (× unitsPerSupply) */
  const [quantityInputMode, setQuantityInputMode] = useState<"unit" | "supply">(
    "unit",
  );
  /** Сужает список складов по полю «тип склада» */
  const [warehouseTypeFilter, setWarehouseTypeFilter] = useState("");
  const [manufacturerFilter, setManufacturerFilter] = useState("");

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const snapRes = await fetch("/api/inventory/snapshot");
      if (!snapRes.ok) throw new Error("Склад");
      const snap = (await snapRes.json()) as {
        warehouses: Warehouse[];
        items: InvItem[];
        balances: BalanceRow[];
        itemsNeverTouched: typeof itemsNeverTouched;
        movements: MovementRow[];
      };
      const w = snap.warehouses;
      const i = snap.items;
      const b = {
        balances: snap.balances,
        itemsNeverTouched: snap.itemsNeverTouched,
      };
      const m = snap.movements;
      setWarehouses(w);
      setItems(i);
      setBalances(b.balances);
      setItemsNeverTouched(b.itemsNeverTouched);
      setMovements(
        m.map((row) => ({
          ...row,
          returnedToWarehouseAt:
            row.returnedToWarehouseAt == null
              ? null
              : typeof row.returnedToWarehouseAt === "string"
                ? row.returnedToWarehouseAt
                : new Date(
                    row.returnedToWarehouseAt as unknown as Date,
                  ).toISOString(),
          createdAt:
            typeof row.createdAt === "string"
              ? row.createdAt
              : new Date(row.createdAt as unknown as Date).toISOString(),
        })),
      );
      if (w.length) {
        const def = w.find((x) => x.isDefault) ?? w[0];
        setWarehouseId((prev) => prev || def.id);
      }
    } catch {
      setLoadError("Не удалось загрузить данные склада. Проверьте БД и Prisma.");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const warehousesFilteredByType = useMemo(() => {
    if (!warehouseTypeFilter) return warehouses;
    if (warehouseTypeFilter === WAREHOUSE_TYPE_EMPTY_VALUE) {
      return warehouses.filter((w) => !(w.warehouseType?.trim()));
    }
    return warehouses.filter(
      (w) => (w.warehouseType?.trim() ?? "") === warehouseTypeFilter,
    );
  }, [warehouses, warehouseTypeFilter]);

  useEffect(() => {
    if (!warehousesFilteredByType.some((w) => w.id === warehouseId)) {
      setWarehouseId(warehousesFilteredByType[0]?.id ?? "");
    }
  }, [warehousesFilteredByType, warehouseId]);

  useEffect(() => {
    setManufacturerFilter("");
  }, [warehouseId]);

  const warehouseComboboxOptions = useMemo((): PrefixComboboxOption[] => {
    return warehousesFilteredByType.map((w) => {
      const type = w.warehouseType?.trim();
      const label = type ? `${w.name} (${type})` : w.name;
      const prefixes = [w.name, w.warehouseType ?? "", w.notes ?? ""].filter(
        (s) => s && String(s).trim().length > 0,
      ) as string[];
      return { value: w.id, label, searchPrefixes: prefixes };
    });
  }, [warehousesFilteredByType]);

  const warehouseTypeComboboxOptions = useMemo((): PrefixComboboxOption[] => {
    const opts: PrefixComboboxOption[] = [
      { value: "", label: "Все типы складов", searchPrefixes: ["все"] },
    ];
    const seen = new Set<string>();
    let anyUntyped = false;
    for (const w of warehouses) {
      const t = w.warehouseType?.trim();
      if (!t) anyUntyped = true;
      else seen.add(t);
    }
    if (anyUntyped) {
      opts.push({
        value: WAREHOUSE_TYPE_EMPTY_VALUE,
        label: "Без типа склада",
        searchPrefixes: ["без типа", "не указан"],
      });
    }
    for (const t of [...seen].sort((a, b) => a.localeCompare(b, "ru-RU"))) {
      opts.push({ value: t, label: t, searchPrefixes: [t] });
    }
    return opts;
  }, [warehouses]);

  const manufacturerComboboxOptions = useMemo((): PrefixComboboxOption[] => {
    const opts: PrefixComboboxOption[] = [
      {
        value: "",
        label: "Все производители",
        searchPrefixes: ["все"],
      },
    ];
    if (!warehouseId) return opts;
    const onWh = items.filter((x) => x.warehouseId === warehouseId);
    const distinct = new Set<string>();
    let anyEmpty = false;
    for (const it of onWh) {
      const m = it.manufacturer?.trim();
      if (m) distinct.add(m);
      else anyEmpty = true;
    }
    if (anyEmpty) {
      opts.push({
        value: MANUFACTURER_EMPTY_VALUE,
        label: "(производитель не указан)",
        searchPrefixes: ["не указан", "производитель"],
      });
    }
    for (const m of [...distinct].sort((a, b) => a.localeCompare(b, "ru-RU"))) {
      opts.push({ value: m, label: m, searchPrefixes: [m] });
    }
    return opts;
  }, [items, warehouseId]);

  const filteredItemsForArticle = useMemo(() => {
    const base = showInactiveItems ? items : items.filter((x) => x.isActive);
    let rows = base.filter((x) => x.warehouseId === warehouseId);
    if (manufacturerFilter === MANUFACTURER_EMPTY_VALUE) {
      rows = rows.filter((x) => !(x.manufacturer?.trim()));
    } else if (manufacturerFilter) {
      rows = rows.filter((x) => (x.manufacturer?.trim() ?? "") === manufacturerFilter);
    }
    return rows;
  }, [items, warehouseId, manufacturerFilter, showInactiveItems]);

  const articleComboboxOptions = useMemo((): PrefixComboboxOption[] => {
    return filteredItemsForArticle.map((it) => {
      const sku = it.sku?.trim();
      const inactive = !it.isActive ? " (снята с учёта)" : "";
      const label = `${sku ? `${sku} · ` : ""}${it.name}${inactive}`;
      const prefixes = [it.name, sku ?? "", it.manufacturer?.trim() ?? ""].filter(
        Boolean,
      ) as string[];
      return { value: it.id, label, searchPrefixes: prefixes };
    });
  }, [filteredItemsForArticle]);

  useEffect(() => {
    if (!filteredItemsForArticle.length) {
      setItemId("");
      return;
    }
    if (!filteredItemsForArticle.some((x) => x.id === itemId)) {
      setItemId(filteredItemsForArticle[0]!.id);
    }
  }, [filteredItemsForArticle, itemId]);

  const selectedItem = useMemo(
    () => items.find((x) => x.id === itemId) ?? null,
    [items, itemId],
  );

  useEffect(() => {
    if (kind !== "PURCHASE_RECEIPT") {
      purchasePriceItemRef.current = null;
      return;
    }
    if (!selectedItem) {
      purchasePriceItemRef.current = null;
      setUnitCostRub("");
      return;
    }
    if (purchasePriceItemRef.current !== selectedItem.id) {
      purchasePriceItemRef.current = selectedItem.id;
      setUnitCostRub(referencePriceInputString(selectedItem.referenceUnitPriceRub));
    }
  }, [kind, selectedItem]);

  const submitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setBusy(true);
    try {
      let q = Number(quantity.replace(",", "."));
      if (!Number.isFinite(q) || q <= 0) {
        setFormError("Укажите положительное количество");
        return;
      }
      if (quantityInputMode === "supply") {
        const ups = selectedItem?.unitsPerSupply;
        if (ups == null || !Number.isFinite(ups) || ups <= 0) {
          setFormError(
            "У позиции не задан размер поставки. Задайте «Поставка (шт в упак.)» в конфигурации → Склад.",
          );
          return;
        }
        q *= ups;
      }
      const body: Record<string, unknown> = {
        kind,
        itemId,
        warehouseId,
        quantity: q,
        note: note.trim() || null,
      };
      if (kind === "PURCHASE_RECEIPT") {
        const c = unitCostRub.trim()
          ? Number(unitCostRub.replace(",", "."))
          : 0;
        body.unitCostRub = c;
      }
      if (kind === "SALE_ISSUE") {
        body.orderNumber = orderNumber.trim() || null;
      }
      const res = await fetch("/api/inventory/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFormError(data.error ?? "Ошибка");
        return;
      }
      setNote("");
      if (kind === "PURCHASE_RECEIPT") {
        purchasePriceItemRef.current = null;
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const returnToWarehouse = async (movementId: string) => {
    const ok = window.confirm(
      "Вернуть на склад списанное по наряду количество? Остаток увеличится на эту величину, строка расхода будет помечена как возвращённая.",
    );
    if (!ok) return;
    setReturnError(null);
    setReturningMovementId(movementId);
    try {
      const res = await fetch(
        `/api/inventory/movements/${encodeURIComponent(movementId)}/return-to-warehouse`,
        { method: "POST" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setReturnError(data.error ?? "Не удалось вернуть на склад");
        return;
      }
      await refresh();
    } finally {
      setReturningMovementId(null);
    }
  };

  const defectFromJournal = async (m: MovementRow) => {
    const msg =
      m.kind === "SALE_ISSUE"
        ? "Оформить брак по этой строке расхода по наряду? Будет записан возврат на склад и сразу списание брака той же величины; итоговый остаток по складу останется как после расхода, строка расхода будет помечена как возвращённая."
        : "Списать на брак то же количество с текущего остатка по складу (движение «Брак» в журнале)?";
    if (!window.confirm(msg)) return;
    setDefectError(null);
    setDefectingMovementId(m.id);
    try {
      const res = await fetch(
        `/api/inventory/movements/${encodeURIComponent(m.id)}/defect`,
        { method: "POST" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setDefectError(data.error ?? "Не удалось оформить брак");
        return;
      }
      await refresh();
    } finally {
      setDefectingMovementId(null);
    }
  };

  const reverseJournalMovement = async (movementId: string) => {
    if (
      !window.confirm(
        "Отменить эффект этой строки журнала? Будет создано обратное движение (корректировка). Повторная отмена той же строки не изменит остаток повторно.",
      )
    ) {
      return;
    }
    setReverseError(null);
    setReversingMovementId(movementId);
    try {
      const res = await fetch(
        `/api/inventory/movements/${encodeURIComponent(movementId)}/reverse`,
        { method: "POST" },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setReverseError(data.error ?? "Не удалось отменить");
        return;
      }
      await refresh();
    } finally {
      setReversingMovementId(null);
    }
  };

  return (
    <div className="space-y-10">
      {loadError ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="alert"
        >
          {loadError}
        </div>
      ) : null}

      <p className="text-sm text-[var(--text-secondary)]">
        Новые склады и учётные позиции:{" "}
        <Link
          href="/directory/warehouse"
          className="font-medium text-[var(--sidebar-blue)] hover:underline"
        >
          Конфигурация → Склад
        </Link>
        .
      </p>

      <section className="rounded-xl border border-[var(--card-border)] bg-[var(--surface-muted)] p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-body)]">
          Операция
        </h2>
        <form
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          onSubmit={submitMovement}
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)]">
            Вид
            <select
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-2 text-sm text-[var(--app-text)]"
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as keyof typeof STOCK_MOVEMENT_KIND_LABELS)
              }
            >
              {MOVEMENT_KIND_OPTIONS.map(([k, lab]) => (
                <option key={k} value={k}>
                  {lab}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)]">
            <span id="inv-lbl-warehouse">Склад</span>
            <PrefixSearchCombobox
              aria-labelledby="inv-lbl-warehouse"
              className={invComboboxClass}
              options={warehouseComboboxOptions}
              value={warehouseId}
              onChange={setWarehouseId}
              placeholder="Название склада или тип…"
              emptyOptionLabel="Выбрать склад"
              disabled={!warehouseComboboxOptions.length}
            />
          </div>
          <div className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)]">
            <span id="inv-lbl-manufacturer">Производитель</span>
            <PrefixSearchCombobox
              aria-labelledby="inv-lbl-manufacturer"
              className={invComboboxClass}
              options={manufacturerComboboxOptions}
              value={manufacturerFilter}
              onChange={setManufacturerFilter}
              disabled={!warehouseId}
              placeholder={
                !warehouseId
                  ? "Сначала выберите склад"
                  : "Производитель или «не указан»…"
              }
              emptyOptionLabel="Все производители"
            />
          </div>
          <div className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)]">
            <span id="inv-lbl-wh-type">Тип склада</span>
            <PrefixSearchCombobox
              aria-labelledby="inv-lbl-wh-type"
              className={invComboboxClass}
              options={warehouseTypeComboboxOptions}
              value={warehouseTypeFilter}
              onChange={setWarehouseTypeFilter}
              placeholder="Тип из конфигурации склада…"
              emptyOptionLabel="Все типы складов"
            />
          </div>
          <div className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)] sm:col-span-2 lg:col-span-1">
            <span id="inv-lbl-article">Артикул / позиция</span>
            <PrefixSearchCombobox
              aria-labelledby="inv-lbl-article"
              className={invComboboxClass}
              options={articleComboboxOptions}
              value={itemId}
              onChange={setItemId}
              disabled={!warehouseId || articleComboboxOptions.length === 0}
              placeholder={
                !warehouseId
                  ? "Сначала выберите склад"
                  : articleComboboxOptions.length === 0
                    ? "Нет позиций по фильтрам"
                    : "Артикул или название…"
              }
              emptyOptionLabel="Выбрать позицию"
            />
          </div>
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              Количество
            </span>
            <div className="flex min-h-[2.625rem] flex-wrap items-center gap-x-2 gap-y-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-[var(--text-body)]">
                <label className="inline-flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="qty-mode"
                    checked={quantityInputMode === "unit"}
                    onChange={() => setQuantityInputMode("unit")}
                  />
                  В {selectedItem?.unit?.trim() || "ед."} учёта
                </label>
                <label className="inline-flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="qty-mode"
                    checked={quantityInputMode === "supply"}
                    onChange={() => setQuantityInputMode("supply")}
                    disabled={
                      selectedItem?.unitsPerSupply == null ||
                      !Number.isFinite(selectedItem.unitsPerSupply) ||
                      selectedItem.unitsPerSupply <= 0
                    }
                  />
                  Поставками
                  {selectedItem?.unitsPerSupply != null &&
                  Number.isFinite(selectedItem.unitsPerSupply) &&
                  selectedItem.unitsPerSupply > 0
                    ? ` (×${formatNum(selectedItem.unitsPerSupply, 0)})`
                    : ""}
                </label>
              </div>
              <input
                type="text"
                inputMode="decimal"
                aria-label="Значение количества"
                className="h-9 w-[5.5rem] shrink-0 rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 text-sm sm:w-24"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            {quantityInputMode === "supply" ? (
              <p className="mt-1 text-[11px] leading-snug text-[var(--text-muted)]">
                В журнал попадёт количество в единицах учёта: введённое число ×
                размер поставки. Стоимость при закупке по-прежнему за единицу
                учёта.
              </p>
            ) : null}
          </div>
          {kind === "PURCHASE_RECEIPT" ? (
            <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)]">
              <span>Цена закупки за ед., ₽</span>
              <input
                type="text"
                inputMode="decimal"
                className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-2 text-sm"
                value={unitCostRub}
                onChange={(e) => setUnitCostRub(e.target.value)}
                placeholder={
                  selectedItem?.referenceUnitPriceRub != null &&
                  Number.isFinite(selectedItem.referenceUnitPriceRub)
                    ? `из конфиг.: ${formatNum(selectedItem.referenceUnitPriceRub, 2)}`
                    : "0 — задайте в конфигурации → Склад"
                }
              />
              <span className="font-normal text-[11px] leading-snug text-[var(--text-muted)]">
                Подставляется справочная цена позиции из конфигурации; поле можно изменить перед
                проводкой.
              </span>
            </label>
          ) : null}
          {kind === "SALE_ISSUE" ? (
            <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)] sm:col-span-2">
              Номер наряда (YYMM-NNN)
              <input
                type="text"
                className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-2 text-sm"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="2604-002"
              />
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)] sm:col-span-2 xl:col-span-4">
            Комментарий
            <input
              type="text"
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-2 text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <button
              type="submit"
              disabled={busy || !itemId || !warehouseId}
              className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
            >
              Записать движение
            </button>
            {formError ? (
              <span className="text-sm text-red-600">{formError}</span>
            ) : null}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-[var(--card-border)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-body)]">
            Остатки
          </h2>
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={showInactiveItems}
              onChange={(e) => setShowInactiveItems(e.target.checked)}
            />
            Показывать снятые с учёта
          </label>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <th className="py-2 pr-3 font-medium">Склад</th>
                <th className="py-2 pr-3 font-medium">Позиция</th>
                <th className="py-2 pr-3 font-medium">Остаток</th>
                <th className="py-2 font-medium">Средняя закуп., ₽</th>
              </tr>
            </thead>
            <tbody>
              {balances.map((r) => (
                <tr key={r.id} className="border-b border-[var(--border-subtle)]">
                  <td className="py-2 pr-3 text-[var(--text-body)]">{r.warehouse.name}</td>
                  <td className="py-2 pr-3">
                    <span className="font-medium text-[var(--app-text)]">{r.item.name}</span>
                    {r.item.sku ? (
                      <span className="ml-2 text-xs text-[var(--text-muted)]">{r.item.sku}</span>
                    ) : null}
                    <span className="ml-1 text-xs text-[var(--text-placeholder)]">{r.item.unit}</span>
                  </td>
                  <td className="py-2 pr-3 tabular-nums">
                    {formatNum(r.quantityOnHand)}
                  </td>
                  <td className="py-2 tabular-nums text-[var(--text-body)]">
                    {formatMoney(r.averageUnitCostRub)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {balances.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">Нет строк остатков.</p>
          ) : null}
        </div>
        {itemsNeverTouched.length > 0 ? (
          <p className="mt-4 text-xs text-[var(--text-muted)]">
            Позиции без движений:{" "}
            {itemsNeverTouched.map((x) => x.name).join(", ")}
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-[var(--card-border)] p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-body)]">
          Журнал движений
        </h2>
        <p className="mt-1 max-w-3xl text-xs leading-snug text-[var(--text-muted)]">
          «Отменить» — ошибочный приход, корректировку, брак или возврат на склад (создаётся
          обратное движение). Расход по наряду отменяется кнопкой «Вернуть на склад».
        </p>
        {returnError ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {returnError}
          </p>
        ) : null}
        {defectError ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {defectError}
          </p>
        ) : null}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[76rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <th className="py-2 pr-2 font-medium">Дата</th>
                <th className="py-2 pr-2 font-medium">Вид</th>
                <th className="min-w-[7rem] py-2 pr-2 font-medium">Склад</th>
                <th className="min-w-[5rem] py-2 pr-2 font-medium">Тип склада</th>
                <th className="min-w-[6rem] py-2 pr-2 font-medium">Производитель</th>
                <th className="min-w-[9rem] py-2 pr-2 font-medium">Наименование</th>
                <th className="min-w-[5rem] py-2 pr-2 font-medium">Артикул</th>
                <th className="py-2 pr-2 font-medium">Кол-во</th>
                <th className="py-2 pr-2 font-medium">Сумма</th>
                <th className="min-w-[5rem] py-2 pr-2 font-medium">Наряд</th>
                <th className="min-w-[5rem] py-2 pr-2 font-medium">Кто</th>
                <th className="min-w-[7rem] py-2 pr-2 font-medium">Примечание</th>
                <th className="movement-actions py-2 pl-2 text-right font-medium">
                  Действие
                </th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => {
                const returned = Boolean(m.returnedToWarehouseAt);
                const showReturn = m.kind === "SALE_ISSUE" && !returned;
                const showDefect = canJournalDefect(m);
                const showReverse = canReverseJournalMovement(m);
                const rowBusy =
                  returningMovementId === m.id ||
                  defectingMovementId === m.id ||
                  reversingMovementId === m.id;
                const rowStrike =
                  returned ? "[&>td:not(.movement-actions)]:line-through opacity-65" : "";
                return (
                  <tr
                    key={m.id}
                    className={`border-b border-[var(--border-subtle)] ${rowStrike}`}
                  >
                    <td className="whitespace-nowrap py-2 pr-2 text-xs text-[var(--text-secondary)]">
                      {new Date(m.createdAt).toLocaleString("ru-RU")}
                    </td>
                    <td className="py-2 pr-2 text-[var(--text-strong)]">
                      {STOCK_MOVEMENT_KIND_LABELS[m.kind] ?? m.kind}
                    </td>
                    <td
                      className="max-w-[10rem] py-2 pr-2 text-[var(--text-body)]"
                      title={m.warehouse.name}
                    >
                      <span className="line-clamp-2 font-medium text-[var(--text-strong)]">
                        {m.warehouse.name}
                      </span>
                    </td>
                    <td
                      className="max-w-[8rem] py-2 pr-2 text-xs text-[var(--text-secondary)]"
                      title={m.warehouse.warehouseType?.trim() ?? undefined}
                    >
                      {m.warehouse.warehouseType?.trim() ? (
                        <span className="line-clamp-2">
                          {m.warehouse.warehouseType.trim()}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td
                      className="max-w-[9rem] py-2 pr-2 text-xs text-[var(--text-secondary)]"
                      title={m.item.manufacturer?.trim() ?? undefined}
                    >
                      {m.item.manufacturer?.trim() ? (
                        <span className="line-clamp-2">{m.item.manufacturer.trim()}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="max-w-[14rem] py-2 pr-2">
                      <div
                        className="font-medium leading-snug text-[var(--text-strong)]"
                        title={m.item.name}
                      >
                        {m.item.name}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--text-placeholder)]">
                        Ед.: {m.item.unit}
                      </div>
                    </td>
                    <td
                      className="max-w-[7rem] py-2 pr-2 font-mono text-xs text-[var(--text-body)]"
                      title={m.item.sku?.trim() ?? undefined}
                    >
                      {m.item.sku?.trim() ? (
                        <span className="line-clamp-2">{m.item.sku.trim()}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">{formatNum(m.quantity)}</td>
                    <td className="py-2 pr-2 tabular-nums">
                      {formatMoney(m.totalCostRub)}
                    </td>
                    <td className="py-2 pr-2">
                      {m.order ? (
                        <Link
                          href={`/orders/${m.order.id}`}
                          className="text-[var(--sidebar-blue)] hover:underline"
                        >
                          {m.order.orderNumber}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td
                      className="max-w-[6rem] py-2 pr-2 text-xs text-[var(--text-secondary)]"
                      title={m.actorLabel?.trim() || undefined}
                    >
                      <span className="line-clamp-2">{m.actorLabel?.trim() || "—"}</span>
                    </td>
                    <td className="max-w-[12rem] py-2 pr-2 text-xs text-[var(--text-muted)]">
                      <span className="line-clamp-3" title={m.note?.trim() || undefined}>
                        {m.note?.trim() ? m.note.trim() : "—"}
                      </span>
                    </td>
                    <td className="movement-actions whitespace-nowrap py-2 pl-2 text-right">
                      {m.kind === "SALE_ISSUE" && returned ? (
                        <span className="text-xs text-[var(--text-muted)]">
                          Возвращено на склад
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {showReturn ? (
                            <button
                              type="button"
                              disabled={rowBusy}
                              onClick={() => void returnToWarehouse(m.id)}
                              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 py-1 text-xs font-medium text-[var(--text-body)] hover:bg-[var(--surface-muted)] disabled:opacity-50"
                            >
                              {returningMovementId === m.id
                                ? "Запись…"
                                : "Вернуть на склад"}
                            </button>
                          ) : null}
                          {showDefect ? (
                            <button
                              type="button"
                              disabled={rowBusy}
                              title={
                                m.kind === "SALE_ISSUE"
                                  ? "Возврат на склад и списание брака (остаток как после расхода)"
                                  : "Списание брака с текущего остатка"
                              }
                              onClick={() => void defectFromJournal(m)}
                              className="rounded-md border border-red-300/80 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-950 hover:bg-red-100/90 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100 dark:hover:bg-red-950/55"
                            >
                              {defectingMovementId === m.id ? "Запись…" : "Брак"}
                            </button>
                          ) : null}
                          {showReverse ? (
                            <button
                              type="button"
                              disabled={rowBusy}
                              title="Создать обратное движение в журнале (идемпотентно)"
                              onClick={() => void reverseJournalMovement(m.id)}
                              className="rounded-md border border-amber-300/80 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-950 hover:bg-amber-100/90 disabled:opacity-50 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/55"
                            >
                              {reversingMovementId === m.id ? "Запись…" : "Отменить"}
                            </button>
                          ) : null}
                          {!showReturn && !showDefect && !showReverse ? "—" : null}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {movements.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">Движений пока нет.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
