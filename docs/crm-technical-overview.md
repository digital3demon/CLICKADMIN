# CRM Technical Overview

## Назначение

Dental Lab CRM — внутренняя CRM зуботехнической лаборатории. Система ведёт полный цикл работы с нарядом: приём заказа, связка клиника/врач/пациент, производство, Kaiten/канбан, корректировки, протетика, отгрузка, финансы, почта, склад, аналитика и справочники.

Документ описывает техническую структуру проекта и основные модули. Для tenant-границ lab/SaaS см. `docs/tenant-boundary.md`.

## Технологический стек

- Next.js App Router: страницы в `app/**/page.tsx`, API routes в `app/api/**/route.ts`.
- React client components: интерактивные модули в `components/**`.
- Prisma ORM: основная схема в `prisma/schema.prisma`.
- PostgreSQL в рабочем режиме; SQLite-совместимые скрипты сохранены для переносимых/legacy сценариев.
- Tailwind CSS 4 через `app/globals.css` и utility-классы.
- Vitest для unit-тестов.
- Kaiten REST API для карточек, колонок, комментариев и синхронизации статусов.
- Yandex Mail через IMAP/SMTP (`imapflow`, `nodemailer`, `mailparser`).
- S3/local disk storage для вложений, в зависимости от окружения.

## Структура Проекта

Ключевые директории:

- `app/` — маршруты UI и backend API. Каждый `route.ts` является серверным endpoint.
- `components/` — React-компоненты модулей и общие UI-блоки.
- `lib/` — доменная логика, интеграции, парсеры, сервисы и helpers.
- `prisma/` — схема, миграции, control/tenant схемы.
- `scripts/` — deploy/migrate/import/repair/packaging scripts.
- `docs/` — техническая документация.
- `data/` — локальные данные для импорта/правил/seed-like сценариев.

## Архитектурные Слои

### UI Layer

Страницы App Router собирают серверные данные и передают их в компоненты:

- `app/orders/page.tsx` — список заказов.
- `app/orders/[id]/page.tsx` — карточка заказа.
- `app/mail/page.tsx` — почта.
- `app/finance-office/page.tsx` — фин. отдел.
- `app/kanban/page.tsx` — канбан.
- `app/clients/**` — клиенты, клиники, врачи.
- `app/directory/**` — справочники.

Интерактивные части обычно вынесены в client components:

- `components/orders/**`
- `components/mail/**`
- `components/kanban/**`
- `components/clients/**`
- `components/finance-office/**`
- `components/directory/**`

### API Layer

API routes находятся в `app/api/**`. Общий паттерн:

1. получить сессию/tenant/роль;
2. получить Prisma client через доменный helper;
3. проверить доступ к ресурсу по `tenantId`;
4. выполнить доменную операцию из `lib/**`;
5. вернуть JSON с понятной ошибкой.

Важные группы API:

- `app/api/orders/**` — заказы, вложения, импорт/экспорт, Kaiten, корректировки, протетика.
- `app/api/mail/**` — аккаунты, письма, папки, метки, правила, отправка, sync.
- `app/api/cron/**` — фоновые задачи.
- `app/api/kanban/**` — канбан и связки с заказами.
- `app/api/finance-office/**` — импорт банка и выгрузки фин. отдела.
- `app/api/analytics/**` — аналитические агрегаты.
- `app/api/inventory/**` — склад.
- `app/api/users/**`, `app/api/auth/**` — пользователи и вход.

### Domain Layer

Основная бизнес-логика лежит в `lib/**`. Важные файлы:

- `lib/order-create-service.ts` — создание заказа.
- `lib/kaiten-order-sync.ts` — создание/синхронизация карточки Kaiten.
- `lib/kaiten-sync-order-column-titles.ts` — синхронизация колонок, блокировок и комментариев Kaiten.
- `lib/kaiten-chat-background-sync.ts` — фоновый обход заказов для импорта чатов Kaiten.
- `lib/order-chat-correction-db.ts` — заявки корректировок из `!!!`.
- `lib/order-prosthetics-request-db.ts` — заявки протетики из `???`.
- `lib/mail/mail-service.ts` — CRUD и действия почтового модуля.
- `lib/mail/mail-sync.service.ts` — IMAP sync, правила, метки/папки.
- `lib/kanban/**` — модели и sync канбана.
- `lib/order-import-export.ts` — импорт/экспорт заказов.
- `lib/order-narjad-pdf-document.tsx` — PDF наряда.

