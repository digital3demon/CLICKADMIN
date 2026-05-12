import Link from "next/link";
import { notFound } from "next/navigation";
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

        <section className="mt-6 space-y-2 border-t border-zinc-100 pt-4 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Сроки
          </h2>
          <p>
            <span className="text-zinc-500">Поступление в лабораторию: </span>
            <span className="font-medium">
              {data.workReceivedAt
                ? fmtRu(data.workReceivedAt)
                : `${fmtRu(data.createdAt)} — отдельная дата не указана, показана дата оформления`}
            </span>
          </p>
          <p>
            <span className="text-zinc-500">Оформлено: </span>
            <span className="font-medium">{fmtRu(data.createdAt)}</span>
          </p>
          <p>
            <span className="text-zinc-500">Готово: </span>
            <span className="font-medium">
              {data.handedToAdminsAt ? fmtRu(data.handedToAdminsAt) : "—"}
            </span>
          </p>
        </section>

        <section className="mt-5 border-t border-zinc-100 pt-4 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            История изменений (кратко)
          </h2>
          {data.revisions.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500">
              Перемещения по доске в журнале не выделены или ещё не сохранялись.
            </p>
          ) : (
            <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-xs">
              {data.revisions.map((r) => (
                <li
                  key={r.id}
                  className="rounded border border-zinc-100 bg-zinc-50/60 px-2 py-1.5"
                >
                  <div className="text-zinc-500">
                    {fmtRu(r.createdAt)} · {r.actorLabel}
                  </div>
                  <div className="text-zinc-800">{r.summary}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-6 border-t border-zinc-100 pt-5">
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
