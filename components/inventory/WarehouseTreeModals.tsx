"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import { MobileAwareDialog } from "@/components/ui/MobileAwareDialog";
import { useFixedDropdownPosition } from "@/components/ui/use-fixed-dropdown-position";
import type { WarehouseTreeArticle } from "@/lib/inventory/warehouse-tree";

type CatalogItem = {
  id: string;
  warehouseId: string;
  name: string;
  sku: string | null;
  manufacturer: string | null;
  isActive: boolean;
  referenceUnitPriceRub?: number | null;
  saleUnitPriceRub?: number | null;
  averageUnitCostRub?: number | null;
};

type SuggestOption = { id?: string; label: string; hint?: string };

export type WarehouseTreeModalState =
  | { type: "create-warehouse" }
  | {
      type: "create-manufacturer";
      warehouseId: string;
      warehouseType: string | null;
    }
  | {
      type: "create-article";
      warehouseId: string;
      manufacturer: string | null;
      warehouseType: string | null;
    }
  | {
      type: "warehouse-plus";
      warehouseId: string;
      warehouseType: string | null;
    }
  | {
      type: "warehouse-minus";
      warehouseId: string;
      warehouseType: string | null;
      articles: WarehouseTreeArticle[];
    }
  | {
      type: "manufacturer-plus";
      warehouseId: string;
      manufacturer: string;
      warehouseType: string | null;
    }
  | {
      type: "manufacturer-minus";
      warehouseId: string;
      manufacturer: string;
      warehouseType: string | null;
      articles: WarehouseTreeArticle[];
    }
  | {
      type: "article-plus";
      article: WarehouseTreeArticle;
      warehouseType: string | null;
    }
  | {
      type: "article-minus";
      article: WarehouseTreeArticle;
      warehouseType: string | null;
    };

type Props = {
  state: WarehouseTreeModalState | null;
  onClose: () => void;
  onDone: () => Promise<void>;
  items: CatalogItem[];
};

function uniqueSortedLabels(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const t = raw?.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.sort((a, b) => a.localeCompare(b, "ru"));
}

