"use client";

import type { KaitenTrackLane } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DueDatetimeComboPicker } from "@/components/ui/DueDatetimeComboPicker";
export type KaitenSavePayload =
  | { kaitenDecideLater: true }
  | {
      kaitenDecideLater: false;
      kaitenCardTypeId: string;
      kaitenTrackLane: KaitenTrackLane;
      kaitenCardTitleLabel: string;
    };

const SPACE_OPTIONS: {
  value: KaitenTrackLane;
  label: string;
}[] = [
  { value: "ORTHOPEDICS", label: "Ортопедия" },
  { value: "ORTHODONTICS", label: "Ортодонтия" },
  { value: "TEST", label: "ТЕСТ" },
];

type UiCardType = { id: string; name: string; externalTypeId: number };

type KaitenPreflightModalProps = {
  open: boolean;
  saving: boolean;
  /** Только закрыть модалку (крестик), форма нового наряда остаётся открытой. */
  onCloseModal: () => void;
  /** «Отмена (свернуть наряд)» — закрыть модалку и свернуть панель наряда. */
  onCancelCollapse: () => void;
  onConfirm: (
    payload: KaitenSavePayload,
    options?: { printPdf?: boolean },
  ) => void;
  /** Дублирование поля из шапки наряда — можно поправить перед сохранением. */
  labDueLocal: string;
  labDueMinLocal: string;
  onLabDueLocalChange: (raw: string) => void;
  /** Ошибка сохранения наряда (видна поверх формы, пока открыта модалка). */
  saveError?: string | null;
};

