import Link from "next/link";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { ArchivedOrderRestoreButton } from "@/components/orders/ArchivedOrderRestoreButton";
import { getPrisma } from "@/lib/get-prisma";

export const dynamic = "force-dynamic";

export default async function OrdersArchivedPage() {
  const prisma = await getPrisma();
  const rows = await prisma.order.findMany({
    where: { archivedAt: { not: null } },
    orderBy: [{ archivedAt: "desc" }, { createdAt: "desc" }],
    take: 500,
    select: {
      id: true,
      orderNumber: true,
      patientName: true,
      archivedAt: true,
      clinic: { select: { name: true } },
      doctor: { select: { fullName: true } },
    },
  });

  return (
    <ModuleFrame
      title="Архив нарядов"
      description="Удалённые из работы наряды. Номера не переназначаются другим нарядам."
      titleRowEnd={
        <Link
          href="/orders"
          className="text-[0.7rem] font-light tracking-wide text-[var(--text-muted)] hover:text-[var(--app-text)] hover:underline"
        >
          К заказам
        </Link>
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Архив пуст.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[var(--card-border)]">
          <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--hover-bg)]/40">
                <th className="px-3 py-2 font-medium">Номер</th>
                <th className="px-3 py-2 font-medium">Пациент</th>
                <th className="px-3 py-2 font-medium">Врач</th>
                <th className="px-3 py-2 font-medium">В архиве</th>
                <th className="px-3 py-2 font-medium">Действия</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const arch = o.archivedAt!;
                const archStr = arch.toLocaleString("ru-RU", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <tr
                    key={o.id}
                    className="border-b border-[var(--card-border)] last:border-0"
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={`/orders/${o.id}`}
                        className="font-medium text-[var(--sidebar-blue)] hover:underline"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">
                      {o.patientName?.trim() || "—"}
                    </td>
                    <td className="px-3 py-2">{o.doctor.fullName}</td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">
                      {archStr}
                    </td>
                    <td className="px-3 py-2">
                      <ArchivedOrderRestoreButton
                        orderId={o.id}
                        className="rounded border border-[var(--card-border)] bg-transparent px-2 py-1 text-xs hover:bg-[var(--hover-bg)] disabled:opacity-50"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ModuleFrame>
  );
}
