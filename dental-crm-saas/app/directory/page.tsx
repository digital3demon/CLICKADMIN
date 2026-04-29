import Link from "next/link";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { getSessionFromCookies } from "@/lib/auth/session-server";
import { canManageUsers } from "@/lib/auth/permissions";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import { isCommercialBuild } from "@/lib/crm-build";

export const dynamic = "force-dynamic";

export default async function DirectoryHubPage() {
  const comm = isCommercialBuild();
  const session = await getSessionFromCookies();
  const showUsers =
    !isSingleUserPortable() &&
    session != null &&
    canManageUsers(session.role);

  return (
    <ModuleFrame
      title="Конфигурация"
      description={
        comm
          ? "Прайс-лист, склад, курьеры, встроенный канбан в CRM."
          : "Прайс-лист, склад, курьеры, канбан-доски в CRM, типы карточек Kaiten и правила передачи в Kaiten."
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {session ? (
          <Link
            href="/directory/profile"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">
              Настройка профиля
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Аватар, отображаемое имя и ник @… для канбана и будущих упоминаний.
            </p>
          </Link>
        ) : null}
        <Link
          href="/directory/price"
          className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-[var(--app-text)]">Прайс</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Просмотр позиций и добавление новых вручную (кроме импорта из Excel).
          </p>
        </Link>
        {session?.role === "OWNER" ? (
          <Link
            href="/directory/costing"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">Просчёт работ</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Версии себестоимости, статьи затрат, формулы и сценарии под клиента (скидка от номинала).
            </p>
          </Link>
        ) : null}
        <Link
          href="/directory/warehouse"
          className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-[var(--app-text)]">Склад</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Склады, учётные позиции, импорт из материалов. Приход и расход — в
            разделе «Склад» меню.
          </p>
        </Link>
        <Link
          href="/directory/kanban-boards"
          className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-[var(--app-text)]">
            Канбан (доски)
          </h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Новые доски, переименование, типы карточек и участники для канбана в
            CRM (локальные данные в браузере).
          </p>
        </Link>
        {comm ? null : (
        <Link
          href="/directory/kaiten"
          className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md sm:col-span-2 lg:col-span-1"
        >
          <h2 className="text-lg font-semibold text-[var(--app-text)]">Кайтен</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Типы карточек (id в Kaiten): список и добавление новых.
          </p>
        </Link>
        )}
        <Link
          href="/directory/couriers"
          className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-[var(--app-text)]">Курьеры</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Справочник для выбора курьера в наряде.
          </p>
        </Link>
        {showUsers ? (
          <Link
            href="/directory/users"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">
              Пользователи
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Приглашения по почте, роли и список учётных записей (только для
              владельца).
            </p>
          </Link>
        ) : null}
      </div>
      <p className="mt-8 text-sm text-[var(--text-muted)]">
        <Link
          href="/orders"
          className="text-[var(--sidebar-blue)] hover:underline"
        >
          ← К заказам
        </Link>
      </p>
    </ModuleFrame>
  );
}