### Persistence Layer

Prisma models определены в `prisma/schema.prisma`. Базовые группы:

- Orders: `Order`, `OrderConstruction`, `OrderAttachment`, `OrderRevision`, `OrderCustomTag`.
- Clients: клиники, врачи, связи клиника-врач, реквизиты и коммерческие условия.
- Kaiten/Kanban: id карточек, дорожки, типы карточек, флаги блокировок, комментарии.
- Mail: `EmailAccount`, `EmailFolder`, `Email`, `EmailLabel`, `EmailRule`, `EmailSyncJob`.
- Finance/Reconciliation: отметки оплат, сверки, снапшоты, банковский импорт.
- Inventory/Costing/Payroll: склад, себестоимость, расчёт зарплат.
- Tenant/Auth: пользователи, роли, module access, tenant state.

## Модули CRM

### Заказы

Главный производственный модуль. Создание заказа происходит через `NewOrderForm`, серверная запись — через `lib/order-create-service.ts`.

Функции:

- номер наряда;
- клиника, врач, пациент;
- состав работ, конструкции, мосты, протетика;
- сроки лаборатории и записи пациента;
- срочность и коэффициенты;
- тестовые заказы;
- продолжение работ;
- вложения и документы;
- печать наряда/PDF/QR;
- история изменений и восстановление ревизий;
- архивирование.

Ключевые компоненты:

- `components/orders/new-order-form/NewOrderForm.tsx`
- `components/orders/OrderEditForm.tsx`
- `components/orders/OrdersListTableRow.tsx`
- `components/orders/OrderListTagsCell.tsx`

### Kaiten И Чаты

CRM связана с Kaiten карточками. Система хранит `kaitenCardId`, `kaitenColumnTitle`, `kaitenCardSortOrder`, блокировки и флаги чата.

Источники sync:

- создание/обновление карточки при работе с заказом;
- клиентский poller списка: `OrderListKaitenPoller`;
- cron: `/api/cron/kaiten-chat-sync`;
- ручная загрузка чата заказа.

Комментарии Kaiten парсятся через `lib/kaiten-comment-parse.ts`.

Спец-сигналы:

- `!!!` — корректировка состава/заказа;
- `???` — заказ протетики;
- `@<tag>` — упоминание лаборатории/админов.

Важно: фоновый импорт комментариев должен работать без открытия заказа, иначе корректировки и протетика могут не попасть в уведомления вовремя.

### Канбан

Канбан используется для визуального управления карточками и связанными заказами. Логика находится в `components/kanban/**` и `lib/kanban/**`.

Функции:

- карточки, дорожки, статусы;
- связка с заказами;
- комментарии и чат;
- Telegram-уведомления;
- automations/settings;
- режим `СТОП` и возврат из стопа;
- синхронизация с Kaiten для связанных карточек.

### Почта

Критичный модуль приёма заказов. Потеря или скрытие письма недопустимы.

Основные части:

- UI: `components/mail/**`;
- API: `app/api/mail/**`;
- сервис: `lib/mail/mail-service.ts`;
- IMAP sync: `lib/mail/mail-sync.service.ts`;
- IMAP/SMTP client: `lib/mail/imap-client.ts`, `lib/mail/smtp-client.ts`.

Функции:

- подключение Яндекс-почты через пароль приложения;
- папки, метки, правила;
- импорт писем и вложений;
- создание заказа из писем;
- отправка писем;
- unread counters;
- read/unread sync с IMAP `\Seen`;
- deploy repair scripts для восстановления состояния.

Правило инварианта: метка, папка и классификация правил не должны менять `isRead`. Статус прочтения меняется только явным действием пользователя или фактическим IMAP `\Seen`.

### Клиенты

Модуль клиентов ведёт клиники, врачей и их связи.

Функции:

- карточки клиник;
- карточки врачей;
- связи врач-клиника;
- реквизиты;
- коммерческие условия;
- price overrides;
- Telegram-группы врачей;
- история изменений.

Основные компоненты: `components/clients/**`, страницы `app/clients/**`.

### Финансовый Отдел

Модуль контроля оплат, реквизитов, сверок, коррекций, заказов протетики и выгрузок.

Функции:

- список заказов по датам/периодам;
- фильтры по тегам;
- банковский импорт и preview;
- экспорт;
- отметки оплаты;
- счёт распечатан / файл счёта;
- статус отправки;
- признаки корректировок и протетики.

