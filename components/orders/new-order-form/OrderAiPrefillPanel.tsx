"use client";

import type { OrderDraftSnapshot } from "@/lib/order-draft-snapshot";
import { Spinner } from "@/components/ui/Spinner";

export type AiPrefillFieldKey = "doctor" | "clinic" | "patient" | "clientOrder";

export const AI_PREFILL_FIELD_LABELS: Record<AiPrefillFieldKey, string> = {
  doctor: "Доктор",
  clinic: "Клиника",
  patient: "Пациент",
  clientOrder: "Заказ от клиента",
};

export function computeAiMissingFields(
  draft: OrderDraftSnapshot | undefined,
): AiPrefillFieldKey[] {
  if (!draft) return [];
  const missing: AiPrefillFieldKey[] = [];
  if (!draft.doctorId?.trim()) missing.push("doctor");
  if (!draft.clinicId?.trim()) missing.push("clinic");
  if (!draft.patientName?.trim()) missing.push("patient");
  if (!draft.clientOrderText?.trim()) missing.push("clientOrder");
  return missing;
}

export function aiPrefillHighlightClass(
  baseClass: string,
  highlight: boolean,
): string {
  if (!highlight) return baseClass;
  return `${baseClass} border-amber-400 bg-amber-50/40 ring-2 ring-amber-400/50 dark:border-amber-600 dark:bg-amber-950/25 dark:ring-amber-600/40`;
}

function confidenceTone(score: number): string {
  if (score >= 75) {
    return "text-emerald-700 dark:text-emerald-300";
  }
  if (score >= 50) {
    return "text-amber-800 dark:text-amber-200";
  }
  return "text-red-700 dark:text-red-300";
}

function confidenceBarTone(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

type OrderAiPrefillPanelProps = {
  status: "idle" | "loading" | "done" | "error";
  confidenceScore: number | null;
  warnings: string[];
  missingFields: AiPrefillFieldKey[];
  errorMessage?: string | null;
};

export function OrderAiPrefillPanel({
  status,
  confidenceScore,
  warnings,
  missingFields,
  errorMessage,
}: OrderAiPrefillPanelProps) {
  if (status === "idle") return null;

  const score =
    typeof confidenceScore === "number" && Number.isFinite(confidenceScore)
      ? Math.max(0, Math.min(100, Math.round(confidenceScore)))
      : null;

  return (
    <section
      className="mt-4 border-t border-[var(--card-border)] pt-4"
      aria-live="polite"
      aria-busy={status === "loading"}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--app-text)] sm:text-base">
          ИИ-разбор
        </h3>
        {score != null && status !== "loading" ? (
          <div className="flex min-w-[9rem] flex-col items-end gap-1">
            <span
              className={`text-xs font-semibold tabular-nums sm:text-sm ${confidenceTone(score)}`}
            >
              Уверенность: {score}%
            </span>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]"
              role="progressbar"
              aria-valuenow={score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Уверенность ИИ"
            >
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${confidenceBarTone(score)}`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      {status === "loading" ? (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50/90 px-3 py-3 text-sm text-violet-950 dark:border-violet-900/50 dark:bg-violet-950/25 dark:text-violet-100">
          <Spinner size="sm" className="shrink-0 text-violet-600 dark:text-violet-300" />
          <p>Разбираем письмо и заполняем поля наряда…</p>
        </div>
      ) : null}

      {status === "error" && errorMessage ? (
        <p
          className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-100"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {status === "done" ? (
        <div className="mt-3 space-y-3">
          {missingFields.length > 0 ? (
            <p className="rounded-lg border border-amber-300/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-100">
              ИИ не заполнил:{" "}
              {missingFields.map((key) => AI_PREFILL_FIELD_LABELS[key]).join(", ")}
              . Поля подсвечены — проверьте вручную.
            </p>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              Черновик заполнен — проверьте поля перед сохранением.
            </p>
          )}

          {warnings.length > 0 ? (
            <div className="rounded-lg border border-violet-200/90 bg-violet-50/60 px-3 py-2.5 dark:border-violet-900/40 dark:bg-violet-950/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-900 dark:text-violet-200">
                Предупреждения и предложения
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-violet-950 dark:text-violet-100">
                {warnings.map((warning, index) => (
                  <li key={`${index}-${warning.slice(0, 24)}`}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