function CreatableSuggestField({
  value,
  onChange,
  options,
  placeholder,
  autoFocus,
  allowCreate = true,
}: {
  value: string;
  onChange: (next: string, picked?: SuggestOption) => void;
  options: SuggestOption[];
  placeholder?: string;
  autoFocus?: boolean;
  allowCreate?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const uid = useId();
  const listboxId = `${uid}-listbox`;
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const pos = useFixedDropdownPosition(open, inputRef, {
    maxListHeight: 220,
    minWidthPx: 200,
  });

  const q = value.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return options.slice(0, 40);
    return options
      .filter((o) => {
        const hay = `${o.label} ${o.hint ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 40);
  }, [options, q]);

  const exact = options.some((o) => o.label.trim().toLowerCase() === q);
  const createLabel =
    allowCreate && q && !exact
      ? `Сохранить как новое: ${value.trim()}`
      : null;
  const rows: Array<{ key: string; option?: SuggestOption; text: string }> = [
    ...filtered.map((o) => ({
      key: o.id ?? `lbl:${o.label}`,
      option: o,
      text: o.hint ? `${o.label} · ${o.hint}` : o.label,
    })),
    ...(createLabel
      ? [{ key: "__new__", option: undefined, text: createLabel }]
      : []),
  ];

  useEffect(() => {
    setHighlight(0);
  }, [value, open]);

  const pick = (row: (typeof rows)[number]) => {
    if (row.key === "__new__") {
      onChange(value.trim());
    } else if (row.option) {
      onChange(row.option.label, row.option);
    }
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
        className={inputClass}
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => {
            if (listRef.current?.contains(document.activeElement)) return;
            setOpen(false);
          }, 120);
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
            e.preventDefault();
            setOpen(true);
            return;
          }
          if (!open) return;
          if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            return;
          }
          const max = Math.max(0, rows.length - 1);
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, max));
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
            return;
          }
          if (e.key === "Enter" && rows[highlight]) {
            e.preventDefault();
            pick(rows[highlight]!);
          }
        }}
      />
      {typeof document !== "undefined" &&
      open &&
      rows.length > 0 &&
      createPortal(
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: pos.width,
            maxHeight: pos.maxHeight,
            zIndex: 11000,
          }}
          className="overflow-auto rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] py-1 text-sm shadow-lg"
        >
          {rows.map((row, i) => (
            <li
              key={row.key}
              role="option"
              aria-selected={i === highlight}
              className={`cursor-pointer px-2.5 py-1.5 ${
                i === highlight
                  ? "bg-[var(--accent-selection-bg)] text-[var(--app-text)]"
                  : "text-[var(--text-strong)]"
              }`}
              onMouseEnter={() => setHighlight(i)}
              onPointerDown={(e) => {
                e.preventDefault();
                pick(row);
              }}
            >
              {row.text}
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </div>
  );
}

function OrderSuggestField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [remote, setRemote] = useState<SuggestOption[]>([]);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setRemote([]);
      return;
    }
    const t = window.setTimeout(() => {
      void fetch(`/api/orders/search-suggest?q=${encodeURIComponent(q)}`)
        .then((res) =>
          res.ok ? (res.json() as Promise<{ items?: { value: string; kind: string }[] }>) : { items: [] },
        )
        .then((data) => {
          const orders = (data.items ?? []).filter((x) => x.kind === "order");
          setRemote(orders.map((x) => ({ label: x.value })));
        })
        .catch(() => setRemote([]));
    }, 220);
    return () => window.clearTimeout(t);
  }, [value]);

  return (
    <CreatableSuggestField
      value={value}
      onChange={(next) => onChange(next)}
      options={remote}
      placeholder="Номер наряда — поиск"
      allowCreate
    />
  );
}

const inputClass =
  "rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 py-2 text-sm";
const labelClass =
  "flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)]";

function formatNum(n: number, frac = 3): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: frac,
  });
}

function purchaseFromHistory(it: {
  averageUnitCostRub?: number | null;
  referenceUnitPriceRub?: number | null;
}): number | null {
  const avg = it.averageUnitCostRub;
  if (avg != null && Number.isFinite(avg) && avg > 0) return avg;
  const ref = it.referenceUnitPriceRub;
  if (ref != null && Number.isFinite(ref) && ref > 0) return ref;
  return null;
}

function referencePriceInputString(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n) || n < 0) return "";
  return formatNum(n, 2);
}

function parseDecimal(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number.parseFloat(trimmed);
  return Number.isFinite(n) ? n : null;
}

function warehouseTypeDescription(warehouseType: string | null): string | undefined {
  const t = warehouseType?.trim();
  return t ? `Тип склада: ${t}` : undefined;
}

async function readApiError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? "Ошибка";
  } catch {
    return "Ошибка";
  }
}

function QuantityModeField({
  article,
  mode,
  onModeChange,
  quantity,
  onQuantityChange,
}: {
  article: WarehouseTreeArticle;
  mode: "unit" | "supply";
  onModeChange: (mode: "unit" | "supply") => void;
  quantity: string;
  onQuantityChange: (value: string) => void;
}) {
  const supplyEnabled =
    article.unitsPerSupply != null &&
    Number.isFinite(article.unitsPerSupply) &&
    article.unitsPerSupply > 0;

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[var(--text-secondary)]">
        Количество
      </span>
      <div className="flex min-h-[2.625rem] flex-wrap items-center gap-x-2 gap-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-[var(--text-body)]">
          <label className="inline-flex cursor-pointer items-center gap-1.5">
            <input
              type="radio"
              name="qty-mode"
              checked={mode === "unit"}
              onChange={() => onModeChange("unit")}
            />
            В {article.unit?.trim() || "ед."} учёта
          </label>
          {supplyEnabled ? (
            <label className="inline-flex cursor-pointer items-center gap-1.5">
              <input
                type="radio"
                name="qty-mode"
                checked={mode === "supply"}
                onChange={() => onModeChange("supply")}
              />
              Поставками (×{formatNum(article.unitsPerSupply!, 0)})
            </label>
          ) : null}
        </div>
        <input
          type="text"
          inputMode="decimal"
          aria-label="Значение количества"
          className="h-9 w-[5.5rem] shrink-0 rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2 text-sm sm:w-24"
          value={quantity}
          onChange={(e) => onQuantityChange(e.target.value)}
        />
      </div>
      {mode === "supply" && supplyEnabled ? (
        <p className="text-[11px] leading-snug text-[var(--text-muted)]">
          В журнал попадёт количество в единицах учёта: введённое число × размер
          поставки.
        </p>
      ) : null}
    </div>
  );
}

function resolveQuantityUnits(
  article: WarehouseTreeArticle,
  rawQty: string,
  mode: "unit" | "supply",
): { ok: true; quantity: number } | { ok: false; error: string } {
  const q = parseDecimal(rawQty);
  if (q == null || q <= 0) {
    return { ok: false, error: "Укажите положительное количество" };
  }
  if (mode === "supply") {
    const ups = article.unitsPerSupply;
    if (ups == null || !Number.isFinite(ups) || ups <= 0) {
      return {
        ok: false,
        error:
          "У позиции не задан размер поставки. Укажите количество в единицах учёта.",
      };
    }
    return { ok: true, quantity: q * ups };
  }
  return { ok: true, quantity: q };
}

export function WarehouseTreeModals({
  state,
  onClose,
  onDone,
  items,
}: Props): ReactElement | null {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [warehouseName, setWarehouseName] = useState("");
  const [warehouseType, setWarehouseType] = useState("");

  const [manufacturerName, setManufacturerName] = useState("");
  const [articleName, setArticleName] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [sku, setSku] = useState("");
  const [startQty, setStartQty] = useState("");

  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [minusPositionQuery, setMinusPositionQuery] = useState("");
  const [minusManufacturerFilter, setMinusManufacturerFilter] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [minusQty, setMinusQty] = useState("");
  const [deactivate, setDeactivate] = useState(false);

  const [plusQty, setPlusQty] = useState("");
  const [plusQtyMode, setPlusQtyMode] = useState<"unit" | "supply">("unit");
  const [unitCostRub, setUnitCostRub] = useState("");
  const [saleUnitRub, setSaleUnitRub] = useState("");
  const [priceBaseline, setPriceBaseline] = useState<{
    purchase: number | null;
    sale: number | null;
  }>({ purchase: null, sale: null });
  const [minusQtyMode, setMinusQtyMode] = useState<"unit" | "supply">("unit");

  const minusArticles = useMemo(() => {
    if (!state) return [];
    if (state.type === "warehouse-minus" || state.type === "manufacturer-minus") {
      return [...state.articles].sort((a, b) =>
        a.name.localeCompare(b.name, "ru"),
      );
    }
    return [];
  }, [state]);

  const selectedMinusArticle = useMemo(
    () => minusArticles.find((a) => a.id === selectedArticleId) ?? null,
    [minusArticles, selectedArticleId],
  );

  useEffect(() => {
    if (!state) return;
    setBusy(false);
    setError(null);
    setWarehouseName("");
    setWarehouseType("");
    setManufacturerName("");
    setArticleName("");
    setSelectedItemId(null);
    setSku("");
    setStartQty("");
    setMinusQty("");
    setPlusQty("");
    setPlusQtyMode("unit");
    setMinusQtyMode("unit");
    setDeactivate(false);
    setOrderNumber("");
    setMinusPositionQuery("");

    if (state.type === "warehouse-minus" || state.type === "manufacturer-minus") {
      setSelectedArticleId("");
      setMinusManufacturerFilter(
        state.type === "manufacturer-minus" ? state.manufacturer : "",
      );
    } else {
      setSelectedArticleId("");
      setMinusManufacturerFilter(
        state.type === "article-minus"
          ? state.article.manufacturer?.trim() ?? ""
          : "",
      );
    }

    if (state.type === "article-plus" || state.type === "article-minus") {
      const purchase = purchaseFromHistory(state.article);
      const sale = state.article.saleUnitPriceRub;
      setUnitCostRub(referencePriceInputString(purchase));
      setSaleUnitRub(referencePriceInputString(sale));
      setPriceBaseline({ purchase, sale: sale ?? null });
    } else {
      setUnitCostRub("");
      setSaleUnitRub("");
      setPriceBaseline({ purchase: null, sale: null });
    }
  }, [state]);

  useEffect(() => {
    if (!selectedItemId) return;
    if (
      !state ||
      (state.type !== "warehouse-plus" &&
        state.type !== "create-article" &&
        state.type !== "manufacturer-plus" &&
        state.type !== "create-manufacturer")
    ) {
      return;
    }
    const it = items.find((x) => x.id === selectedItemId);
    if (!it) return;
    const purchase = purchaseFromHistory(it);
    const sale = it.saleUnitPriceRub ?? null;
    setUnitCostRub(referencePriceInputString(purchase));
    setSaleUnitRub(referencePriceInputString(sale));
    setPriceBaseline({ purchase, sale });
  }, [selectedItemId, state, items]);

  const catalogWarehouseId =
    state && "warehouseId" in state ? state.warehouseId : null;
  const catalogManufacturerHint =
    state && "manufacturer" in state ? state.manufacturer : null;

  const warehouseItems = useMemo(() => {
    return items.filter(
      (it) =>
        it.isActive !== false &&
        (!catalogWarehouseId || it.warehouseId === catalogWarehouseId),
    );
  }, [items, catalogWarehouseId]);

  const manufacturerOptions = useMemo(
    (): SuggestOption[] =>
      uniqueSortedLabels(warehouseItems.map((it) => it.manufacturer)).map(
        (label) => ({ label }),
      ),
    [warehouseItems],
  );

  const articleOptions = useMemo((): SuggestOption[] => {
    const mf = (
      catalogManufacturerHint ?? manufacturerName
    )?.trim().toLowerCase();
    return warehouseItems
      .filter((it) => {
        if (!mf) return true;
        return (it.manufacturer ?? "").trim().toLowerCase() === mf;
      })
      .map((it) => ({
        id: it.id,
        label: it.name,
        hint: [it.sku, it.manufacturer].filter(Boolean).join(" · ") || undefined,
      }));
  }, [warehouseItems, catalogManufacturerHint, manufacturerName]);

  const skuOptions = useMemo(
    (): SuggestOption[] =>
      warehouseItems
        .filter((it) => it.sku?.trim())
        .map((it) => ({
          id: it.id,
          label: it.sku!.trim(),
          hint: it.name,
        })),
    [warehouseItems],
  );

  if (!state) return null;

  const dialogMeta = (() => {
    switch (state.type) {
      case "create-warehouse":
        return { title: "Новый склад", description: undefined };
      case "create-manufacturer":
        return {
          title: "Новый производитель",
          description: warehouseTypeDescription(state.warehouseType),
        };
      case "create-article":
        return {
          title: "Новая позиция",
          description: warehouseTypeDescription(state.warehouseType),
        };
      case "warehouse-plus":
        return {
          title: "Приход на склад",
          description: warehouseTypeDescription(state.warehouseType),
        };
      case "warehouse-minus":
        return {
          title: "Списание со склада",
          description: warehouseTypeDescription(state.warehouseType),
        };
      case "manufacturer-plus":
        return {
          title: "Приход",
          description: [
            `Производитель: ${state.manufacturer}`,
            warehouseTypeDescription(state.warehouseType),
          ]
            .filter(Boolean)
            .join(" · "),
        };
      case "manufacturer-minus":
        return {
          title: "Списание",
          description: [
            `Производитель: ${state.manufacturer}`,
            warehouseTypeDescription(state.warehouseType),
          ]
            .filter(Boolean)
            .join(" · "),
        };
      case "article-plus":
        return {
          title: "Приход",
          description: [
            state.article.name,
            warehouseTypeDescription(state.warehouseType),
          ]
            .filter(Boolean)
            .join(" · "),
        };
      case "article-minus":
        return {
          title: "Списание",
          description: [
            state.article.name,
            `Остаток: ${formatNum(state.article.quantityOnHand)} ${state.article.unit}`,
            warehouseTypeDescription(state.warehouseType),
          ]
            .filter(Boolean)
            .join(" · "),
        };
    }
  })();

  const finishSuccess = async () => {
    await onDone();
    onClose();
  };

  const postItem = async (body: Record<string, unknown>): Promise<string> => {
    const res = await fetch("/api/inventory/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(await readApiError(res));
    }
    const data = (await res.json()) as { id: string };
    return data.id;
  };

  const postMovement = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/inventory/movements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(await readApiError(res));
    }
  };

  const patchDeactivate = async (itemId: string) => {
    const res = await fetch(`/api/inventory/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    if (!res.ok) {
      throw new Error(await readApiError(res));
    }
  };

  const patchSaleIfChanged = async (itemId: string) => {
    const sale = parseDecimal(saleUnitRub);
    const prev = priceBaseline.sale;
    if (sale == null && prev == null) return;
    if (sale != null && prev != null && Math.abs(sale - prev) < 0.005) return;
    if (sale == null && prev != null) {
      const res = await fetch(`/api/inventory/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleUnitPriceRub: null }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      return;
    }
    if (sale == null) return;
    const res = await fetch(`/api/inventory/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ saleUnitPriceRub: sale }),
    });
    if (!res.ok) throw new Error(await readApiError(res));
  };

  const receiptExistingIfNeeded = async (
    itemId: string,
    warehouseId: string,
  ) => {
    const startQ = parseDecimal(startQty);
    const cost = parseDecimal(unitCostRub);
    if (startQ != null && startQ > 0) {
      await postMovement({
        kind: "PURCHASE_RECEIPT",
        itemId,
        warehouseId,
        quantity: startQ,
        unitCostRub: cost ?? 0,
      });
    }
    await patchSaleIfChanged(itemId);
  };

  const createItemWithOptionalReceipt = async (params: {
    warehouseId: string;
    name: string;
    manufacturer?: string | null;
    sku?: string | null;
    startQuantityRaw: string;
  }) => {
    const purchase = parseDecimal(unitCostRub);
    const sale = parseDecimal(saleUnitRub);
    const itemId = await postItem({
      warehouseId: params.warehouseId,
      name: params.name,
      manufacturer: params.manufacturer ?? null,
      sku: params.sku?.trim() || null,
      referenceUnitPriceRub: purchase,
      saleUnitPriceRub: sale,
    });
    const startQ = parseDecimal(params.startQuantityRaw);
    if (startQ != null && startQ > 0) {
      await postMovement({
        kind: "PURCHASE_RECEIPT",
        itemId,
        warehouseId: params.warehouseId,
        quantity: startQ,
        unitCostRub: purchase ?? 0,
      });
    }
  };

  const submitMinus = async (
    article: WarehouseTreeArticle,
    warehouseId: string,
  ) => {
    const raw = minusQty.trim();
    const parsed = parseDecimal(raw);
    const hasQty = parsed != null && parsed > 0;

    if (!hasQty && !deactivate) {
      throw new Error("Укажите количество или отметьте снятие с учёта");
    }

    if (deactivate) {
      const ok = window.confirm(
        `Снять «${article.name}» с учёта? Позиция скроется со склада.`,
      );
      if (!ok) {
        throw new Error("Снятие с учёта отменено");
      }
    }

    let issueUnits = 0;
    if (hasQty) {
      const resolved = resolveQuantityUnits(article, raw, minusQtyMode);
      if (!resolved.ok) throw new Error(resolved.error);
      issueUnits = resolved.quantity;
      if (issueUnits > article.quantityOnHand) {
        throw new Error("Нельзя списать больше, чем остаток на складе");
      }
      const order = orderNumber.trim();
      await postMovement({
        kind: order ? "SALE_ISSUE" : "MANUAL_ISSUE",
        itemId: article.id,
        warehouseId,
        quantity: issueUnits,
        ...(order ? { orderNumber: order } : {}),
      });
    }

    if (deactivate) {
      await patchDeactivate(article.id);
    } else {
      await patchSaleIfChanged(article.id);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      switch (state.type) {
        case "create-warehouse": {
          const name = warehouseName.trim();
          if (!name) {
            setError("Укажите название склада");
            return;
          }
          const res = await fetch("/api/inventory/warehouses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              warehouseType: warehouseType.trim() || null,
            }),
          });
          if (!res.ok) {
            setError(await readApiError(res));
            return;
          }
          break;
        }
        case "create-manufacturer": {
          const manufacturer = manufacturerName.trim();
          const name = articleName.trim();
          if (!manufacturer) {
            setError("Укажите производителя");
            return;
          }
          if (!name) {
            setError("Укажите название первой позиции");
            return;
          }
          if (selectedItemId) {
            await receiptExistingIfNeeded(selectedItemId, state.warehouseId);
          } else {
            await createItemWithOptionalReceipt({
              warehouseId: state.warehouseId,
              name,
              manufacturer,
              sku,
              startQuantityRaw: startQty,
            });
          }
          break;
        }
        case "create-article":
        case "warehouse-plus":
        case "manufacturer-plus": {
          const name = articleName.trim();
          if (!name) {
            setError("Укажите наименование");
            return;
          }
          if (selectedItemId) {
            await receiptExistingIfNeeded(selectedItemId, state.warehouseId);
            break;
          }
          await createItemWithOptionalReceipt({
            warehouseId: state.warehouseId,
            name,
            manufacturer:
              state.type === "manufacturer-plus"
                ? state.manufacturer
                : state.type === "create-article"
                  ? state.manufacturer
                  : state.type === "warehouse-plus"
                    ? manufacturerName.trim() || null
                    : null,
            sku,
            startQuantityRaw: startQty,
          });
          break;
        }
        case "warehouse-minus":
        case "manufacturer-minus": {
          if (!selectedMinusArticle) {
            setError("Выберите позицию");
            return;
          }
          await submitMinus(selectedMinusArticle, state.warehouseId);
          break;
        }
        case "article-plus": {
          const resolved = resolveQuantityUnits(
            state.article,
            plusQty,
            plusQtyMode,
          );
          if (!resolved.ok) {
            setError(resolved.error);
            return;
          }
          const cost = parseDecimal(unitCostRub);
          await postMovement({
            kind: "PURCHASE_RECEIPT",
            itemId: state.article.id,
            warehouseId: state.article.warehouseId,
            quantity: resolved.quantity,
            unitCostRub: cost ?? 0,
          });
          await patchSaleIfChanged(state.article.id);
          break;
        }
        case "article-minus": {
          await submitMinus(state.article, state.article.warehouseId);
          break;
        }
      }
      await finishSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  const submitLabel = (() => {
    switch (state.type) {
      case "create-warehouse":
      case "create-manufacturer":
      case "create-article":
        return "Создать";
      case "warehouse-plus":
      case "manufacturer-plus":
      case "article-plus":
        return "Оформить приход";
      case "warehouse-minus":
      case "manufacturer-minus":
      case "article-minus":
        return "Оформить списание";
    }
  })();

  const showArticleFields =
    state.type === "create-article" ||
    state.type === "warehouse-plus" ||
    state.type === "manufacturer-plus";

  const showStartQty =
    state.type === "create-manufacturer" ||
    state.type === "create-article" ||
    state.type === "warehouse-plus" ||
    state.type === "manufacturer-plus";

  const showMinusFields =
    state.type === "warehouse-minus" ||
    state.type === "manufacturer-minus" ||
    state.type === "article-minus";

  const minusArticle =
    state.type === "article-minus"
      ? state.article
      : selectedMinusArticle;

  return (
    <MobileAwareDialog
      open
      onClose={onClose}
      title={dialogMeta.title}
      description={dialogMeta.description}
      size="md"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="rounded-lg border border-[var(--card-border)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)] disabled:opacity-50"
            onClick={onClose}
            disabled={busy}
          >
            Отмена
          </button>
          <button
            type="submit"
            form="warehouse-tree-modal-form"
            className="rounded-lg bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-50"
            disabled={busy}
          >
            {busy ? "Сохранение…" : submitLabel}
          </button>
        </div>
      }
    >
      <form
        id="warehouse-tree-modal-form"
        className="flex flex-col gap-3"
        onSubmit={handleSubmit}
      >
        {state.type === "create-warehouse" ? (
          <>
            <label className={labelClass}>
              <span>Название склада</span>
              <input
                type="text"
                className={inputClass}
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                autoFocus
              />
            </label>
            <label className={labelClass}>
              <span>Тип склада (необязательно)</span>
              <input
                type="text"
                className={inputClass}
                value={warehouseType}
                onChange={(e) => setWarehouseType(e.target.value)}
              />
            </label>
          </>
        ) : null}

        {state.type === "create-manufacturer" ? (
          <>
            <label className={labelClass}>
              <span>Производитель</span>
              <CreatableSuggestField
                value={manufacturerName}
                onChange={(next) => setManufacturerName(next)}
                options={manufacturerOptions}
                placeholder="Найти или ввести нового"
                autoFocus
              />
            </label>
            <label className={labelClass}>
              <span>Первая позиция</span>
              <CreatableSuggestField
                value={articleName}
                onChange={(next, picked) => {
                  setArticleName(next);
                  setSelectedItemId(picked?.id ?? null);
                  if (picked?.hint) {
                    const skuHint = warehouseItems.find((it) => it.id === picked.id)
                      ?.sku;
                    if (skuHint) setSku(skuHint);
                  }
                }}
                options={articleOptions}
                placeholder="Найти или ввести новую"
              />
            </label>
            <label className={labelClass}>
              <span>Артикул (необязательно)</span>
              <CreatableSuggestField
                value={sku}
                onChange={(next, picked) => {
                  setSku(next);
                  if (picked?.id) {
                    setSelectedItemId(picked.id);
                    const it = warehouseItems.find((x) => x.id === picked.id);
                    if (it) {
                      setArticleName(it.name);
                      if (it.manufacturer) setManufacturerName(it.manufacturer);
                    }
                  }
                }}
                options={skuOptions}
                placeholder="Найти или ввести новый"
              />
            </label>
          </>
        ) : null}

        {showArticleFields ? (
          <>
            <label className={labelClass}>
              <span>Наименование</span>
              <CreatableSuggestField
                value={articleName}
                onChange={(next, picked) => {
                  setArticleName(next);
                  setSelectedItemId(picked?.id ?? null);
                  if (picked?.id) {
                    const it = warehouseItems.find((x) => x.id === picked.id);
                    if (it) {
                      if (it.sku) setSku(it.sku);
                      if (it.manufacturer) setManufacturerName(it.manufacturer);
                    }
                  }
                }}
                options={articleOptions}
                placeholder="Найти или ввести новое"
                autoFocus
              />
            </label>
            {state.type === "warehouse-plus" ? (
              <label className={labelClass}>
                <span>Производитель (необязательно)</span>
                <CreatableSuggestField
                  value={manufacturerName}
                  onChange={(next) => {
                    setManufacturerName(next);
                    setSelectedItemId(null);
                  }}
                  options={manufacturerOptions}
                  placeholder="Найти или ввести нового"
                />
              </label>
            ) : null}
            <label className={labelClass}>
              <span>Артикул (необязательно)</span>
              <CreatableSuggestField
                value={sku}
                onChange={(next, picked) => {
                  setSku(next);
                  if (picked?.id) {
                    setSelectedItemId(picked.id);
                    const it = warehouseItems.find((x) => x.id === picked.id);
                    if (it) {
                      setArticleName(it.name);
                      if (it.manufacturer) setManufacturerName(it.manufacturer);
                    }
                  } else {
                    setSelectedItemId(null);
                  }
                }}
                options={skuOptions}
                placeholder="Найти или ввести новый"
              />
            </label>
          </>
        ) : null}

        {showStartQty ? (
          <label className={labelClass}>
            <span>Начальный остаток (необязательно)</span>
            <input
              type="text"
              inputMode="decimal"
              className={inputClass}
              value={startQty}
              onChange={(e) => setStartQty(e.target.value)}
              placeholder="0 — без прихода"
            />
          </label>
        ) : null}

        {state.type === "article-plus" ? (
          <QuantityModeField
            article={state.article}
            mode={plusQtyMode}
            onModeChange={setPlusQtyMode}
            quantity={plusQty}
            onQuantityChange={setPlusQty}
          />
        ) : null}

        {showStartQty ||
        state.type === "article-plus" ||
        showMinusFields ? (
          <>
            <label className={labelClass}>
              <span>Закупка за ед., ₽</span>
              <input
                type="text"
                inputMode="decimal"
                className={inputClass}
                value={unitCostRub}
                onChange={(e) => setUnitCostRub(e.target.value)}
                readOnly={showMinusFields}
                placeholder="из старых приходов"
              />
              <span className="font-normal text-[11px] leading-snug text-[var(--text-muted)]">
                {showMinusFields
                  ? "Себестоимость с прошлых приходов. На списании не меняется."
                  : "Подставляется средняя с прошлых приходов. Правка только у этого прихода; старые движения не пересчитываются."}
              </span>
            </label>
            <label className={labelClass}>
              <span>Реализация за ед., ₽</span>
              <input
                type="text"
                inputMode="decimal"
                className={inputClass}
                value={saleUnitRub}
                onChange={(e) => setSaleUnitRub(e.target.value)}
                placeholder="для сверки / новых списаний"
              />
              <span className="font-normal text-[11px] leading-snug text-[var(--text-muted)]">
                Меняет цену только для новых операций. Уже проведённые списания
                остаются со своей ценой.
              </span>
            </label>
          </>
        ) : null}

        {showMinusFields ? (
          <>
            {state.type === "warehouse-minus" ||
            state.type === "manufacturer-minus" ? (
              <>
                <label className={labelClass}>
                  <span>Производитель</span>
                  <CreatableSuggestField
                    value={minusManufacturerFilter}
                    onChange={(next) => {
                      setMinusManufacturerFilter(next);
                      setSelectedArticleId("");
                      setMinusPositionQuery("");
                    }}
                    options={uniqueSortedLabels(
                      minusArticles.map((a) => a.manufacturer),
                    ).map((label) => ({ label }))}
                    placeholder="Все производители"
                    allowCreate={false}
                  />
                </label>
                <label className={labelClass}>
                  <span>Позиция</span>
                  <CreatableSuggestField
                    value={minusPositionQuery}
                    onChange={(next, picked) => {
                      setMinusPositionQuery(next);
                      if (picked?.id) {
                        setSelectedArticleId(picked.id);
                        const art = minusArticles.find((a) => a.id === picked.id);
                        if (art?.manufacturer) {
                          setMinusManufacturerFilter(art.manufacturer);
                        }
                      } else {
                        setSelectedArticleId("");
                      }
                    }}
                    options={minusArticles
                      .filter((a) => {
                        const mf = minusManufacturerFilter.trim().toLowerCase();
                        if (!mf) return true;
                        return (a.manufacturer ?? "").trim().toLowerCase() === mf;
                      })
                      .map((a) => ({
                        id: a.id,
                        label: a.name,
                        hint: [
                          a.sku,
                          a.manufacturer,
                          `${formatNum(a.quantityOnHand)} ${a.unit}`,
                        ]
                          .filter(Boolean)
                          .join(" · "),
                      }))}
                    placeholder="Поиск позиции"
                    allowCreate={false}
                    autoFocus
                  />
                </label>
              </>
            ) : null}

            {state.type === "article-minus" ? (
              <p className="text-sm text-[var(--text-body)]">
                {state.article.manufacturer?.trim()
                  ? `${state.article.manufacturer} · `
                  : ""}
                {state.article.name}
                {state.article.sku ? ` (${state.article.sku})` : ""}
              </p>
            ) : null}

            <label className={labelClass}>
              <span>Наряд (необязательно)</span>
              <OrderSuggestField
                value={orderNumber}
                onChange={setOrderNumber}
              />
            </label>

            {minusArticle ? (
              <QuantityModeField
                article={minusArticle}
                mode={minusQtyMode}
                onModeChange={setMinusQtyMode}
                quantity={minusQty}
                onQuantityChange={setMinusQty}
              />
            ) : null}

            <label className="flex cursor-pointer items-start gap-2 text-sm text-[var(--text-body)]">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={deactivate}
                onChange={(e) => setDeactivate(e.target.checked)}
              />
              <span>
                Снять позицию с учёта
                {minusArticle ? (
                  <span className="mt-0.5 block text-[11px] leading-snug text-[var(--text-muted)]">
                    Отметьте, чтобы скрыть позицию после списания или если
                    остаток станет нулевым.
                  </span>
                ) : null}
              </span>
            </label>
          </>
        ) : null}

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </MobileAwareDialog>
  );
}
