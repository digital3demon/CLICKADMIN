import Link from "next/link";
import { ModuleFrame } from "@/components/layout/ModuleFrame";
import { getSessionWithModuleAccess } from "@/lib/auth/session-with-modules";
import { getTenantIdForSession } from "@/lib/auth/tenant-for-session";
import { getOrdersPrisma } from "@/lib/get-domain-prisma";
import { canOpenMailSettingsModule } from "@/lib/mail/mail-settings-access";
import {
  canAccessCostingModule,
  canManageUsers,
} from "@/lib/auth/permissions";
import { isSingleUserPortable } from "@/lib/auth/single-user";
import { isCrmStandaloneDemo } from "@/lib/crm-standalone-demo";

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
  const showKanbanBoards =
    a?.CONFIG_KANBAN_BOARDS === true ||
    a?.CONFIG_KANBAN_PRODUCTION === true ||
    a?.CONFIG_KANBAN_CARD_TYPES === true;
  const showKaiten = a?.CONFIG_KAITEN === true && !isCrmStandaloneDemo();
  const showCouriers = a?.CONFIG_COURIERS === true;
  const showOrdersImportExport = a?.CONFIG_ORDERS_IMPORT_EXPORT === true;
  const showContractTemplate =
    a?.CONFIG_CONTRACT_TEMPLATE === true && !session?.demo;
  const tenantId = session ? await getTenantIdForSession(session) : null;
  const showMail =
    session != null &&
    tenantId != null &&
    (await canOpenMailSettingsModule(
      await getOrdersPrisma(),
      tenantId,
      session.sub,
      session.role,
      a ?? undefined,
    ));
  const showFinanceOffice = a?.FINANCE_OFFICE === true;
  const showPrint = a?.CONFIG_PRINT === true;
  const showAppearance = a?.CONFIG_APPEARANCE === true;
  const showClickMig = a?.CONFIG_CLICKMIG === true && !session?.demo;
  const showAccessMatrix =
    session?.role === "OWNER" && !isSingleUserPortable();

  return (
    <ModuleFrame
      title="Конфигурация"
      description="Прайс-лист, склад, курьеры, канбан-доски в CRM, типы карточек Kaiten и правила передачи в Kaiten. Видимость плиток зависит от роли и настроек владельца (Пользователи → доступ к разделам)."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        {session?.role === "OWNER" ? (
          <Link
            href="/directory/api"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">API</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Именные ключи для сканера книг и внешних интеграций. Ключ
              показывается один раз при создании.
            </p>
          </Link>
        ) : null}
        {session?.role === "OWNER" && !session?.demo && !isCrmStandaloneDemo() ? (
          <Link
            href="/directory/demo-access"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">
              Доступ к демо
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Одноразовые коды для общего демо: один код — один вход на одну
              машину. Текст кода показывается только при создании.
            </p>
          </Link>
        ) : null}
        {session?.role === "OWNER" ? (
          <Link
            href="/directory/telegram"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">
              Telegram
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Проверка с сервера: доступ к api.telegram.org, бот, webhook. Отчёт
              для поддержки Timeweb без SSH.
            </p>
          </Link>
        ) : null}
        {session?.role === "OWNER" && !session?.demo ? (
          <Link
            href="/directory/logs"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">Логи</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Выгрузка серверных логов за период в .txt — Kaiten, cron, почта и
              ошибки API.
            </p>
          </Link>
        ) : null}
        {(session?.actualRole ?? session?.role) === "OWNER" &&
        !session?.demo ? (
          <Link
            href="/directory/crm-dump"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">
              Дамп CRM
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Срез за месяц в zip: наряды, пользователи, доступы, клиники,
              прайс и картинки вложений (без PDF). Только чтение; для демо
              обезличивается отдельно.
            </p>
          </Link>
        ) : null}
        {session?.role === "OWNER" ? (
          <Link
            href="/directory/payroll"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">ФОТ</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Цены техникам по прайсу: ручная настройка и импорт из Excel.
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
              Канбан и ERP
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Доски канбана в CRM (локально в браузере), слоты времени для срока
              лабораторного в нарядах и смежные настройки.
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
        {session ? (
          <Link
            href="/directory/appearance"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">
              Оформление
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Старый или новый дизайн «Гармония» — переключение с перезагрузкой
              страницы.
            </p>
          </Link>
        ) : null}
        {showPrint ? (
          <Link
            href="/directory/print"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">
              Печать
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Шаблоны этикеток: блоки, шрифты, пресеты для всей организации.
            </p>
          </Link>
        ) : null}
        {showContractTemplate ? (
          <Link
            href="/directory/contracts"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">
              Шаблон договора
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Загрузка DOCX-шаблона: поля для замены распознаются из красного
              текста в кавычках.
            </p>
          </Link>
        ) : null}
        {showFinanceOffice ? (
          <Link
            href="/directory/finance-office"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">
              ФинОтдел
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Шаблон письма о долге, срок в рабочих днях МСК и ящик для рассылки.
            </p>
          </Link>
        ) : null}
        {showMail ? (
          <Link
            href="/directory/mail"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">
              Почта
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              {session?.role === "OWNER"
                ? "Подключение ящиков, роли доступа и правила обработки входящих писем."
                : "Папки, правила, метки и шаблон ответа для выбранных ящиков."}
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
        {showClickMig ? (
          <Link
            href="/directory/clickmig"
            className="rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm transition hover:border-[var(--sidebar-blue)] hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-[var(--app-text)]">
              КликМиг
            </h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Справочники, SMTP, API key, участники и таймеры канбана.
            </p>
          </Link>
        ) : null}
        {showAccessMatrix ? (
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
