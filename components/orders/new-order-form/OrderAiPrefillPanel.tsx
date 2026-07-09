"use client";

import type { OrderDraftSnapshot } from "@/lib/order-draft-snapshot";
import { Spinner } from "@/components/ui/Spinner";

export type AiPrefillFieldKey =
  | "doctor"
  | "clinic"
  | "patient"
  | "clientOrder"
  | "labDue"
  | "appointment"
  | "details";

export const AI_PREFILL_FIELD_LABELS: Record<AiPrefillFieldKey, string> = {
  doctor: "Доктор",
  clinic: "Клиника",
  patient: "Пациент",
  clientOrder: "Заказ от клиента",
  labDue: "Срок лаборатории",
  appointment: "Запись",
  details: "Подробно (состав)",
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
  if (!draft.workDueLocal?.trim()) missing.push("labDue");
  if (!draft.patientAppointmentLocal?.trim()) missing.push("appointment");
  if (!draft.detailLines?.length) missing.push("details");
  return missing;
}

export function aiPrefillHighlightClass(
  baseClass: string,
  highlight: boolean,
): string {
  if (!highlight) return baseClass;
  return `${baseClass} border-amber-400 bg-amber-50/40 ring-2 ring-amber-400/50 dark:border-amber-600 dark:bg-amber-950/25 dark:ring-amber-600/40`;
}

function confidenceBarTone(score: number): string {
  if (score >= 75) return "bg-emerald-400";
  if (score >= 50) return "bg-amber-400";
  return "bg-red-400";
}

type OrderAiPrefillPanelProps = {
  status: "idle" | "loading" | "done" | "error";
  confidenceScore: number | null;
  warnings: string[];
  missingFields: AiPrefillFieldKey[];
  errorMessage?: string | null;
  onFillWithoutAi?: () => void;
  elapsedSec?: number;
  modelLabel?: string | null;
};

function FillWithoutAiButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 rounded-md border border-violet-300/80 bg-violet-950/50 px-2.5 py-1 text-xs font-medium text-violet-100 transition-colors hover:bg-violet-900/70"
    >
      Без ИИ
    </button>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  return (
    <div className="flex w-[7.5rem] shrink-0 flex-col items-end gap-0.5 sm:w-36">
      <span className="text-[10px] font-semibold tabular-nums text-violet-100 sm:text-xs">
        Уверенность: {score}%
      </span>
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-violet-950/80"
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
  );
}

export function OrderAiPrefillPanel({
  status,
  confidenceScore,
  warnings,
  missingFields,
  errorMessage,
  onFillWithoutAi,
  elapsedSec = 0,
  modelLabel = null,
}: OrderAiPrefillPanelProps) {
  if (status === "idle") return null;

  const score =
    typeof confidenceScore === "number" && Number.isFinite(confidenceScore)
      ? Math.max(0, Math.min(100, Math.round(confidenceScore)))
      : null;

  const shellClass =
    "rounded-md border border-violet-400/50 bg-violet-950/55 px-2.5 py-1.5 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.12)] dark:border-violet-500/40 dark:bg-violet-950/70 sm:px-3";

  if (status === "loading") {
    return (
      <section className={shellClass} aria-live="polite" aria-busy>
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          <Spinner size="sm" className="shrink-0 text-violet-300" />
          <p className="min-w-0 flex-1 text-xs text-violet-50 sm:text-sm">
            Разбираем письмо…
            {elapsedSec > 0 ? (
              <span className="text-violet-200/90"> · {elapsedSec} с</span>
            ) : null}
            {modelLabel ? (
              <span className="text-violet-200/90"> · {modelLabel}</span>
            ) : null}
          </p>
          {onFillWithoutAi ? <FillWithoutAiButton onClick={onFillWithoutAi} /> : null}
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className={shellClass} aria-live="polite">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 text-xs text-amber-100 sm:text-sm" role="alert">
            {errorMessage ?? "Ошибка ИИ-разбора"}
          </p>
          {onFillWithoutAi ? <FillWithoutAiButton onClick={onFillWithoutAi} /> : null}
        </div>
      </section>
    );
  }

  // done — компактная полоса как на макете
  const showWarnings = warnings.length > 0;
  const showMissing = missingFields.length > 0;
  if (!showWarnings && !showMissing && score == null) return null;

  return (
    <section className={shellClass} aria-live="polite">
      <div className="flex min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-white sm:text-xs">
            Предупреждения и предложения от ИИ
          </h3>
          {showMissing ? (
            <p className="mt-0.5 text-[11px] leading-snug text-amber-100/95 sm:text-xs">
              {modelLabel === "без ИИ" ? "Не заполнено" : "ИИ не заполнил"}:{" "}
              {missingFields.map((key) => AI_PREFILL_FIELD_LABELS[key]).join(", ")}
            </p>
          ) : null}
          {showWarnings ? (
            <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[11px] leading-snug text-violet-50 sm:text-xs">
              {warnings.map((warning, index) => (
                <li key={`${index}-${warning.slice(0, 24)}`}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
        {score != null ? <ConfidenceBadge score={score} /> : null}
      </div>
    </section>
  );
}
