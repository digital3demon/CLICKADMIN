"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useFixedDropdownPosition } from "@/components/ui/use-fixed-dropdown-position";
import { comboboxOptionMatchesPrefixQuery } from "@/lib/prefix-search-match";

export type PrefixComboboxOption = {
  value: string;
  label: string;
  /** Доп. префиксы для фильтра (юр. наименование, ООО…); в списке показывается только `label`. */
  searchPrefixes?: string[];
};

type Props = {
  id?: string;
  "aria-labelledby"?: string;
  options: PrefixComboboxOption[];
  value?: string;
  onChange?: (value: string) => void;
  /** Несколько значений: клик по строке добавляет/снимает, список не закрывается. */
  values?: string[];
  onValuesChange?: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Первая строка списка — сброс значения */
  emptyOptionLabel?: string;
  /**
   * Клик по заблокированному полю (disabled input сам не кликается —
   * тогда используем readOnly + этот колбэк, обычно «скопировать»).
   */
  onDisabledClick?: () => void;
  /** Подсказка для режима onDisabledClick */
  disabledTitle?: string;
};

export function PrefixSearchCombobox({
  id,
  "aria-labelledby": ariaLabelledBy,
  options,
  value = "",
  onChange,
  values,
  onValuesChange,
  placeholder = "Начните вводить название или ООО…",
  disabled,
  className = "",
  emptyOptionLabel = "Выбрать из списка",
  onDisabledClick,
  disabledTitle,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const blurCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uid = useId();
  const listboxId = `${uid}-listbox`;

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const pos = useFixedDropdownPosition(open, inputRef, {
    maxListHeight: 240,
    minWidthPx: 200,
  });

  const withEmpty = useMemo(
    (): PrefixComboboxOption[] => [
      { value: "", label: emptyOptionLabel },
      ...options,
    ],
    [options, emptyOptionLabel],
  );

  const isMulti = typeof onValuesChange === "function";
  const selectedSet = useMemo(
    () => new Set(isMulti ? (values ?? []) : value ? [value] : []),
    [isMulti, values, value],
  );

  const valueLabel = useMemo(() => {
    if (!isMulti) {
      return options.find((x) => x.value === value)?.label ?? "";
    }
    const labels = (values ?? [])
      .map((id) => options.find((x) => x.value === id)?.label)
      .filter((x): x is string => Boolean(x));
    if (labels.length === 0) return "";
    if (labels.length === 1) return labels[0]!;
    return `${labels.length} поз.: ${labels.join(", ")}`;
  }, [isMulti, options, value, values]);

  const filtered = useMemo(() => {
    return withEmpty.filter((o) => comboboxOptionMatchesPrefixQuery(o, searchQuery));
  }, [withEmpty, searchQuery]);

  useEffect(() => {
    if (open) {
      setHighlight(0);
    }
  }, [searchQuery, open]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-idx="${highlight}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const displayValue = open ? searchQuery : valueLabel;
  /** disabled + onDisabledClick → readOnly, чтобы ЛКМ доходил до поля. */
  const clickToActivateWhenLocked = Boolean(disabled && onDisabledClick);
  const inputDisabled = Boolean(disabled && !clickToActivateWhenLocked);
  const inputReadOnly = clickToActivateWhenLocked;

  const close = useCallback(() => {
    if (blurCloseTimer.current != null) {
      clearTimeout(blurCloseTimer.current);
      blurCloseTimer.current = null;
    }
    setOpen(false);
    setSearchQuery("");
  }, []);

  const selectValue = useCallback(
    (v: string) => {
      if (isMulti && onValuesChange) {
        if (v === "") {
          onValuesChange([]);
          close();
          return;
        }
        const cur = values ?? [];
        onValuesChange(
          cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v],
        );
        setSearchQuery("");
        return;
      }
      onChange?.(v);
      close();
    },
    [close, isMulti, onChange, onValuesChange, values],
  );

  useEffect(() => {
    return () => {
      if (blurCloseTimer.current != null) {
        clearTimeout(blurCloseTimer.current);
        blurCloseTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPtr = (e: PointerEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener("pointerdown", onPtr);
    return () => document.removeEventListener("pointerdown", onPtr);
  }, [open, close]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || clickToActivateWhenLocked) return;

    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
        setSearchQuery("");
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }

    const max = Math.max(0, filtered.length - 1);

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
    if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) selectValue(opt.value);
      return;
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        disabled={inputDisabled}
        readOnly={inputReadOnly}
        aria-disabled={clickToActivateWhenLocked || undefined}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={
          open && filtered.length > 0 && filtered[highlight]
            ? `${listboxId}-opt-${highlight}`
            : undefined
        }
        aria-labelledby={ariaLabelledBy}
        autoComplete="off"
        spellCheck={false}
        title={
          clickToActivateWhenLocked
            ? (disabledTitle ?? "Нажмите — скопировать в буфер обмена")
            : undefined
        }
        className={
          clickToActivateWhenLocked
            ? `${className} cursor-pointer`.trim()
            : className
        }
        value={displayValue}
        placeholder={!valueLabel && !open ? placeholder : undefined}
        onChange={(e) => {
          if (disabled || clickToActivateWhenLocked) return;
          if (!open) {
            setOpen(true);
            setSearchQuery(e.target.value);
          } else {
            setSearchQuery(e.target.value);
          }
        }}
        onClick={() => {
          if (clickToActivateWhenLocked) onDisabledClick?.();
        }}
        onFocus={() => {
          if (disabled || clickToActivateWhenLocked) return;
          if (blurCloseTimer.current != null) {
            clearTimeout(blurCloseTimer.current);
            blurCloseTimer.current = null;
          }
          setOpen(true);
          setSearchQuery("");
        }}
        onBlur={() => {
          if (clickToActivateWhenLocked) return;
          blurCloseTimer.current = setTimeout(() => {
            blurCloseTimer.current = null;
            const ae = document.activeElement;
            if (wrapRef.current?.contains(ae)) return;
            if (listRef.current?.contains(ae)) return;
            setOpen(false);
            setSearchQuery("");
          }, 120);
        }}
        onKeyDown={onKeyDown}
      />
      {typeof document !== "undefined" &&
      open &&
      !disabled &&
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
            zIndex: 10000,
          }}
          className="overflow-auto rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] py-1 text-sm shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-2.5 py-2 text-[var(--text-muted)]">Совпадений нет</li>
          ) : (
            filtered.map((o, i) => (
              <li
                key={o.value === "" ? "__empty__" : o.value}
                id={`${listboxId}-opt-${i}`}
                data-idx={i}
                role="option"
                aria-selected={
                  o.value ? selectedSet.has(o.value) : selectedSet.size === 0
                }
                className={`cursor-pointer px-2.5 py-1.5 ${
                  i === highlight ? "bg-[var(--accent-selection-bg)] text-[var(--app-text)]" : "text-[var(--text-strong)]"
                }`}
                onMouseEnter={() => setHighlight(i)}
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (blurCloseTimer.current != null) {
                    clearTimeout(blurCloseTimer.current);
                    blurCloseTimer.current = null;
                  }
                  selectValue(o.value);
                }}
              >
                {isMulti && o.value
                  ? `${selectedSet.has(o.value) ? "✓ " : ""}${o.label}`
                  : o.label}
              </li>
            ))
          )}
        </ul>,
        document.body,
      )}
    </div>
  );
}
