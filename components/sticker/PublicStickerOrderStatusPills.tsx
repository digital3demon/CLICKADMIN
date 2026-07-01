import type { PublicStickerOrderStatusPills } from "@/lib/public-sticker-order-status";

const pillBase =
  "inline-block max-w-[11rem] truncate rounded-full px-2.5 py-1 text-[11px] font-semibold leading-tight sm:max-w-[13rem] sm:text-xs";

export function PublicStickerOrderStatusPillsView({
  status,
}: {
  status: PublicStickerOrderStatusPills;
}) {
  return (
    <div className="flex shrink-0 flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs">
          Сейчас
        </span>
        <span
          className={`${pillBase} ${status.currentPillClass}`}
          title={status.currentLabel}
        >
          {status.currentLabel}
        </span>
      </div>
      {status.nextLabel ? (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs">
            Далее
          </span>
          <span
            className={`${pillBase} ${status.nextPillClass ?? ""}`}
            title={status.nextLabel}
          >
            {status.nextLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}
