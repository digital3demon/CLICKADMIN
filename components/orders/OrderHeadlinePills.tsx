type Props = {
  prostheticsOrdered: boolean;
  /** Файл счёта загружен (документооборот) */
  hasInvoiceAttachment?: boolean;
  /** Счёт распечатан (кнопка на вкладке «Документооборот») */
  invoicePrinted?: boolean;
  adminShippedOtpr: boolean;
  /** Узкая ячейка таблицы: чуть плотнее отступы */
  density?: "default" | "table";
  className?: string;
};

/**
 * Пилюли в шапке наряда: «Протетика заказана», «Отправлено».
 * Статус заказа CRM (На проверке и т.д.) в интерфейсе не показываем — этап ведётся в Kaiten / поле этапа лаборатории.
 */
export function OrderHeadlinePills({
  prostheticsOrdered,
  hasInvoiceAttachment = false,
  invoicePrinted = false,
  adminShippedOtpr,
  density = "default",
  className = "",
}: Props) {
  const pad =
    density === "table"
      ? "px-2 py-0.5 text-[11px] leading-tight"
      : "px-2.5 py-1 text-xs";

  const gap = density === "table" ? "gap-1" : "gap-1.5";

  return (
    <div className={`flex flex-wrap items-center ${gap} ${className}`.trim()}>
      {prostheticsOrdered ? (
        <span
          className={`rounded-full border border-emerald-200 bg-emerald-50 font-semibold text-emerald-900 shadow-sm dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100 ${pad}`}
          title="Отмечено на вкладке «Протетика»"
        >
          Протетика заказана
        </span>
      ) : null}
      {hasInvoiceAttachment ? (
        <span
          className={`rounded-full border border-sky-300 bg-sky-50 font-semibold tracking-wide text-sky-950 shadow-sm dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-100 ${pad}`}
          title="Загружен файл счёта (вкладка «Документооборот»)"
        >
          СЧЕТ
        </span>
      ) : null}
      {invoicePrinted ? (
        <span
          className={`rounded-full border border-violet-300 bg-violet-50 font-semibold text-violet-950 shadow-sm dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-100 ${pad}`}
          title="Отмечено на вкладке «Документооборот»"
        >
          Счёт распечатан
        </span>
      ) : null}
      {adminShippedOtpr ? (
        <span
          className={`rounded-full border border-amber-300 bg-amber-100 font-semibold text-amber-950 shadow-sm dark:border-amber-700/60 dark:bg-amber-950/35 dark:text-amber-100 ${pad}`}
          title="Отмечено кнопкой «Работа отправлена» в блоке «Наряд»"
        >
          Отправлено
        </span>
      ) : null}
    </div>
  );
}
