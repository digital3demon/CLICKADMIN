"use client";

import { useCallback, useState } from "react";
import {
  DEFAULT_UI_DESIGN,
  writeUiDesignToLocalStorage,
  type UiDesign,
} from "@/lib/ui-design";
import { useUiDesign } from "@/lib/hooks/useUiDesign";
import { Button } from "@/components/ui/Button";

const OPTIONS: { value: UiDesign; title: string; description: string }[] = [
  {
    value: "classic",
    title: "Старый дизайн",
    description: "Текущий интерфейс CRM без изменений.",
  },
  {
    value: "harmony",
    title: "Новый дизайн (Гармония)",
    description:
      "Тёмная slate-палитра, скругления, Lucide-иконки. Светлая тема — в том же стиле.",
  },
];

export function DesignAppearanceClient() {
  const active = useUiDesign();
  const [pending, setPending] = useState<UiDesign | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback(
    async (design: UiDesign) => {
      if (design === active) return;
      setError(null);
      setBusy(true);
      setPending(design);
      try {
        const res = await fetch("/api/me/ui-design", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ design }),
        });
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(j.error ?? "Не удалось сохранить");
          setPending(null);
          setBusy(false);
          return;
        }
        writeUiDesignToLocalStorage(design);
        setPending(null);
        setBusy(false);
      } catch {
        setError("Сеть недоступна");
        setPending(null);
        setBusy(false);
      }
    },
    [active],
  );

  return (
    <div className="max-w-xl space-y-6">
      <p className="text-sm text-[var(--text-secondary)]">
        Выбор сохраняется для вашего пользователя и применяется сразу на всех
        страницах. Старый дизайн остаётся доступен в любой момент.
      </p>

      <div
        className="grid gap-3 sm:grid-cols-2"
        role="radiogroup"
        aria-label="Дизайн интерфейса"
      >
        {OPTIONS.map((opt) => {
          const selected = active === opt.value;
          const isPending = pending === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={busy}
              onClick={() => void apply(opt.value)}
              className={[
                "rounded-2xl border p-4 text-left transition",
                selected
                  ? "border-[var(--sidebar-blue)] bg-[var(--accent-selection-bg)] ring-2 ring-[var(--sidebar-blue)]/30"
                  : "border-[var(--card-border)] bg-[var(--card-bg)] hover:border-[var(--sidebar-blue)]/50",
                busy && !isPending ? "opacity-60" : "",
              ].join(" ")}
            >
              <span className="block text-base font-semibold text-[var(--app-text)]">
                {opt.title}
              </span>
              <span className="mt-2 block text-sm text-[var(--text-secondary)]">
                {opt.description}
              </span>
              {selected ? (
                <span className="mt-3 inline-block text-xs font-medium text-[var(--sidebar-blue)]">
                  Сейчас активен
                </span>
              ) : null}
              {isPending && busy ? (
                <span className="mt-3 inline-block text-xs text-[var(--text-muted)]">
                  Сохранение…
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-xs text-[var(--text-muted)]">
        Текущий режим:{" "}
        <strong>{active === "harmony" ? "Гармония" : "Классический"}</strong>
        {active === DEFAULT_UI_DESIGN ? " (по умолчанию)" : ""}
      </p>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => window.location.reload()}
      >
        Перезагрузить страницу
      </Button>
    </div>
  );
}
