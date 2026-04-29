"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

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
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Первая строка списка — сброс значения */
  emptyOptionLabel?: string;
};

/** Сравнение «строка начинается с запроса» (кириллица, без учёта регистра). */
function stringStartsWithQuery(hay: string, query: string): boolean {
  const q = query.trim().toLocaleLowerCase("ru-RU");
  if (!q) return true;
  return hay.toLocaleLowerCase("ru-RU").startsWith(q);
}

function optionMatchesPrefixQuery(
  o: PrefixComboboxOption,
  query: string,
): boolean {
  if (stringStartsWithQuery(o.label, query)) return true;
  for (const p of o.searchPrefixes ?? []) {
    const s = p?.trim();
    if (s && stringStartsWithQuery(s, query)) return true;
  }
  return false;
}

export function PrefixSearchCombobox({
  id,
  "aria-labelledby": ariaLabelledBy,
  options,
  value,
  onChange,
  placeholder = "Начните вводить название или ООО…",
  disabled,
  className = "",
  emptyOptionLabel = "Выбрать из списка",
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

  const withEmpty = useMemo(
    (): PrefixComboboxOption[] => [
      { value: "", label: emptyOptionLabel },
      ...options,
    ],
    [options, emptyOptionLabel],
  );

  const valueLabel = useMemo(() => {
    const o = options.find((x) => x.value === value);
    return o?.label ?? "";
  }, [options, value]);

  const filtered = useMemo(() => {
    return withEmpty.filter((o) => optionMatchesPrefixQuery(o, searchQuery));
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
      onChange(v);
      close();
    },
    [onChange, close],
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
      close();
    };
    document.addEventListener("pointerdown", onPtr);
    return () => document.removeEventListener("pointerdown", onPtr);
  }, [open, close]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

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
        disabled={disabled}
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
        className={className}
        value={displayValue}
        placeholder={!valueLabel && !open ? placeholder : undefined}
        onChange={(e) => {
          if (disabled) return;
          if (!open) {
            setOpen(true);
            setSearchQuery(e.target.value);
          } else {
            setSearchQuery(e.target.value);
          }
        }}
        onFocus={() => {
          if (disabled) return;
          if (blurCloseTimer.current != null) {
            clearTimeout(blurCloseTimer.current);
            blurCloseTimer.current = null;
          }
          setOpen(true);
          setSearchQuery("");
        }}
        onBlur={() => {
          blurCloseTimer.current = setTimeout(() => {
            blurCloseTimer.current = null;
            const ae = document.activeElement;
            if (wrapRef.current?.contains(ae)) return;
            setOpen(false);
            setSearchQuery("");
          }, 120);
        }}
        onKeyDown={onKeyDown}
      />
      {open && !disabled ? (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-[100] mt-1 max-h-60 w-full overflow-auto rounded-md border border-[var(--card-border)] bg-[var(--card-bg)] py-1 text-sm shadow-lg"
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
                aria-selected={i === highlight}
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
                {o.label}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