Ключевые файлы:

- `app/finance-office/page.tsx`
- `components/finance-office/FinanceOfficeOrdersTable.tsx`
- `app/api/finance-office/**`

### Отгрузки

Модуль просмотра заказов к сдаче.

Функции:

- сегодня/завтра/период;
- печать нарядов, QR, стикеров;
- отметка отправки;
- фильтры по тегам;
- Kaiten poller для актуальных колонок и чатов.

Ключевые файлы:

- `app/shipments/**`
- `components/shipments/ShipmentsOrdersTable.tsx`

### Склад

Складской модуль хранит позиции, остатки, движения и возвраты.

Ключевые области:

- `app/warehouse/page.tsx`;
- `app/directory/warehouse/page.tsx`;
- `components/inventory/**`;
- `app/api/inventory/**`.

### Себестоимость, Прайсы И Зарплата

Справочники расчётов и производственных ставок:

- costing versions;
- pricing profiles;
- fixed costs;
- shared pools;
- payroll options;
- payroll done panel.

Ключевые файлы:

- `components/directory/CostingDirectoryClient.tsx`;
- `components/payroll/**`;
- `app/api/costing/**`;
- `app/api/payroll/**`.

### Аналитика

Аналитические страницы и API строят агрегаты по финансам, производству и сверкам.

Ключевые файлы:

- `components/analytics/AnalyticsPageClient.tsx`;
- `app/api/analytics/**`.

### Справочники

Раздел `directory` содержит административные настройки:

- пользователи и роли;
- module access;
- Kaiten card types;
- Kanban boards;
- курьеры;
- печать;
- склад;
- шаблоны договоров;
- настройки tenant.

### Авторизация И Доступы

Аутентификация и роли:

- session cookies/JWT;
- Telegram login/linking;
- owner bootstrap;
- view-as-role;
- role-module access matrix.

Ключевые файлы:

- `lib/auth/**`;
- `middleware.ts`;
- `lib/role-module-*.ts`;
- `components/directory/RoleModuleAccessMatrix.tsx`.

Middleware проверяет публичные пути, rate limit, cron authorization и module access.

## Фоновые Задачи

Cron routes:

- `/api/cron/mail-sync` — синхронизация почты;
- `/api/cron/kaiten-chat-sync` — фоновые комментарии Kaiten;
- `/api/cron/orders-archive-cleanup` — очистка архивов;
- `/api/cron/reconciliation-snapshots` — снапшоты сверок.

На Vercel расписание задано в `vercel.json`. Для standalone допускаются внутренние headers:

- `INTERNAL_MAIL_SYNC_SECRET`;
- `INTERNAL_KAITEN_CHAT_SYNC_SECRET`;
- общий `CRON_SECRET`.

## Deploy И Миграции

Основной build script:

```powershell
npm run build
```

Он выполняет:

1. Prisma generate;
2. `scripts/prisma-migrate-deploy.cjs`;
3. Next build;
4. standalone assets copy/verify.

`scripts/prisma-migrate-deploy.cjs` также запускает deploy-time repair/import tasks: mail reset marker, mail rules, read/unread reconcile, tenant activation, S3 migration при env-флагах.

## Lab И SaaS

Личная CRM и SaaS используют общий бизнес-код. Коммерческая копия живёт рядом в `dental-crm-saas`.

Синхронизация:

```powershell
npm run sync:saas
```

В SaaS не копируются локальные БД. Tenant isolation описан в `docs/tenant-boundary.md`, `docs/tenant-db-split-map.md`, `docs/tenant-per-database-runbook.md`.

## Правила Разработки

- Серверный код должен быть tenant-aware.
- API routes для ресурсов по id должны проверять `tenantId`.
- Почтовые правила не должны менять `isRead`, если пользователь явно не выбрал действие `markRead`.
- Парсеры файлов/PDF/имен с кириллицей должны иметь тесты.
- Долгие операции должны иметь ограничение размера/батча и структурированные логи.
- Не создавать новый `PrismaClient` в API handlers без необходимости; использовать domain helpers.
- Не смешивать UI refactor с миграциями и repair scripts без причины.

## Проверки

Базовые команды:

```powershell
npm run typecheck
npm test
```

Для узких изменений предпочтительны focused tests, например:

```powershell
npm test -- --run lib/mail/mail-sync.service.test.ts lib/kaiten-comment-parse.test.ts
```

