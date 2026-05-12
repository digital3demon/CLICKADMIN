import Link from "next/link";
import { notFound } from "next/navigation";
import { loadPublicStickerClientView } from "@/lib/load-public-sticker-client-view";
import { resolveStickerOrderBySlugAndToken } from "@/lib/sticker-public-order-resolve";
import { stickerPublicHubPath } from "@/lib/sticker-public-path";

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

export default async function StickerPublicClientPage({
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

  const hub = stickerPublicHubPath(tenantSlug, token);

  return (
    <div className="min-h-screen bg-zinc-50 px-3 py-8 text-zinc-900">
      <div className="mx-auto max-w-lg rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <Link href={hub} className="text-sm text-sky-700 hover:underline">
          ← Другая роль
        </Link>
        <h1 className="mt-3 text-xl font-semibold">Наряд {data.orderNumber}</h1>
        {data.clinicName ? (
          <p className="mt-1 text-sm text-zinc-600">{data.clinicName}</p>
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
                : `${fmtRu(data.createdAt)} — отдельная дата не указана, показана дата оформления в CRM`}
            </span>
          </p>
          <p>
            <span className="text-zinc-500">Оформлено в CRM: </span>
            <span className="font-medium">{fmtRu(data.createdAt)}</span>
          </p>
        </section>

        <section className="mt-5 space-y-1 border-t border-zinc-100 pt-4 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Текущий этап
          </h2>
          <p className="font-medium">{data.labStatusLabel}</p>
          {data.kaitenColumnTitle ? (
            <p className="text-zinc-700">Колонка Kaiten: {data.kaitenColumnTitle}</p>
          ) : null}
          {data.demoKanbanLine ? (
            <p className="text-zinc-700">{data.demoKanbanLine}</p>
          ) : null}
        </section>

        {data.kanban ? (
          <section className="mt-5 space-y-2 border-t border-zinc-100 pt-4 text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Канбан CRM
            </h2>
            {data.kanban.boardTitle ? (
              <p className="text-zinc-700">Доска: {data.kanban.boardTitle}</p>
            ) : null}
            {data.kanban.columnTitle ? (
              <p className="text-zinc-700">Колонка: {data.kanban.columnTitle}</p>
            ) : null}
            {data.kanban.assignees.length > 0 ? (
              <p>
                <span className="text-zinc-500">Ответственные: </span>
                <span className="font-medium">{data.kanban.assignees.join(", ")}</span>
              </p>
            ) : null}
            {data.kanban.participants.length > 0 ? (
              <p>
                <span className="text-zinc-500">Участники: </span>
                <span className="font-medium">{data.kanban.participants.join(", ")}</span>
              </p>
            ) : null}
            {data.kanban.activity.length > 0 ? (
              <div className="mt-2 max-h-56 overflow-y-auto rounded border border-zinc-100 bg-zinc-50/80 p-2 text-xs">
                {data.kanban.activity.map((a, i) => (
                  <div key={`${a.at}-${i}`} className="mb-1.5 border-b border-zinc-100/80 pb-1.5 last:mb-0 last:border-b-0">
                    <div className="text-zinc-500">{fmtRu(a.at)} · {a.label}</div>
                    <div className="text-zinc-800">{a.text}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">Журнал активности карточки пуст или недоступен.</p>
            )}
          </section>
        ) : null}

        <section className="mt-5 border-t border-zinc-100 pt-4 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            История изменений (кратко)
          </h2>
          {data.revisions.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500">Записей пока нет.</p>
          ) : (
            <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-xs">
              {data.revisions.map((r) => (
                <li key={r.id} className="rounded border border-zinc-100 bg-zinc-50/60 px-2 py-1.5">
                  <div className="text-zinc-500">{fmtRu(r.createdAt)} · {r.actorLabel}</div>
                  <div className="text-zinc-800">{r.summary}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
