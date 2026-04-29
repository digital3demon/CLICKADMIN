import Link from "next/link";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import {
  canAccessCostingModule,
  canManageUsers,
} from "@/lib/auth/permissions";
import { isSingleUserPortable } from "@/lib/auth/single-user";

export const dynamic = "force-dynamic";

export default async function DirectoryHubPage() {
  const { session, access } = await getSessionWithModuleAccess();
  const a = access;
  const showUsers =
    !isSingleUserPortable() &&
    session != null &&
    canManageUsers(session.role, a ?? undefined);
  const showCosting =
    session != null && canAccessCostingModule(session.role, a ?? undefined);
  const showPrice = a?.CONFIG_PRICING === true;
  const showWhConf = a?.CONFIG_WAREHOUSE === true;
  const showKanbanBoards = a?.CONFIG_KANBAN_BOARDS === true;
  const showKaiten = a?.CONFIG_KAITEN === true;
  const showCouriers = a?.CONFIG_COURIERS === true;
  const showOrdersImportExport = showPrice;

  return (
    <ModuleFrame
      title="Конфигурация"
      description="Прайс-лист, склад, курьеры, канбан-доски в CRM, типы карточек Kaiten и правила передачи в Kaiten. Видимость плиток зависит от роли и настроек владельца (Пользователи → доступ к разделам)."
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
        {showPrice ? (
          <Link
            href="/directory/price"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">Прайс</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Просмотр позиций и добавление новых вручную (кроме импорта из Excel).
            </p>
          </Link>
        ) : null}
        {showCosting ? (
          <Link
            href="/directory/costing"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">Просчёт работ</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Версии себестоимости, статьи затрат, формулы и сценарии под клиента
              (скидка от номинала).
            </p>
          </Link>
        ) : null}
        {showWhConf ? (
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
        ) : null}
        {showKanbanBoards ? (
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
        ) : null}
        {showKaiten ? (
          <Link
            href="/directory/kaiten"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md sm:col-span-2 lg:col-span-1"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">Кайтен</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Типы карточек (id в Kaiten): список и добавление новых.
            </p>
          </Link>
        ) : null}
        {showCouriers ? (
          <Link
            href="/directory/couriers"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">Курьеры</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Справочник для выбора курьера в наряде.
            </p>
          </Link>
        ) : null}
        {showOrdersImportExport ? (
          <Link
            href="/directory/orders-import-export"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">
              Экспорт / Импорт работ
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Выгрузка заказов в xlsx-шаблон и импорт с предпросмотром и
              подсветкой недостающих полей.
            </p>
          </Link>
        ) : null}
        {showUsers ? (
          <Link
            href="/directory/users"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">
              Пользователи
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Приглашения, роли, список. Для владельца — и матрица доступа к
              модулям.
            </p>
          </Link>
        ) : null}
        {session?.role === "OWNER" && !isSingleUserPortable() ? (
          <Link
            href="/directory/access"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">
              Доступ к разделам
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Какие модули CRM доступны каждой роли (кроме владельца).
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
