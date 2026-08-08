import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicStickerOrderStatusPillsView } from "@/components/sticker/PublicStickerOrderStatusPills";
import { PublicStickerReceivedPhotos } from "@/components/sticker/PublicStickerReceivedPhotos";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { loadPublicStickerClientView } from "@/lib/load-public-sticker-client-view";
import { resolveStickerEmployeesHref } from "@/lib/sticker-public-employee-href";
import { resolveStickerOrderBySlugAndToken } from "@/lib/sticker-public-order-resolve";

export const dynamic = "force-dynamic";

function fmtRu(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function StickerPublicHubPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; token: string }>;
}) {
  const { tenantSlug, token } = await params;
  const resolved = await resolveStickerOrderBySlugAndToken(tenantSlug, token);
  if (!resolved.ok) notFound();

  const data = await loadPublicStickerClientView(
    resolved.ordersDb,
    resolved.tenantId,
    resolved.orderId,
    { tenantSlug, stickerToken: token },
  );
  if (!data) notFound();

  const session = await getSessionFromCookies();
  const employeesHref = await resolveStickerEmployeesHref({
    session,
    stickerTenantId: resolved.tenantId,
    orderId: resolved.orderId,
    tenantSlug,
    token,
  });

  return (
    <div className="min-h-screen bg-zinc-50 px-3 py-8 text-zinc-900">
      <div className="mx-auto max-w-lg rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold">Наряд {data.orderNumber}</h1>
            {data.clinicName ? (
              <p className="mt-1 text-sm text-zinc-600">{data.clinicName}</p>
            ) : null}
            {data.doctorShort ? (
              <p className="text-sm text-zinc-600">Врач: {data.doctorShort}</p>
            ) : null}
            {data.patientShort ? (
              <p className="text-sm text-zinc-600">Пациент: {data.patientShort}</p>
            ) : null}
          </div>
          <PublicStickerOrderStatusPillsView status={data.orderStatus} />
        </div>

        <section className="mt-6 space-y-2 border-t border-zinc-100 pt-4 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Сроки
          </h2>
          {data.timelineRows.map((row) => (
            <p key={row.id}>
              <span className="text-zinc-500">{row.label}: </span>
              <span className="font-medium">
                {row.at
                  ? `${fmtRu(row.at)}${row.note ? ` — ${row.note}` : ""}`
                  : "—"}
              </span>
            </p>
          ))}
        </section>

        <PublicStickerReceivedPhotos photos={data.hubPhotos} />

        <div className="mt-6 space-y-2 border-t border-zinc-100 pt-5">
          <a
            href="https://t.me/CLICKlab_Admin"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg border border-sky-300 bg-sky-50 px-4 py-3 text-center text-sm font-medium text-sky-950 transition-colors hover:bg-sky-100"
          >
            Написать Администраторам
          </a>
          <Link
            href={employeesHref}
            className="block w-full rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-3 text-center text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-200"
          >
            Для сотрудников
          </Link>
        </div>
      </div>
    </div>
  );
}