function ModalCloseIcon(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/** При сбросе невалидного выбора — не ставим «Тест», если доступна ортопедия/ортодонтия. */
function defaultTrackLane(lanes: KaitenTrackLane[]): KaitenTrackLane {
  if (lanes.includes("ORTHOPEDICS")) return "ORTHOPEDICS";
  if (lanes.includes("ORTHODONTICS")) return "ORTHODONTICS";
  return lanes[0]!;
}

export function KaitenPreflightModal({
  open,
  saving,
  onCloseModal,
  onCancelCollapse,
  onConfirm,
  labDueLocal,
  labDueMinLocal,
  onLabDueLocalChange,
  saveError,
}: KaitenPreflightModalProps) {
  const [decideLater, setDecideLater] = useState(false);
  const [cardTypes, setCardTypes] = useState<UiCardType[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [cardTypeId, setCardTypeId] = useState("");
  const [space, setSpace] = useState<KaitenTrackLane>("ORTHOPEDICS");
  /** null — ещё не загрузили с сервера; [] — в .env нет ни одной доски */
  const [laneAllowlist, setLaneAllowlist] = useState<KaitenTrackLane[] | null>(
    null,
  );
  const [workLabel, setWorkLabel] = useState("");

  useEffect(() => {
    if (!open) return;
    setDecideLater(false);
    setSpace("ORTHOPEDICS");
    setLaneAllowlist(null);
    setWorkLabel("");
    setLoadError(null);
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/kaiten-ui-options");
        const data = (await res.json()) as {
          cardTypes?: UiCardType[];
          trackLanes?: KaitenTrackLane[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "Ошибка загрузки");
        }
        if (cancelled) return;
        setCardTypes(data.cardTypes ?? []);
        const firstType = data.cardTypes?.[0]?.id ?? "";
        setCardTypeId(firstType);
        setLaneAllowlist(
          Array.isArray(data.trackLanes) ? data.trackLanes : [],
        );
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Сеть недоступна");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const spaceOptions = useMemo(() => {
    if (laneAllowlist == null) return SPACE_OPTIONS;
    return SPACE_OPTIONS.filter((o) => laneAllowlist.includes(o.value));
  }, [laneAllowlist]);

  useEffect(() => {
    if (laneAllowlist == null || laneAllowlist.length === 0) return;
    if (!laneAllowlist.includes(space)) {
      setSpace(defaultTrackLane(laneAllowlist));
    }
  }, [laneAllowlist, space]);

  const canSubmit = useMemo(() => {
    if (decideLater) return true;
    if (loadError || cardTypes.length === 0 || !cardTypeId) return false;
    if (laneAllowlist !== null && laneAllowlist.length === 0) return false;
    if (!space) return false;
    return true;
  }, [decideLater, loadError, cardTypes.length, cardTypeId, laneAllowlist, space]);

  const submit = useCallback(
    (printPdf: boolean) => {
      if (!canSubmit) return;
      if (decideLater) {
        onConfirm({ kaitenDecideLater: true }, { printPdf });
        return;
      }
      onConfirm(
        {
          kaitenDecideLater: false,
          kaitenCardTypeId: cardTypeId,
          kaitenTrackLane: space,
          kaitenCardTitleLabel: workLabel.trim(),
        },
        { printPdf },
      );
    },
    [canSubmit, decideLater, onConfirm, cardTypeId, space, workLabel],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-zinc-900/50 p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kaiten-preflight-title"
    >
      <div className="flex max-h-[min(96vh,920px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] shadow-2xl">
        <div className="shrink-0 border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2
                id="kaiten-preflight-title"
                className="text-xl font-semibold text-[var(--app-text)]"
              >
                Кайтен
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Укажите вид работы и тип карточки для Kaiten. Дату записи задайте
                в форме наряда. Срок лаборатории продублирован ниже на всякий
                случай — в шапке карточки и на печати используется он; в поле
                срока карточки Kaiten он не передаётся. Типы карточек — в
                конфигурации «Кайтен».
              </p>
              {loadError ? (
                <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {loadError}
                </p>
              ) : null}
              {saveError ? (
                <p
                  className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800/80 dark:bg-red-950/50 dark:text-red-100"
                  role="alert"
                  aria-live="polite"
                >
                  {saveError}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="shrink-0 rounded-md p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--app-text)]"
              aria-label="Закрыть окно Кайтен"
              title="Закрыть"
              onClick={() => onCloseModal()}
            >
              <ModalCloseIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
          <div className="mb-5 rounded-lg border border-[var(--card-border)] bg-[var(--surface-muted)] px-3 py-3 sm:px-4">
            <DueDatetimeComboPicker
              id="kaiten-modal-lab-due"
              label="Срок лаборатории"
              labelPlacement="inside"
              value={labDueLocal}
              minLocal={labDueMinLocal}
              onChange={onLabDueLocalChange}
              title="То же поле, что в шапке наряда (8:00–23:30, шаг 30 мин)"
            />
          </div>
          <div
            className={`space-y-2 ${decideLater ? "pointer-events-none opacity-45" : ""}`}
          >
            <label
              htmlFor="kaiten-work-label"
              className="block text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]"
            >
              Вид работы
            </label>
            <p className="text-xs text-[var(--text-muted)]">
              Между врачом и сроком лаборатории в шапке карточки. Пусто — подставится
              название типа карточки.
            </p>
            <input
              id="kaiten-work-label"
              type="text"
              value={workLabel}
              onChange={(e) => setWorkLabel(e.target.value)}
              placeholder="Например: коронки 14–16"
              maxLength={120}
              className="h-10 w-full rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-2.5 text-sm text-[var(--app-text)] shadow-sm outline-none focus:border-[var(--sidebar-blue)] focus:ring-1 focus:ring-[var(--sidebar-blue)]"
            />
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-2 lg:gap-8">
            <fieldset
              disabled={decideLater || !!loadError}
              className={`min-w-0 space-y-3 ${decideLater ? "opacity-45" : ""}`}
            >
              <legend className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Тип карточки в Кайтен
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {cardTypes.map((o) => (
                  <label
                    key={o.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 py-2.5 hover:bg-[var(--table-row-hover)]"
                  >
                    <input
                      type="radio"
                      name="kaiten-card-type"
                      value={o.id}
                      checked={cardTypeId === o.id}
                      onChange={() => setCardTypeId(o.id)}
                      className="shrink-0 text-[var(--sidebar-blue)]"
                    />
                    <span className="min-w-0 text-sm text-[var(--text-strong)]">
                      {o.name}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex min-w-0 flex-col gap-6">
            <fieldset
              disabled={
                decideLater ||
                !!loadError ||
                laneAllowlist === null ||
                laneAllowlist.length === 0
              }
              className={`space-y-3 ${decideLater ? "opacity-45" : ""}`}
            >
              <legend className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Пространство
              </legend>
                {laneAllowlist !== null && laneAllowlist.length === 0 ? (
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    В .env не задано ни одного пространства Kaiten (нужны
                    KAITEN_ORTHOPEDICS_* и/или KAITEN_ORTHODONTICS_* и при
                    необходимости KAITEN_TEST_* — board id и id колонки «в
                    работу»).
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {spaceOptions.map((o) => (
                    <label
                      key={o.value}
                      className="flex min-w-[8.5rem] flex-1 cursor-pointer items-center gap-2 rounded-lg border border-[var(--card-border)] px-3 py-2.5 hover:bg-[var(--table-row-hover)] sm:flex-none"
                    >
                      <input
                        type="radio"
                        name="kaiten-space"
                        value={o.value}
                        checked={space === o.value}
                        onChange={() => setSpace(o.value)}
                        className="text-[var(--sidebar-blue)]"
                      />
                      <span className="text-sm text-[var(--text-strong)]">{o.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] px-5 py-4 sm:px-6">
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--card-border)] bg-[var(--card-bg)] px-3 py-2.5">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-[var(--input-border)] text-[var(--sidebar-blue)]"
              checked={decideLater}
              onChange={(e) => setDecideLater(e.target.checked)}
            />
            <span className="text-sm font-medium text-[var(--text-strong)]">
              Решу позже
            </span>
          </label>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button
              type="button"
              className="rounded-md border border-[var(--input-border)] bg-[var(--card-bg)] px-4 py-2 text-sm font-medium text-[var(--text-strong)] hover:bg-[var(--table-row-hover)]"
              disabled={saving}
              onClick={() => {
                onCancelCollapse();
              }}
            >
              Отмена (свернуть наряд)
            </button>
            <button
              type="button"
              className="rounded-md border-2 border-[var(--sidebar-blue)] bg-[var(--card-bg)] px-4 py-2 text-sm font-semibold text-[var(--sidebar-blue)] hover:bg-[var(--table-row-hover)] disabled:opacity-50"
              disabled={saving || !canSubmit}
              onClick={() => submit(true)}
            >
              {saving ? "Сохранение…" : "Сохранить и напечатать"}
            </button>
            <button
              type="button"
              className="rounded-md bg-[var(--sidebar-blue)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--sidebar-blue-hover)] disabled:opacity-50"
              disabled={saving || !canSubmit}
              onClick={() => submit(false)}
            >
              {saving ? "Сохранение…" : "Сохранить заказ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
