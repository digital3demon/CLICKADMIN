"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MobileAwareDialog } from "@/components/ui/MobileAwareDialog";
import type { WarehouseTreeArticle } from "@/lib/inventory/warehouse-tree";

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
};

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
}: Props): JSX.Element | null {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [warehouseName, setWarehouseName] = useState("");
  const [warehouseType, setWarehouseType] = useState("");

  const [manufacturerName, setManufacturerName] = useState("");
  const [articleName, setArticleName] = useState("");
  const [sku, setSku] = useState("");
  const [startQty, setStartQty] = useState("");

  const [selectedArticleId, setSelectedArticleId] = useState("");
  const [minusQty, setMinusQty] = useState("");
  const [deactivate, setDeactivate] = useState(false);

  const [plusQty, setPlusQty] = useState("");
  const [plusQtyMode, setPlusQtyMode] = useState<"unit" | "supply">("unit");
  const [unitCostRub, setUnitCostRub] = useState("");
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
    setSku("");
    setStartQty("");
    setMinusQty("");
    setPlusQty("");
    setPlusQtyMode("unit");
    setMinusQtyMode("unit");
    setDeactivate(false);

    if (state.type === "warehouse-minus" || state.type === "manufacturer-minus") {
      const first = state.articles[0];
      setSelectedArticleId(first?.id ?? "");
    } else {
      setSelectedArticleId("");
    }

    if (state.type === "article-plus") {
      setUnitCostRub(referencePriceInputString(state.article.referenceUnitPriceRub));
    } else {
      setUnitCostRub("");
    }
  }, [state]);

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

  const createItemWithOptionalReceipt = async (params: {
    warehouseId: string;
    name: string;
    manufacturer?: string | null;
    sku?: string | null;
    startQuantityRaw: string;
  }) => {
    const itemId = await postItem({
      warehouseId: params.warehouseId,
      name: params.name,
      manufacturer: params.manufacturer ?? null,
      sku: params.sku?.trim() || null,
    });
    const startQ = parseDecimal(params.startQuantityRaw);
    if (startQ != null && startQ > 0) {
      await postMovement({
        kind: "PURCHASE_RECEIPT",
        itemId,
        warehouseId: params.warehouseId,
        quantity: startQ,
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

    let issueUnits = 0;
    if (hasQty) {
      const resolved = resolveQuantityUnits(article, raw, minusQtyMode);
      if (!resolved.ok) throw new Error(resolved.error);
      issueUnits = resolved.quantity;
      if (issueUnits > article.quantityOnHand) {
        throw new Error("Нельзя списать больше, чем остаток на складе");
      }
      await postMovement({
        kind: "MANUAL_ISSUE",
        itemId: article.id,
        warehouseId,
        quantity: issueUnits,
      });
    }

    if (deactivate) {
      await patchDeactivate(article.id);
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
          await createItemWithOptionalReceipt({
            warehouseId: state.warehouseId,
            name,
            manufacturer,
            sku,
            startQuantityRaw: startQty,
          });
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
              <input
                type="text"
                className={inputClass}
                value={manufacturerName}
                onChange={(e) => setManufacturerName(e.target.value)}
                autoFocus
              />
            </label>
            <label className={labelClass}>
              <span>Первая позиция</span>
              <input
                type="text"
                className={inputClass}
                value={articleName}
                onChange={(e) => setArticleName(e.target.value)}
              />
            </label>
            <label className={labelClass}>
              <span>Артикул (необязательно)</span>
              <input
                type="text"
                className={inputClass}
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </label>
          </>
        ) : null}

        {showArticleFields ? (
          <>
            <label className={labelClass}>
              <span>Наименование</span>
              <input
                type="text"
                className={inputClass}
                value={articleName}
                onChange={(e) => setArticleName(e.target.value)}
                autoFocus
              />
            </label>
            {state.type === "warehouse-plus" ? (
              <label className={labelClass}>
                <span>Производитель (необязательно)</span>
                <input
                  type="text"
                  className={inputClass}
                  value={manufacturerName}
                  onChange={(e) => setManufacturerName(e.target.value)}
                />
              </label>
            ) : null}
            <label className={labelClass}>
              <span>Артикул (необязательно)</span>
              <input
                type="text"
                className={inputClass}
                value={sku}
                onChange={(e) => setSku(e.target.value)}
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
          <>
            <QuantityModeField
              article={state.article}
              mode={plusQtyMode}
              onModeChange={setPlusQtyMode}
              quantity={plusQty}
              onQuantityChange={setPlusQty}
            />
            <label className={labelClass}>
              <span>Цена закупки за ед., ₽</span>
              <input
                type="text"
                inputMode="decimal"
                className={inputClass}
                value={unitCostRub}
                onChange={(e) => setUnitCostRub(e.target.value)}
                placeholder={
                  state.article.referenceUnitPriceRub != null
                    ? `из справочника: ${formatNum(state.article.referenceUnitPriceRub, 2)}`
                    : "0"
                }
              />
            </label>
          </>
        ) : null}

        {showMinusFields ? (
          <>
            {state.type === "warehouse-minus" ||
            state.type === "manufacturer-minus" ? (
              <label className={labelClass}>
                <span>Позиция</span>
                <select
                  className={inputClass}
                  value={selectedArticleId}
                  onChange={(e) => setSelectedArticleId(e.target.value)}
                >
                  {minusArticles.length === 0 ? (
                    <option value="">Нет позиций</option>
                  ) : (
                    minusArticles.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                        {a.sku ? ` (${a.sku})` : ""} — {formatNum(a.quantityOnHand)}{" "}
                        {a.unit}
                      </option>
                    ))
                  )}
                </select>
              </label>
            ) : null}

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
