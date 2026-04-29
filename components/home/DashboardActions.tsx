"use client";

import Link from "next/link";
import { useNewOrderPanel } from "@/components/orders/new-order-panel-context";

const btnShipments =
  "pressable-tap flex min-h-[6.5rem] w-full items-center justify-center rounded-lg border-2 border-[var(--card-border)] bg-[var(--surface-muted)] px-4 py-5 text-center text-sm font-semibold text-[var(--text-strong)] shadow-sm sm:min-h-[7.5rem] sm:text-base";

const btnAttention =
  "pressable-tap flex min-h-[6.5rem] w-full items-center justify-center rounded-lg border-2 border-sky-300/80 bg-sky-50/90 px-4 py-5 text-center text-sm font-semibold text-sky-950 shadow-sm dark:border-[var(--card-border)] dark:bg-[var(--surface-muted)] dark:text-[var(--text-strong)] sm:min-h-[7.5rem] sm:text-base";

const btnNewOrder =
  "pressable-tap flex min-h-[6.5rem] w-full items-center justify-center rounded-lg border-2 border-blue-600 bg-blue-600 px-4 py-5 text-center text-sm font-semibold uppercase tracking-wide text-white shadow-sm sm:min-h-[7.5rem] sm:text-base";

export function DashboardActions({
  attentionCount = 0,
}: {
  attentionCount?: number;
}) {
  const { open: openNewOrder, canOpen } = useNewOrderPanel();

  return (
    <>
      <section aria-label="Обратить внимание">
        <Link href="/attention" className={btnAttention}>
          <span className="flex flex-col items-center gap-1">
            <span>Обратить Внимание</span>
            {attentionCount > 0 ? (
              <span className="text-xs font-normal normal-case opacity-90">
                карточек без данных: {attentionCount}
              </span>
            ) : (
              <span className="text-xs font-normal normal-case opacity-80">
                клиники и врачи
              </span>
            )}
          </span>
        </Link>
      </section>

      <section
        aria-label="Отгрузки"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5"
      >
        <Link href="/shipments?tab=today" className={btnShipments}>
          <span className="flex flex-col items-center gap-0.5">
            <span>Отгрузка на сегодня</span>
            <span className="text-xs font-normal normal-case opacity-80">
              по дате приёма пациента (МСК)
            </span>
          </span>
        </Link>
        <Link href="/shipments?tab=tomorrow" className={btnShipments}>
          <span className="flex flex-col items-center gap-0.5">
            <span>Отгрузка на завтра</span>
            <span className="text-xs font-normal normal-case opacity-80">
              по дате приёма пациента (МСК)
            </span>
          </span>
        </Link>
      </section>

      <section aria-label="Новый заказ">
        <button
          type="button"
          disabled={!canOpen}
          title={
            canOpen
              ? undefined
              : "Открыто максимум окон нового заказа (5). Закройте или сверните одно."
          }
          className={`${btnNewOrder} ${canOpen ? "cursor-pointer hover:brightness-105" : "cursor-not-allowed border-zinc-400 bg-zinc-400 hover:border-zinc-400 hover:bg-zinc-400 dark:border-zinc-600 dark:bg-zinc-600 dark:hover:border-zinc-600 dark:hover:bg-zinc-600"}`}
          onClick={() => {
            if (canOpen) openNewOrder();
          }}
        >
          Новый заказ
        </button>
      </section>
    </>
  );
}
