import Link from "next/link";
import { notFound } from "next/navigation";
import { kanbanOrderDeepLinkPath } from "@/lib/kanban-order-card-url";
import { orderPathById } from "@/lib/order-public-ref";
import { resolveStickerOrderBySlugAndToken } from "@/lib/sticker-public-order-resolve";
import { stickerPublicHubPath } from "@/lib/sticker-public-path";

export const dynamic = "force-dynamic";

export default async function StickerPublicStaffPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; token: string }>;
}) {
  const { tenantSlug, token } = await params;
  const resolved = await resolveStickerOrderBySlugAndToken(tenantSlug, token);
  if (!resolved.ok) notFound();

  const order = await resolved.ordersDb.order.findFirst({
    where: { id: resolved.orderId, tenantId: resolved.tenantId },
    select: { orderNumber: true },
  });
  if (!order) notFound();

  const orderPath = orderPathById(resolved.orderId);
  const kanbanPath = kanbanOrderDeepLinkPath(resolved.orderId);
  const loginOrder = `/login?next=${encodeURIComponent(orderPath)}`;
  const loginKanban = `/login?next=${encodeURIComponent(kanbanPath)}`;
  const hub = stickerPublicHubPath(tenantSlug, token);

  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-10 text-zinc-900">
      <div className="mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <Link href={hub} className="text-sm text-sky-700 hover:underline">
          ← Статус наряда (без входа)
        </Link>
        <h1 className="mt-3 text-lg font-semibold text-zinc-900">
          Наряд {order.orderNumber}
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Для сотрудников лаборатории нужна активная сессия в CRM в этом браузере или вход по ссылке.
        </p>
        <ul className="mt-6 space-y-3">
          <li>
            <Link
              className="block rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-950 hover:bg-sky-100"
              href={orderPath}
            >
              Администратор — открыть наряд
            </Link>
            <p className="mt-1 text-xs text-zinc-500">
              Нет сессии?{" "}
              <Link className="text-sky-700 underline" href={loginOrder}>
                Войти и перейти
              </Link>
            </p>
          </li>
          <li>
            <Link
              className="block rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-950 hover:bg-violet-100"
              href={kanbanPath}
            >
              Техник — карточка в канбане CRM
            </Link>
            <p className="mt-1 text-xs text-zinc-500">
              Нет сессии?{" "}
              <Link className="text-violet-800 underline" href={loginKanban}>
                Войти и перейти
              </Link>
            </p>
          </li>
          <li>
            <Link
              className="block rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 hover:bg-amber-100"
              href={orderPath}
            >
              Курьер — пока как у администратора
            </Link>
            <p className="mt-1 text-xs text-zinc-500">
              Нет сессии?{" "}
              <Link className="text-amber-900 underline" href={loginOrder}>
                Войти и перейти
              </Link>
            </p>
          </li>
        </ul>
      </div>
    </div>
  );
}
