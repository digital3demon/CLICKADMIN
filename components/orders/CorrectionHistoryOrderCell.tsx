import Link from "next/link";
import type { CorrectionHistoryRow } from "@/lib/corrections-history";
import { orderPathById } from "@/lib/order-public-ref";
import { personNameSurnameInitials } from "@/lib/person-name-surname-initials";

export function CorrectionHistoryOrderCell({
  order,
}: {
  order: CorrectionHistoryRow["order"];
}) {
  const doctorName = order.doctorName
    ? personNameSurnameInitials(order.doctorName)
    : null;
  const patientName = order.patientName
    ? personNameSurnameInitials(order.patientName)
    : null;

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Link
        prefetch={false}
        href={orderPathById(order.id)}
        className="truncate font-mono text-sm font-medium text-[var(--sidebar-blue)] hover:underline"
        title={`Заказ ${order.orderNumber}`}
      >
        {order.orderNumber}
      </Link>
      {doctorName || patientName ? (
        <span
          className="block whitespace-normal break-words text-xs font-semibold leading-snug text-[var(--app-text)]"
          title={[doctorName, patientName].filter(Boolean).join(" · ")}
        >
          {doctorName}
          {doctorName && patientName ? (
            <span className="text-[var(--text-muted)]"> · </span>
          ) : null}
          {patientName}
        </span>
      ) : null}
    </div>
  );
}
